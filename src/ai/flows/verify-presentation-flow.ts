
'use server';
/**
 * @fileOverview Flow for generating a verifiable presentation request.
 * This flow is responsible for creating a session and storing the unsigned
 * presentation request object for later signing by the Cloud Function.
 */

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


// The exported function to generate a request.
export async function generateRequest(input: GenerateRequestInput): Promise<GenerateRequestOutput> {
    const state = uuidv4();
    const nonce = uuidv4();
    
    // This must match the deployed Cloud Function region and project ID.
    const functionUrl = `https://us-central1-bravium-d1e08.cloudfunctions.net/openid4vp`;
    const verifierClientId = "did:web:bravium.es";
    
    const presentationDefinition = {
      id: "presentation-def-" + uuidv4(),
      input_descriptors: [{
          id: "vc-bravium-" + uuidv4(),
          name: "Bravium Issued Credential",
          purpose: "Please provide any credential issued by Bravium.",
          constraints: {
            "fields": [
              {
                "path": [
                  "$.issuer"
                ],
                "filter": {
                  "type": "string",
                  "pattern": `^${verifierClientId}$`
                }
              }
            ]
          }
      }]
    };
    
    // The responseUri is where the wallet POSTs the vp_token to the cloud function
    const responseUri = `${functionUrl}`;

    // The redirectUri is where the user is sent after successful verification. Must match a real page.
    const redirectUri = `${input.baseUrl}/verify/callback`;

    const requestObject = {
      client_id: verifierClientId,
      redirect_uri: redirectUri,
      response_uri: responseUri,
      response_type: "vp_token",
      response_mode: "direct_post",
      scope: "openid",
      nonce: nonce,
      state: state,
      claims: {
        vp_token: {
          presentation_definition: presentationDefinition
        }
      }
    };
    
    // Store the unsigned request object in Firestore. The Cloud Function will sign it.
    await verificationSessions.doc(state).set({
        status: 'pending',
        createdAt: new Date(),
        requestObject: requestObject
    });
    
    const requestParams = new URLSearchParams({
        client_id: verifierClientId,
        request_uri: `${functionUrl}?state=${state}`,
    });

    return {
      requestUrl: `openid-vc://?${requestParams.toString()}`,
      state: state,
    };
}
