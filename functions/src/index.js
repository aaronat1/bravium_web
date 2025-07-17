
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Este polyfill es necesario para que la librería 'jose' funcione en el entorno de Cloud Functions.
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = require('crypto').webcrypto;
}

// Inicializa Firebase y los clientes de Google Cloud
admin.initializeApp();
const db = admin.firestore();

// Importar dinámicamente solo cuando se necesite.
const {KeyManagementServiceClient} = require('@google-cloud/kms');
const kmsClient = new KeyManagementServiceClient();

// --- Constantes de Configuración ---
const GCP_PROJECT_ID = process.env.GCLOUD_PROJECT;
const KMS_LOCATION_ID = 'global';
const KMS_KEYRING_ID = 'bravium-keys';

// For the public verification page, we use a single, pre-defined customer as the verifier.
const VERIFIER_CUSTOMER_ID = "PdaXG6zsMbaoQNRgUr136DvKWtM2";


/**
 * ----------------------------------------------------------------
 * FUNCIÓN DE ONBOARDING: Se dispara al crear un cliente.
 * ----------------------------------------------------------------
 */
exports.onCustomerCreate = functions.firestore
.document('customers/{customerId}')
.onCreate(async (snapshot, context) => {
    const customerId = context.params.customerId;
    console.log(`Iniciando onboarding para el cliente ${customerId}.`);

    try {
      const kmsKeyPath = await generateKmsKeyForCustomer(customerId);
      console.log(`Clave KMS generada para ${customerId}: ${kmsKeyPath}`);

      const { did, didDocument } = await generateDidForCustomer(customerId, kmsKeyPath);
      console.log(`DID generado para ${customerId}: ${did}`);

      await db.collection('dids').doc(did).set(didDocument);
      console.log(`Documento DID para ${did} almacenado correctamente.`);

      // If this is the verifier customer, also create the public did.json
      if (customerId === VERIFIER_CUSTOMER_ID) {
          await db.collection('dids').doc('did.json').set(didDocument);
          console.log('did.json para el verificador almacenado en Firestore.');
      }

      await snapshot.ref.update({
        did: did,
        kmsKeyPath: kmsKeyPath,
        onboardingStatus: 'completed',
      });

      console.log(`Documento del cliente ${customerId} actualizado con éxito.`);
      return { success: true, did, kmsKeyPath };

    } catch (error) {
      console.error(`Fallo en el proceso de onboarding para el cliente ${customerId}:`, error);
      const errorMessage = error instanceof Error? error.message : String(error);
      await snapshot.ref.update({ onboardingStatus: 'failed', error: errorMessage });
      return null;
    }
  });

/**
 * ----------------------------------------------------------------
 * FUNCIÓN DE LIMPIEZA: Se dispara al eliminar un cliente.
 * ----------------------------------------------------------------
 */
exports.onCustomerDelete = functions.firestore
.document('customers/{customerId}')
.onDelete(async (snapshot, context) => {
    const customerId = context.params.customerId;
    const deletedCustomerData = snapshot.data();
    const did = deletedCustomerData.did;

    if (!did) {
        console.log(`El cliente ${customerId} no tenía un DID para eliminar. Saliendo.`);
        return null;
    }

    console.log(`Iniciando eliminación del DID (${did}) para el cliente ${customerId}.`);

    try {
        await db.collection('dids').doc(did).delete();
        console.log(`DID ${did} eliminado con éxito.`);
        
        if (customerId === VERIFIER_CUSTOMER_ID) {
            await db.collection('dids').doc('did.json').delete();
            console.log('did.json del verificador eliminado de Firestore.');
        }

        // Aquí también deberías añadir la lógica para deshabilitar o eliminar la clave en KMS.
        return { success: true, deletedDid: did };
    } catch (error) {
        console.error(`Fallo al eliminar el DID ${did} para el cliente ${customerId}:`, error);
        return null;
    }
});


/**
 * ----------------------------------------------------------------
 * FUNCIÓN DE EMISIÓN DE CREDENCIALES
 * ----------------------------------------------------------------
 */
exports.issueCredential = functions.https.onCall(async (data, context) => {
  // 1. Autenticación y Validación de Datos
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'La función debe ser llamada por un usuario autenticado.');
  }
  if (!data.credentialSubject || typeof data.credentialSubject !== 'object' || !data.credentialType || !data.customerId) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan datos necesarios (credentialSubject, credentialType, customerId).');
  }
  
  const { credentialSubject, credentialType, customerId } = data;

  try {
    const customerDocRef = db.collection('customers').doc(customerId);
    const customerDoc = await customerDocRef.get();

    if (!customerDoc.exists) {
      throw new functions.https.HttpsError('not-found', `No se encontró el documento del cliente con ID: ${customerId}`);
    }

    const customerData = customerDoc.data();
    const kmsKeyPath = customerData.kmsKeyPath;
    const issuerDid = customerData.did;

    if (!kmsKeyPath || !issuerDid) {
      throw new functions.https.HttpsError('failed-precondition', 'El onboarding del cliente no está completo. Faltan kmsKeyPath o did.');
    }

    const { randomUUID } = require('crypto');
    const vcPayload = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1'
      ],
      id: `urn:uuid:${randomUUID()}`,
      type: ['VerifiableCredential', credentialType],
      issuer: issuerDid,
      issuanceDate: new Date().toISOString(),
      credentialSubject: credentialSubject,
    };
    
    const jws = await createJws(vcPayload, kmsKeyPath, issuerDid);

    console.log(`Credencial emitida y firmada con éxito para el cliente ${customerId}.`);

    return { verifiableCredentialJws: jws };

  } catch (error) {
    console.error(`Error al emitir la credencial para el cliente ${customerId}:`, error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Ocurrió un error interno al emitir la credencial.');
  }
});

/**
 * ----------------------------------------------------------------
 * FUNCIÓN DE VERIFICACIÓN OpenID4VP
 * ----------------------------------------------------------------
 * Maneja las peticiones GET (servir petición) y POST (verificar presentación).
 */
exports.openid4vp = functions.region("us-central1").https.onRequest(async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (request.method === "OPTIONS") {
        response.status(204).send();
        return;
    }

    // --- GET: La cartera solicita el objeto de la petición ---
    if (request.method === "GET") {
        const state = request.query.state;
        if (!state) {
            console.error("Petición GET sin 'state'.");
            response.status(400).send("Bad Request: Falta el parámetro 'state'.");
            return;
        }

        try {
            const sessionDoc = await db.collection('verificationSessions').doc(state).get();
            if (!sessionDoc.exists) {
                console.error(`Sesión no encontrada para el state: ${state}`);
                response.status(404).send("Not Found: 'state' inválido o expirado.");
                return;
            }
            const sessionData = sessionDoc.data();
            
            if (!sessionData || !sessionData.requestObject) {
                console.error(`requestObject no encontrado para el state: ${state}`);
                response.status(500).send("Error interno: request object no encontrado.");
                return;
            }

            const verifierDid = "did:web:bravium.es";
            const verifierDoc = await db.collection('customers').doc(VERIFIER_CUSTOMER_ID).get();
            if (!verifierDoc.exists || !verifierDoc.data().kmsKeyPath) {
                console.error(`Verifier customer ${VERIFIER_CUSTOMER_ID} or its KMS key not found.`);
                throw new Error("Verifier configuration error.");
            }
            const kmsKeyPath = verifierDoc.data().kmsKeyPath;

            const requestObjectJwt = await createJws(sessionData.requestObject, kmsKeyPath, verifierDid);
            
            response.set('Content-Type', 'application/jwt');
            response.status(200).send(requestObjectJwt);

        } catch (error) {
            console.error(`Error en GET para el state ${state}:`, error);
            response.status(500).send("Internal Server Error");
        }
        return;
    }

    // --- POST: La cartera envía la presentación para ser verificada ---
    if (request.method === "POST") {
        const { vp_token, state } = request.body;
        if (!vp_token || !state) {
            console.error("Petición POST sin vp_token o state", { body: request.body });
            response.status(400).send("Bad Request: Faltan vp_token o state.");
            return;
        }

        const sessionDocRef = db.collection('verificationSessions').doc(state);
        const jose = await import('jose');

        try {
            const decodedToken = jose.decodeJwt(vp_token);
            if (!decodedToken || typeof decodedToken.iss !== 'string') {
                throw new Error("El vp_token está malformado o no contiene un 'issuer' (iss).");
            }
            const issuerDid = decodedToken.iss;
            
            const didDocRef = db.collection('dids').doc(issuerDid);
            const didDoc = await didDocRef.get();

            if (!didDoc.exists) {
                throw new Error(`El DID del emisor '${issuerDid}' no fue encontrado.`);
            }

            const didDocument = didDoc.data();
            const verificationMethod = didDocument.verificationMethod?.[0];
            if (!verificationMethod || !verificationMethod.publicKeyJwk) {
                throw new Error(`No se encontró una 'publicKeyJwk' válida en el documento DID para ${issuerDid}.`);
            }

            const publicKey = await jose.importJWK(verificationMethod.publicKeyJwk, 'ES256');
            const { payload } = await jose.jwtVerify(vp_token, publicKey);

            await sessionDocRef.set({
                status: 'success',
                verifiedAt: new Date(),
                claims: payload,
                message: "Presentación verificada con éxito."
            }, { merge: true });

            console.log(`Verificación exitosa para el state: ${state}`);
            response.status(200).send({ redirect_uri: 'https://bravium.es/verify/callback' });

        } catch (error) {
            console.error(`Error en la verificación criptográfica para el state ${state}:`, error);
            const errorMessage = error instanceof Error ? error.message : "La verificación de la presentación falló.";
            
            await sessionDocRef.set({ status: 'error', error: errorMessage }, { merge: true }).catch();
            response.status(400).json({ error: "Verificación fallida", details: errorMessage });
        }
        return;
    }

    response.status(405).send("Method Not Allowed");
});


// --- Funciones Auxiliares ---

async function generateKmsKeyForCustomer(customerId) {
  const keyRingPath = kmsClient.keyRingPath(GCP_PROJECT_ID, KMS_LOCATION_ID, KMS_KEYRING_ID);
  const cryptoKeyId = `customer-${customerId}-key`;

  try {
      const [existingKey] = await kmsClient.getCryptoKey({ name: `${keyRingPath}/cryptoKeys/${cryptoKeyId}` }).catch(() => [null]);
      if (existingKey) {
          console.log(`La clave KMS para ${customerId} ya existe.`);
          return existingKey.name;
      }
  } catch (e) {
      // Ignorar error si la clave no existe, que es lo esperado.
  }

  const [key] = await kmsClient.createCryptoKey({
    parent: keyRingPath,
    cryptoKeyId: cryptoKeyId,
    cryptoKey: {
      purpose: 'ASYMMETRIC_SIGN',
      versionTemplate: {
        algorithm: 'EC_SIGN_P256_SHA256',
        protectionLevel: 'SOFTWARE',
      },
      labels: {
          'customer-id': customerId.replace(/[^a-z0-9-]/gi, '_').toLowerCase()
      }
    },
  });

  if (!key.name) {
    throw new Error('La creación de la clave KMS no devolvió un nombre de recurso.');
  }
  return key.name;
}

async function generateDidForCustomer(customerId, kmsKeyPath) {
  const jose = await import('jose');

  const [publicKey] = await kmsClient.getPublicKey({ name: `${kmsKeyPath}/cryptoKeyVersions/1` });

  if (!publicKey.pem) {
    throw new Error(`No se pudo obtener la clave pública en formato PEM desde KMS para la clave: ${kmsKeyPath}`);
  }

  const key = await jose.importSPKI(publicKey.pem, 'ES256');
  const exportedJwk = await jose.exportJWK(key);
  delete exportedJwk.kid; // Remove default kid

  const did = (customerId === VERIFIER_CUSTOMER_ID) ? `did:web:bravium.es` : `did:bravium:${customerId}`;
  const verificationMethodId = `${did}#keys-1`;

  const didDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/jws-2020/v1'
    ],
    id: did,
    controller: did,
    verificationMethod: [
      {
        id: verificationMethodId,
        type: 'JsonWebKey2020',
        controller: did,
        publicKeyJwk: exportedJwk,
      },
    ],
    authentication: [verificationMethodId],
    assertionMethod: [verificationMethodId],
  };

  return { did, didDocument };
}

async function createJws(payload, kmsKeyPath, issuerDid) {
    const { createHash } = require('crypto');
    const jose = await import('jose');
    const { derToJose } = require('ecdsa-sig-formatter');

    const protectedHeader = { 
        alg: 'ES256', 
        typ: 'jwt',
        kid: `${issuerDid}#keys-1`
    };

    const encodedHeader = jose.base64url.encode(JSON.stringify(protectedHeader));
    const encodedPayload = jose.base64url.encode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const digest = createHash('sha256').update(signingInput).digest();

    const [signResponse] = await kmsClient.asymmetricSign({
        name: `${kmsKeyPath}/cryptoKeyVersions/1`,
        digest: { sha256: digest },
    });

    if (!signResponse.signature) {
        throw new Error('La firma con KMS falló o no devolvió una firma.');
    }

    const joseSignature = derToJose(Buffer.from(signResponse.signature), 'ES256');
    return `${signingInput}.${jose.base64url.encode(joseSignature)}`;
}
