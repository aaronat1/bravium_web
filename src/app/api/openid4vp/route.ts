
import { type NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyPresentation } from '@/ai/flows/verify-presentation-flow';
import { z } from 'zod';

if (!adminDb) {
  throw new Error("Firebase Admin DB is not initialized. API routes will fail.");
}

const verificationSessions = adminDb.collection('verificationSessions');

// Zod schema for validating the POST request body.
const postBodySchema = z.object({
  vp_token: z.any(),
  state: z.string(),
});

/**
 * Handles GET requests to fetch the presentation request object.
 * This is the `request_uri` endpoint called by the wallet.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state');

  if (!state) {
    return NextResponse.json({ error: 'Bad Request: Missing state parameter.' }, { status: 400 });
  }

  try {
    const sessionRef = verificationSessions.doc(state);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Not Found: Invalid or expired state.' }, { status: 404 });
    }

    const sessionData = sessionDoc.data();
    if (!sessionData?.requestObject) {
      return NextResponse.json({ error: 'Internal Server Error: Request object not found.' }, { status: 500 });
    }
    
    // Return the requestObject, which contains the presentation_definition.
    return NextResponse.json(sessionData.requestObject, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}

/**
 * Handles POST requests to receive the presentation from the wallet.
 * This is the `redirect_uri` endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = postBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Bad Request: Missing or invalid vp_token or state.' }, { status: 400 });
    }

    const { vp_token, state } = validation.data;
    const sessionRef = verificationSessions.doc(state);

    // First, verify the presentation using our Genkit flow.
    const verificationResult = await verifyPresentation({ vp_token, state });

    if (verificationResult.isValid) {
      // According to OpenID4VP Direct Post, the response should be empty on success.
      return NextResponse.json({}, { status: 200 });
    } else {
      // If verification fails, we still update Firestore but return an error.
      return NextResponse.json({ error: verificationResult.message || 'Verification failed.' }, { status: 400 });
    }
  } catch (error: any) {
    // This catches errors from parsing JSON or from the verification flow itself.
    // It's important to respond with a proper error format.
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
