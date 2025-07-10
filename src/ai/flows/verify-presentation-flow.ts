
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

// Schema for the presentation definition
const PresentationDefinitionSchema = z.object({
  id: z.string().describe("A unique identifier for this presentation definition."),
  input_descriptors: z.array(z.object({
    id: z.string().describe("A unique identifier for this input descriptor."),
    name: z.string().optional().describe("A human-readable name for the requested information."),
    purpose: z.string().optional().describe("A human-readable purpose for the requested information."),
    constraints: z.object({
      fields: z.array(z.object({
        path: z.array(z.string()).describe("A JSONPath string expression to select a field from the credential."),
      })),
    }),
  })),
});

// Input for generating the request
const GenerateRequestInputSchema = z.object({}); // Empty for now, could be parameterized later
export type GenerateRequestInput = z.infer<typeof GenerateRequestInputSchema>;

// Output for the generated request
const GenerateRequestOutputSchema = z.object({
    requestUrl: z.string().describe("The full OpenID4VP request URL."),
    state: z.string().describe("The unique state for this verification session."),
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
export async function generateRequest(input: GenerateRequestInput = {}): Promise<GenerateRequestOutput> {
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
  async () => {
    const state = uuidv4();
    const nonce = uuidv4();
    const presentationDefinition = {
        id: uuidv4(),
        input_descriptors: [{
            id: uuidv4(),
            name: "Bravium Issued Credential",
            purpose: "Please provide a credential issued by Bravium.",
            constraints: {
                fields: [{ path: ["$.type"] }] // Requesting any VC
            }
        }]
    };
    
    // Using a fixed, reliable DID for the client ID.
    const clientId = "did:web:example.com"; 
    const responseUri = `https://us-central1-bravium-d1e08.cloudfunctions.net/openid4vp_handler`;

    const requestObject = {
      client_id: clientId,
      nonce: nonce,
      presentation_definition: presentationDefinition,
      response_mode: "direct_post",
      response_type: "vp_token",
      response_uri: responseUri,
      state: state
    };
    
    // Store the session state in Firestore for later verification
    await verificationSessions.doc(state).set({
        status: 'pending',
        createdAt: new Date(),
        nonce,
        requestObject: { // Store the request for auditing/debugging
            client_id: clientId,
            presentation_definition: presentationDefinition,
            response_uri: responseUri,
            state: state,
            nonce: nonce,
        }
    });
    
    // Build the full URL for the QR code by encoding the request object parameters directly
    const requestParams = new URLSearchParams({
        client_id: requestObject.client_id,
        nonce: requestObject.nonce,
        presentation_definition: JSON.stringify(requestObject.presentation_definition),
        response_mode: requestObject.response_mode,
        response_type: requestObject.response_type,
        response_uri: requestObject.response_uri,
        state: requestObject.state,
    });

    return {
      requestUrl: `openid-vc://?${requestParams.toString()}`,
      state: state
    };
  }
);


const verifyPrompt = ai.definePrompt({
    name: 'verifyPresentationPrompt',
    input: { schema: z.object({ jws: z.string() }) },
    output: { schema: z.object({
        isValid: z.boolean().describe("True if the signature is valid and the claims are trusted."),
        claims: z.any().optional().describe("The decoded claims from the JWS payload."),
        error: z.string().optional().describe("The reason for failure, if any.")
    })},
    prompt: `
        You are a highly secure verification agent for Verifiable Credentials.
        Your task is to analyze the provided JWS string.

        JWS: {{{jws}}}

        1. Decode the JWS payload. Do not worry about signature verification, assume it has been pre-verified.
        2. Check if the 'issuer' claim in the payload is a trusted issuer (assume any issuer starting with 'did:bravium:' is trusted).
        3. If the issuer is trusted, set 'isValid' to true and return the decoded claims.
        4. If the issuer is not trusted or the JWS is malformed, set 'isValid' to false and provide an error message.
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
    const sessionDoc = await verificationSessions.doc(state).get();
    if (!sessionDoc.exists) {
        await verificationSessions.doc(state).set({ status: 'error', error: 'Invalid or expired state.' }, { merge: true });
        throw new Error("Invalid or expired state.");
    }

    // In a real implementation, you would use a library like 'did-jwt-vc' to fully verify the JWS
    // For this simulation, we'll use a Genkit prompt to decode and check the issuer.
    try {
        const jws = vp_token; // Assuming vp_token is the JWS string for simplicity
        const { output } = await verifyPrompt({ jws });

        if (!output) {
            throw new Error("AI verifier did not return a valid output.");
        }

        if (output.isValid) {
            await verificationSessions.doc(state).set({ 
                status: 'success', 
                verifiedAt: new Date(),
                claims: output.claims,
                message: "Presentation verified successfully."
            }, { merge: true });
            return { isValid: true, message: "Presentation verified.", claims: output.claims };
        } else {
             const errorMessage = output.error || "Verification failed due to untrusted issuer or malformed JWS.";
            await verificationSessions.doc(state).set({ status: 'error', error: errorMessage }, { merge: true });
            return { isValid: false, message: errorMessage };
        }

    } catch (error: any) {
        await verificationSessions.doc(state).set({ status: 'error', error: error.message }, { merge: true });
        throw error;
    }
  }
);
