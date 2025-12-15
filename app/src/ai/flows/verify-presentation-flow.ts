
'use server';
/**
 * @fileOverview Generates an OpenID4VP request URL.
 * This file is now deprecated in favor of a direct verification flow.
 */

import { adminDb } from '@/lib/firebase/admin';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Function is now a simple server action, no Genkit needed.
export async function generateRequest(
  { baseUrl }: { baseUrl: string }
): Promise<{ requestUrl: string; state: string }> {

  if (!adminDb) {
    throw new Error("Firebase Admin DB is not initialized. Verification flow will fail.");
  }
  if (!PROJECT_ID) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set.");
  }

  const state = Math.random().toString(36).substring(2);
  const functionUrl = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/openid4vp`;
  const callbackUrl = `${baseUrl}/verify/callback`;

  const requestObject = {
      response_type: 'vp_token',
      client_id: baseUrl,
      redirect_uri: callbackUrl,
      presentation_definition: {
        id: 'Bravium-Verification-Request',
        input_descriptors: [
          {
            id: 'verifiable_credential',
            name: 'Bravium Credential',
            purpose: 'To verify the authenticity of a credential issued by a Bravium customer.',
            constraints: {
              fields: [
                {
                  path: ['$.type'],
                  filter: {
                    type: 'string',
                    pattern: 'VerifiableCredential'
                  }
                }
              ]
            }
          }
        ]
      },
      nonce: Math.random().toString(36).substring(2),
      state: state
  };

  try {
    await adminDb.collection('verificationSessions').doc(state).set({
      status: 'pending',
      createdAt: new Date(),
      requestObject: requestObject
    });
  } catch (error: any) {
     console.error("Error creating verification session in Firestore:", error);
     throw new Error(`Failed to create session: ${error.message}`);
  }

  const requestUrl = `openid-vc://?request_uri=${encodeURIComponent(functionUrl)}&state=${state}`;

  return { requestUrl, state };
}
