
'use server';
/**
 * @fileOverview Flow for generating a verifiable presentation request.
 * This flow is responsible for creating a session, defining the presentation requirements,
 * and storing the request object for later retrieval by the wallet.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { adminDb } from '@/lib/firebase/admin';

if (!adminDb) {
  throw new Error("Firebase Admin DB is not initialized. Verification flows will fail.");
}

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
    // IMPORTANT: Make sure this URL matches your deployed Cloud Function endpoint.
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
    
    // Store the session state in Firestore
    await verificationSessions.doc(state).set({
        status: 'pending',
        createdAt: new Date(),
        requestObject: requestObject, // For debugging and backend use
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
