
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
// Note: This does not use Genkit to avoid permission issues in the app server environment.
export async function generateRequest(input: GenerateRequestInput): Promise<GenerateRequestOutput> {
    const state = uuidv4();
    const nonce = uuidv4();
    
    // Use a stable, public URL for client_id and redirect_uri as required by OID4VP.
    const publicUrl = "https://bravium.org";
    
    const presentationDefinition = {
      id: uuidv4(),
      input_descriptors: [{
          id: uuidv4(),
          name: "Bravium Issued Credential",
          purpose: "Please provide any credential issued by Bravium.",
          schema: [{ uri: "https://www.w3.org/2018/credentials#VerifiableCredential" }]
      }]
    };
    
    // This must match the deployed Cloud Function region and project ID.
    // TODO: Consider moving to environment variables for flexibility.
    const functionUrl = `https://us-central1-bravium-d1e08.cloudfunctions.net/openid4vp`;
    const responseUri = `${functionUrl}?state=${state}`;

    const requestObject = {
      client_id: publicUrl,
      response_uri: responseUri,
      redirect_uri: publicUrl,
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
        client_id: publicUrl,
        request_uri: `${functionUrl}?state=${state}`,
    });

    return {
      requestUrl: `openid-vc://?${requestParams.toString()}`,
      state: state,
    };
}
