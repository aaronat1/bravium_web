
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
          // Note: did.json is not a valid document ID for Firestore, but we use it for a specific lookup purpose
          // A better approach would be a dedicated 'dids_public' collection. For now, this works for demo.
          const publicDidRef = db.collection('dids_public').doc('did.json');
          await publicDidRef.set(didDocument);
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
            await db.collection('dids_public').doc('did.json').delete();
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
  // La autenticación solo es necesaria si la llamada no proviene de una Server Action con privilegios.
  // Para la demo, la Server Action ya está autenticada con credenciales de admin.
  if (!context.auth && !data.test) {
    throw new functions.https.HttpsError('unauthenticated', 'La función debe ser llamada por un usuario autenticado.');
  }
  if (!data.credentialSubject || typeof data.credentialSubject !== 'object' || !data.credentialType || !data.customerId) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan datos necesarios (credentialSubject, credentialType, customerId).');
  }
  
  const { credentialSubject, credentialType, customerId, test, emailTester } = data;

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
      throw new functions.hs.HttpsError('failed-precondition', 'El onboarding del cliente no está completo. Faltan kmsKeyPath o did.');
    }
    
    // Fusionar los datos de prueba en el credentialSubject si existen
    const finalCredentialSubject = { ...credentialSubject };
    if (test) {
      finalCredentialSubject.test = true;
    }
    if (emailTester) {
      finalCredentialSubject.emailTester = emailTester;
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
      credentialSubject: finalCredentialSubject,
    };
    
    const jws = await createJws(vcPayload, kmsKeyPath, issuerDid);

    console.log(`Credencial emitida y firmada con éxito para el cliente ${customerId}.`);

    return { verifiableCredentialJws: jws };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error al emitir la credencial para el cliente ${customerId}:`, errorMessage);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    // Lanza un HttpsError con el mensaje de error original para que el cliente lo reciba.
    throw new functions.https.HttpsError('internal', errorMessage, { originalError: errorMessage });
  }
});


/**
 * ----------------------------------------------------------------
 * FUNCIÓN DE VERIFICACIÓN
 * ----------------------------------------------------------------
 * Verifica un JWS de una credencial.
 */
exports.verifyCredential = functions.https.onRequest(async (request, response) => {
    // Enable CORS
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (request.method === "OPTIONS") {
        response.status(204).send();
        return;
    }
    if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
    }

    const { jws } = request.body;
    if (!jws || typeof jws !== 'string') {
        response.status(400).json({ success: false, error: 'JWS is missing or invalid.' });
        return;
    }
    
    const jose = await import('jose');

    try {
        const decodedHeader = jose.decodeProtectedHeader(jws);

        if (!decodedHeader.kid || typeof decodedHeader.kid !== 'string') {
            throw new Error("El JWS no contiene un 'kid' (Key ID) en la cabecera.");
        }
        
        const did = decodedHeader.kid.split('#')[0];
        
        // Check both possible collections for the DID document
        let didDocSnapshot;
        if (did.startsWith('did:web:')) {
             didDocSnapshot = await db.collection('dids_public').doc('did.json').get();
             if (didDocSnapshot.exists && didDocSnapshot.data().id !== did) {
                 didDocSnapshot = null; // Found did.json but it's not the one we are looking for
             }
        } else {
             didDocSnapshot = await db.collection('dids').doc(did).get();
        }

        if (!didDocSnapshot || !didDocSnapshot.exists) {
            throw new Error(`El documento DID '${did}' no fue encontrado en Firestore.`);
        }

        const didDocument = didDocSnapshot.data();
        const verificationMethod = didDocument?.verificationMethod?.[0];
        if (!verificationMethod || !verificationMethod.publicKeyJwk) {
            throw new Error(`No se encontró un 'publicKeyJwk' válido en el documento DID para ${did}.`);
        }

        const publicKey = await jose.importJWK(verificationMethod.publicKeyJwk, 'ES256');
        const { payload } = await jose.jwtVerify(jws, publicKey);

        response.status(200).json({ success: true, claims: payload });

    } catch (error) {
        console.error("Error verifying JWS:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during JWS verification.";
        response.status(400).json({ success: false, error: errorMessage });
    }
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
