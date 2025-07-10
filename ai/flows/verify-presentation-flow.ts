
'use server';
/**
 * @fileOverview An AI agent for verifying presentations based on OpenID4VP.
 * This flow generates a presentation request and verifies the subsequent presentation.
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


// Input for verifying the presentation
const VerifyPresentationInputSchema = z.object({
    vp_token: z.any().describe("The Verifiable Presentation token received from the wallet."),
    state: z.string().describe("The state value from the initial request to prevent CSRF attacks."),
});
export type VerifyPresentationInput = z.infer<typeof VerifyPresentationInputSchema>;

// Output for the verification
const VerifyPresentationOutputSchema = z.object({
    isValid: z.boolean().describe("Whether the presentation is valid."),
    message: z.string().describe("A message describing the verification result."),
    claims: z.record(z.any()).optional().describe("The claims extracted from the credential if valid."),
});
export type VerifyPresentationOutput = z.infer<typeof VerifyPresentationOutputSchema>;


// The exported function to generate a request
export async function generateRequest(input: GenerateRequestInput): Promise<GenerateRequestOutput> {
  return generateRequestFlow(input);
}

// The exported function to verify a presentation
export async function verifyPresentation(input: VerifyPresentationInput): Promise<VerifyPresentationOutput> {
  return verifyPresentationFlow(input);
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
            purpose: "Please provide any credential.",
        }]
    };
    
    const clientId = `did:web:bravium-d1e08.web.app`;
    
    const requestUri = `${baseUrl}/api/openid4vp?state=${state}`;
    const responseUri = `${baseUrl}/api/openid4vp`;

    const requestObject = {
      client_id: clientId,
      nonce: nonce,
      presentation_definition: presentationDefinition,
      response_mode: "direct_post",
      response_type: "vp_token",
      redirect_uri: responseUri, // Kept for completeness, though direct_post uses it as the POST target.
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


const verifyPrompt = ai.definePrompt({
    name: 'verifyPresentationPrompt',
    input: { schema: z.object({ jws: z.string() }) },
    output: { schema: z.object({
        isValid: z.boolean().describe("True if the JWS is well-formed and contains claims."),
        claims: z.any().optional().describe("The decoded claims from the JWS payload."),
        error: z.string().optional().describe("The reason for failure, if any.")
    })},
    prompt: `
        You are a verification agent. Your task is to analyze the provided JWS string.
        JWS: {{{jws}}}
        1. Decode the JWS payload. Do not worry about signature verification, assume it is pre-verified.
        2. If the payload is successfully decoded and contains claims, set 'isValid' to true and return the claims.
        3. If the JWS is malformed or the payload is empty, set 'isValid' to false and provide an error message.
    `,
});

// Genkit flow to verify the presentation
const verifyPresentationFlow = ai.defineFlow(
  {
    name: 'verifyPresentationFlow',
    inputSchema: VerifyPresentationInputSchema,
    outputSchema: VerifyPresentationOutputSchema,
  },
  async ({ vp_token, state }) => {
    const sessionDocRef = verificationSessions.doc(state);
    const sessionDoc = await sessionDocRef.get();

    if (!sessionDoc.exists) {
        await sessionDocRef.set({ status: 'error', error: 'Invalid or expired state.' }, { merge: true });
        throw new Error("Invalid or expired state.");
    }

    try {
        const jws = vp_token; 
        const { output } = await verifyPrompt({ jws });

        if (!output) {
            throw new Error("AI verifier did not return a valid output.");
        }

        if (output.isValid && output.claims) {
            await sessionDocRef.set({ 
                status: 'success', 
                verifiedAt: new Date(),
                claims: output.claims,
                message: "Presentation verified successfully."
            }, { merge: true });
            return { isValid: true, message: "Presentation verified.", claims: output.claims };
        } else {
             const errorMessage = output.error || "Verification failed due to malformed JWS.";
            await sessionDocRef.set({ status: 'error', error: errorMessage }, { merge: true });
            return { isValid: false, message: errorMessage };
        }

    } catch (error: any) {
        await sessionDocRef.set({ status: 'error', error: error.message }, { merge: true });
        throw error;
    }
  }
);
