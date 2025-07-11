
'use server';

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { adminDb } from '@/lib/firebase/admin';
import { UnsecuredJWT } from 'jose';

if (!adminDb) {
  throw new Error("Firebase Admin DB is not initialized. Verification flows will fail.");
}

const verificationSessions = adminDb.collection('verificationSessions');

const GenerateRequestInputSchema = z.object({
    baseUrl: z.string().url(),
});

type GenerateRequestInput = z.infer<typeof GenerateRequestInputSchema>;

export async function createVerificationRequest(input: GenerateRequestInput) {
    const validatedFields = GenerateRequestInputSchema.safeParse(input);

    if (!validatedFields.success) {
        return { error: 'Invalid input.' };
    }

    const { baseUrl } = validatedFields.data;

    try {
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
        const functionUrl = `https://us-central1-bravium-d1e08.cloudfunctions.net/openid4vp`;
        const responseUri = `${functionUrl}?state=${state}`;

        const requestObject = {
            client_id: clientId,
            response_uri: responseUri,
            redirect_uri: baseUrl,
            response_type: "vp_token",
            response_mode: "direct_post",
            scope: "openid",
            presentation_definition: presentationDefinition,
            nonce: nonce,
            state: state
        };

        // Create an unsigned JWT
        const requestObjectJwt = await new UnsecuredJWT(requestObject)
            .setProtectedHeader({ alg: 'none' })
            .encode();
        
        await verificationSessions.doc(state).set({
            status: 'pending',
            createdAt: new Date(),
            requestObject: requestObject, // For debugging
            requestObjectJwt: requestObjectJwt, // The JWT the wallet will fetch
        });
        
        const requestParams = new URLSearchParams({
            client_id: clientId,
            request_uri: `${functionUrl}?state=${state}`,
        });

        return {
            requestUrl: `openid-vc://?${requestParams.toString()}`,
            state: state,
            error: null,
        };
    } catch (e: any) {
        return { error: e.message || 'An unknown error occurred.' };
    }
}
