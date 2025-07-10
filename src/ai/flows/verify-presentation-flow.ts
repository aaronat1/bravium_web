
'use server';
/**
 * @fileOverview An AI agent for generating OpenID4VP presentation requests.
 * The verification logic is now handled by a separate Cloud Function.
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
    presentationDefinition: z.record(z.any()).describe("The JSON object for the presentation definition."),
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
      "id": uuidv4(),
      "input_descriptors": [
        {
          "id": uuidv4(),
          "name": "Bravium Credential",
          "purpose": "Please provide a credential issued by Bravium.",
          "constraints": {
            "fields": [
              {
                "path": [
                  "$.type"
                ],
                "filter": {
                  "type": "string",
                  "const": "VerifiableCredential"
                }
              }
            ]
          }
        }
      ]
    };
    
    // The client_id MUST be a simple HTTPS URL for Microsoft Authenticator.
    const clientId = baseUrl;
    
    // This points to the real Cloud Function URL
    const functionUrl = 'https://us-central1-bravium-d1e08.cloudfunctions.net/openid4vp';
    const requestUri = `${functionUrl}?state=${state}`;

    const requestObject = {
      client_id: clientId,
      nonce: nonce,
      presentation_definition: presentationDefinition,
      response_mode: "direct_post",
      response_type: "vp_token",
      redirect_uri: functionUrl, // The URI to post the response to.
      state: state
    };
    
    // Store the full session state in Firestore, which includes the requestObject for the GET request.
    await verificationSessions.doc(state).set({
        status: 'pending',
        createdAt: new Date(),
        requestObject
    });
    
    const requestParams = new URLSearchParams({
        client_id: clientId,
        request_uri: requestUri,
    });

    return {
      requestUrl: `openid-vc://?${requestParams.toString()}`,
      state: state,
      presentationDefinition: presentationDefinition
    };
  }
);
