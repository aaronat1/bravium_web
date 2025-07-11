
'use server';
/**
 * @fileOverview Flow for generating a verifiable presentation request.
 * This flow is responsible for creating a session and defining the presentation requirements.
 * It now generates a simple JSON request object instead of a signed JWS.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { adminDb } from '@/lib/firebase/admin';

if (!adminDb) {
  throw new Error("Firebase Admin DB is not initialized. Verification flows will fail.");
}

const verificationSessions = adminDb.collection('verificationSessions');

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
    // This is the Cloud Function URL that will handle the request from the wallet
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
    
    // Store the session state in Firestore. We are storing the JSON object directly.
    await verificationSessions.doc(state).set({
        status: 'pending',
        createdAt: new Date(),
        requestObject: requestObject, // This is what the wallet will fetch
    });
    
    // The request_uri points to our Cloud Function, which will serve the requestObject.
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
