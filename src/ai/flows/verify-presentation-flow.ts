
'use server';
/**
 * @fileOverview An AI agent for generating OpenID4VP presentation requests.
 * The verification logic has been moved to the Cloud Function itself to ensure deployment.
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
const GenerateRequestInputSchema = z.object({});
export type GenerateRequestInput = z.infer<typeof GenerateRequestInputSchema>;

// Output for the generated request
const GenerateRequestOutputSchema = z.object({
    requestUrl: z.string().describe("The full OpenID4VP request URL for the QR code."),
    state: z.string().describe("The unique state for this verification session."),
    presentationDefinition: z.record(z.any()).describe("The JSON object for the presentation definition."),
});
export type GenerateRequestOutput = z.infer<typeof GenerateRequestOutputSchema>;

// The exported function to generate a request
export async function generateRequest(input: GenerateRequestInput = {}): Promise<GenerateRequestOutput> {
  return generateRequestFlow(input);
}

// Genkit flow to generate the request URL
const generateRequestFlow = ai.defineFlow(
  {
    name: 'generateRequestFlow',
    inputSchema: GenerateRequestInputSchema,
    outputSchema: GenerateRequestOutputSchema,
  },
  async () => {
    const state = uuidv4();
    const nonce = uuidv4();
    
    // Radically simplified presentation definition to maximize compatibility.
    // This requests any verifiable presentation without specific constraints.
    const presentationDefinition = {
        id: uuidv4(),
        input_descriptors: [{
            id: uuidv4(),
            name: "Bravium Issued Credential",
            purpose: "Please provide any credential.",
            // No constraints, allowing any VC to be presented.
        }]
    };
    
    console.log("Generated Presentation Definition:", JSON.stringify(presentationDefinition, null, 2));

    const clientId = `did:web:bravium-d1e08.web.app`; 
    const requestUri = `https://us-central1-bravium-d1e08.cloudfunctions.net/openid4vp_handler?state=${state}`;
    const responseUri = `https://us-central1-bravium-d1e08.cloudfunctions.net/openid4vp_handler`;

    const requestObject = {
      client_id: clientId,
      nonce: nonce,
      presentation_definition: presentationDefinition,
      response_mode: "direct_post",
      response_type: "vp_token",
      redirect_uri: responseUri,
      state: state
    };
    
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

// NOTE: The verification flow has been moved to functions/src/index.ts to ensure deployment.
// This file is now only responsible for generating the request from the Next.js server.
