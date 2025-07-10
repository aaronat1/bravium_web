
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {KeyManagementServiceClient} = require('@google-cloud/kms');
const { createHash, randomUUID } = require('crypto');

// Este polyfill es necesario para que la librería 'jose' funcione en el entorno de Cloud Functions.
require('crypto').webcrypto;

// Inicializa Firebase y los clientes de Google Cloud
admin.initializeApp();
const db = admin.firestore();
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
  // 1. Autenticación: Verifica que quien llama es un cliente autenticado.
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'La función debe ser llamada por un usuario autenticado.');
  }
  const customerId = context.auth.uid;

  // 2. Validación de Datos: Asegura que los datos necesarios para la credencial están presentes.
  if (!data.credentialSubject || typeof data.credentialSubject !== 'object' || !data.credentialType) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan datos necesarios para la credencial (credentialSubject y credentialType).');
  }

  try {
    // 3. Recuperar la Clave: Busca el documento del cliente para obtener su kmsKeyPath y su DID.
    const customerDocRef = db.collection('customers').doc(customerId);
    const customerDoc = await customerDoc.get();

    if (!customerDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'No se encontró el documento del cliente.');
    }

    const customerData = customerDoc.data();
    const kmsKeyPath = customerData.kmsKeyPath;
    const issuerDid = customerData.did;

    if (!kmsKeyPath || !issuerDid) {
      throw new functions.https.HttpsError('failed-precondition', 'El onboarding del cliente no está completo. Faltan kmsKeyPath o did.');
    }

    // 4. Construir la Credencial Verificable (el payload del JWT)
    const vcPayload = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1' // Puedes crear tu propio contexto
      ],
      id: `urn:uuid:${randomUUID()}`, // ID único para la credencial
      type: ['VerifiableCredential', data.credentialType],
      issuer: issuerDid, // El DID del cliente que emite
      issuanceDate: new Date().toISOString(),
      credentialSubject: data.credentialSubject, // Los datos de la credencial (ej. nombre, curso, etc.)
    };

    // 5. Firmar con KMS y crear un JWS (JSON Web Signature)
    const jws = await createJws(vcPayload, kmsKeyPath);
    console.log(`Credencial emitida y firmada con éxito para el cliente ${customerId}.`);

    // 6. Devolver la Credencial firmada al frontend.
    return { verifiableCredentialJws: jws };

  } catch (error) {
    console.error(`Error al emitir la credencial para el cliente ${customerId}:`, error);
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-lanza errores HttpsError para que el cliente los reciba correctamente.
    }
    throw new functions.https.HttpsError('internal', 'Ocurrió un error interno al emitir la credencial.');
  }
});

/**
 * ----------------------------------------------------------------
 * FUNCIÓN DE VERIFICACIÓN OpenID4VP (NUEVA)
 * ----------------------------------------------------------------
 * Maneja las peticiones GET y POST del flujo de verificación.
 */
exports.openid4vp = functions.region("us-central1").https.onRequest(async (request, response) => {
    // Habilitar CORS para que las carteras puedan llamar a la función.
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type");

    if (request.method === "OPTIONS") {
        response.status(204).send();
        return;
    }

    // --- GET: La cartera pide el objeto de la solicitud ---
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
                 console.error(`Request object no encontrado para el state: ${state}`);
                response.status(500).send("Error interno: request object no encontrado.");
                return;
            }
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
            const verificationResult = await verifyJwsWithGenkit(vp_token);

            if (verificationResult.isValid && verificationResult.claims) {
                await sessionDocRef.set({
                    status: 'success',
                    verifiedAt: new Date(),
                    claims: verificationResult.claims,
                    message: "Presentación verificada con éxito."
                }, { merge: true });
                response.status(200).send({ redirect_uri: 'https://bravium.org' });
            } else {
                const errorMessage = verificationResult.error || "La verificación falló por un JWS malformado.";
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
      // Añadir una etiqueta para identificar la clave fácilmente
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

  // 1. Crear la cabecera protegida del JWS
  const protectedHeader = { alg: 'ES256', typ: 'JWT' };

  // 2. Codificar en Base64URL la cabecera y el payload
  const encodedHeader = jose.base64url.encode(JSON.stringify(protectedHeader));
  const encodedPayload = jose.base64url.encode(JSON.stringify(payload));

  // 3. Crear el input que se va a firmar
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // 4. Crear el digest (hash) del input
  const digest = createHash('sha256').update(signingInput).digest();

  // 5. Firmar el digest con la clave de KMS
  const [signResponse] = await kmsClient.asymmetricSign({
      name: `${kmsKeyPath}/cryptoKeyVersions/1`,
      digest: { sha256: digest },
  });

  if (!signResponse.signature) {
      throw new Error('La firma con KMS falló o no devolvió una firma.');
  }

  // 6. Convertir la firma de formato DER (de KMS) a formato JOSE (requerido por JWS)
  const joseSignature = derToJose(signResponse.signature, 'ES256');

  // 7. Ensamblar el JWS final
  const jws = `${signingInput}.${jose.base64url.encode(joseSignature)}`;

  return jws;
}

/**
 * Función auxiliar para verificar un JWS usando Genkit.
 * @param {string} jws El JWS recibido desde la cartera.
 * @returns {Promise<{isValid: boolean, claims: object|null, error: string|null}>} El resultado de la verificación.
 */
async function verifyJwsWithGenkit(jws) {
    try {
        const { genkit, googleAI } = await import('genkit-config'); // Importar dinámicamente
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

        const { output } = await verifyPrompt({ jws });

        if (!output) {
            throw new Error("El verificador de IA no devolvió una salida válida.");
        }

        return output;
    } catch (error) {
        console.error("Error dentro de verifyJwsWithGenkit:", error);
        return { isValid: false, claims: null, error: error instanceof Error ? error.message : String(error) };
    }
}
