
'use server';
/**
 * @fileOverview Flow for generating a verifiable presentation request.
 * This flow is responsible for creating a session, defining the presentation requirements,
 * signing the request object as a JWT, and storing it for later retrieval by the wallet.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { adminDb } from '@/lib/firebase/admin';
import { KeyManagementServiceClient } from '@google-cloud/kms';
import { createHash } from 'crypto';

if (!adminDb) {
  throw new Error("Firebase Admin DB is not initialized. Verification flows will fail.");
}

const kmsClient = new KeyManagementServiceClient();
const verificationSessions = adminDb.collection('verificationSessions');

// For the public verification page, we use a single, pre-defined customer as the verifier.
const VERIFIER_CUSTOMER_ID = "PdaXG6zsMbaoQNRgUr136DvKWtM2";

// Input for generating the request
const GenerateRequestInputSchema = z.object({
    baseUrl: z.string().url().describe("The base URL of the application, provided by the client."),
});
export type GenerateRequestInput = z.infer<typeof GenerateRequestInputSchema>;

// Output for the generated request
const GenerateRequestOutputSchema = z.object({
    requestUrl: z.string().describe("The full OpenID4VP request URL for the QR code."),
    state: z.string().describe("The unique state for this verification session."),
});
export type GenerateRequestOutput = z.infer<typeof GenerateRequestOutputSchema>;


// The exported function to generate a request
export async function generateRequest(input: GenerateRequestInput): Promise<GenerateRequestOutput> {
  return generateRequestFlow(input);
}


// Genkit flow to generate the request URL
const generateRequestFlow = ai.defineFlow(
  {
    name: 'generateRequestFlow',
    inputSchema: GenerateRequestInputSchema,
    outputSchema: GenerateRequestOutputSchema,
  },
  async ({ baseUrl }) => {
    const state = uuidv4();
    const nonce = uuidv4();

    // Fetch the verifier's KMS key path
    const customerDoc = await adminDb.collection('customers').doc(VERIFIER_CUSTOMER_ID).get();
    if (!customerDoc.exists || !customerDoc.data()?.kmsKeyPath) {
        throw new Error(`Verifier customer with ID ${VERIFIER_CUSTOMER_ID} not found or KMS key path is missing.`);
    }
    const kmsKeyPath = customerDoc.data()!.kmsKeyPath;
    
    const presentationDefinition = {
      id: uuidv4(),
      input_descriptors: [{
          id: uuidv4(),
          name: "Bravium Issued Credential",
          purpose: "Please provide any credential issued by Bravium.",
          schema: [{ uri: "https://www.w3.org/2018/credentials#VerifiableCredential" }]
      }]
    };
    
    const clientId = baseUrl;
    const functionUrl = `https://us-central1-bravium-d1e08.cloudfunctions.net/openid4vp`;
    const responseUri = `${functionUrl}?state=${state}`;

    const requestObject = {
      client_id: clientId,
      response_uri: responseUri,
      redirect_uri: baseUrl,
      response_type: "vp_token",
      response_mode: "direct_post",
      presentation_definition: presentationDefinition,
      nonce: nonce,
      state: state
    };
    
    // Sign the requestObject to create a JWS
    const requestObjectJwt = await createJws(requestObject, kmsKeyPath);
    
    // Store the session state in Firestore
    await verificationSessions.doc(state).set({
        status: 'pending',
        createdAt: new Date(),
        requestObject: requestObject, // For debugging and backend use
        requestObjectJwt: requestObjectJwt // This is what the wallet will fetch
    });
    
    const requestParams = new URLSearchParams({
        client_id: clientId,
        request_uri: `${functionUrl}?state=${state}`,
    });

    return {
      requestUrl: `openid-vc://?${requestParams.toString()}`,
      state: state,
    };
  }
);


/**
 * Creates a JWS signature for a given payload using a KMS key.
 * @param {object} payload The JSON object to be included in the JWS.
 * @param {string} kmsKeyPath The full resource path to the signing key in KMS.
 * @returns {Promise<string>} The signed credential in compact JWS format.
 */
async function createJws(payload: object, kmsKeyPath: string): Promise<string> {
    const jose = await import('jose');
    const { derToJose } = await import('ecdsa-sig-formatter');

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
        throw new Error('KMS signing failed or did not return a signature.');
    }

    const joseSignature = derToJose(Buffer.from(signResponse.signature), 'ES256');
    return `${signingInput}.${jose.base64url.encode(joseSignature)}`;
}
