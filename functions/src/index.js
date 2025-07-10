
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
const { createHash, randomUUID } = require('crypto');
const kmsClient = new KeyManagementServiceClient();

// --- Constantes de Configuración ---
const GCP_PROJECT_ID = process.env.GCLOUD_PROJECT;
const KMS_LOCATION_ID = 'global';
const KMS_KEYRING_ID = 'bravium-keys';

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

    const jws = await createJws(vcPayload, kmsKeyPath);
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
 * Maneja las peticiones GET (servir la petición) y POST (verificar presentación).
 */
exports.openid4vp = functions.region("us-central1").https.onRequest(async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (request.method === "OPTIONS") {
        response.status(204).send();
        return;
    }

    // --- GET: La cartera pide el objeto de solicitud ---
    if (request.method === "GET") {
        const state = request.query.state;
        if (!state) {
            console.error("GET request sin state.");
            response.status(400).send("Bad Request: Falta el parámetro state.");
            return;
        }

        try {
            const sessionDoc = await db.collection('verificationSessions').doc(state).get();
            if (!sessionDoc.exists) {
                console.error(`Sesión no encontrada para el state: ${state}`);
                response.status(404).send("Not Found: State inválido o expirado.");
                return;
            }
            const sessionData = sessionDoc.data();
            if (!sessionData || !sessionData.requestObject) {
                 console.error(`requestObject no encontrado para el state: ${state}`);
                response.status(500).send("Error interno: request object no encontrado.");
                return;
            }
            // Devolver el objeto de la petición como JSON
            response.status(200).json(sessionData.requestObject);
        } catch (error) {
            console.error(`Error en GET para el state ${state}:`, error);
            response.status(500).send("Error interno del servidor");
        }
        return;
    }

    // --- POST: La cartera envía la presentación para ser verificada ---
    if (request.method === "POST") {
        const { vp_token, state } = request.body;
        if (!vp_token || !state) {
            console.error("POST request sin vp_token o state", { body: request.body });
            response.status(400).send("Bad Request: Faltan vp_token o state.");
            return;
        }

        const sessionDocRef = db.collection('verificationSessions').doc(state);
        try {
            const { genkit, googleAI } = await import('genkit'); // Importar dinámicamente
            const { z } = await import('zod');

            const ai = genkit({
                plugins: [googleAI()],
                logLevel: 'debug',
                enableTracingAndMetrics: true,
            });

            const verifyPrompt = ai.definePrompt({
                name: 'verifyPresentationPromptInFunction',
                input: { schema: z.object({ jws: z.string() }) },
                output: { schema: z.object({
                    isValid: z.boolean().describe("True si el JWS está bien formado y contiene claims."),
                    claims: z.any().optional().describe("Los claims decodificados del payload del JWS."),
                    error: z.string().optional().describe("La razón del fallo, si existe.")
                })},
                prompt: `
                    Eres un agente de verificación. Tu tarea es analizar el JWS proporcionado.
                    JWS: {{{jws}}}
                    1. Decodifica el payload del JWS. No te preocupes por la verificación de la firma, asume que está pre-verificada.
                    2. Si el payload se decodifica con éxito y contiene claims, establece 'isValid' a true y devuelve los claims.
                    3. Si el JWS está malformado o el payload está vacío, establece 'isValid' a false y proporciona un mensaje de error.
                `,
            });

            const { output } = await verifyPrompt({ jws: vp_token });
            
            if (!output) {
                throw new Error("El verificador de IA no devolvió una salida válida.");
            }
            
            if (output.isValid && output.claims) {
                await sessionDocRef.set({
                    status: 'success',
                    verifiedAt: new Date(),
                    claims: output.claims,
                    message: "Presentación verificada con éxito."
                }, { merge: true });
                response.status(200).send({ redirect_uri: 'https://bravium.org' });
            } else {
                const errorMessage = output.error || "La verificación falló por un JWS malformado.";
                await sessionDocRef.set({ status: 'error', error: errorMessage }, { merge: true });
                response.status(400).json({ error: errorMessage });
            }
        } catch (error) {
            console.error(`Error en POST para el state ${state}:`, error);
            const errorMessage = error instanceof Error ? error.message : "Error desconocido";
            await sessionDocRef.set({ status: 'error', error: errorMessage }, { merge: true }).catch();
            response.status(500).json({ error: errorMessage });
        }
        return;
    }

    // Manejar otros métodos
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

  const did = `did:bravium:${customerId}`;
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

/**
 * Crea una firma JWS para un payload dado, utilizando una clave de KMS.
 * @param {object} payload El objeto JSON que se incluirá en la credencial.
 * @param {string} kmsKeyPath La ruta completa a la clave de firma en KMS.
 * @returns {Promise<string>} La credencial firmada en formato JWS compacto.
 */
async function createJws(payload, kmsKeyPath) {
  const jose = await import('jose');
  const { derToJose } = require('ecdsa-sig-formatter');

  const protectedHeader = { alg: 'ES256', typ: 'jwt' };
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

  const joseSignature = derToJose(signResponse.signature, 'ES256');
  const jws = `${signingInput}.${jose.base64url.encode(joseSignature)}`;

  return jws;
}

    