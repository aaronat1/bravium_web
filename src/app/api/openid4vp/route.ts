
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
  console.log(`[API/GET] Received request for state: ${state}`);

  if (!state) {
    console.error('[API/GET] Bad Request: Missing state parameter.');
    return NextResponse.json({ error: 'Bad Request: Missing state parameter.' }, { status: 400 });
  }

  try {
    const sessionRef = verificationSessions.doc(state);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      console.error(`[API/GET] Not Found: Invalid or expired state: ${state}`);
      return NextResponse.json({ error: 'Not Found: Invalid or expired state.' }, { status: 404 });
    }

    const sessionData = sessionDoc.data();
    if (!sessionData?.requestObject) {
      console.error(`[API/GET] Internal Server Error: Request object not found for state: ${state}`);
      return NextResponse.json({ error: 'Internal Server Error: Request object not found.' }, { status: 500 });
    }
    
    console.log(`[API/GET] Success: Serving request object for state: ${state}`);
    // Return the requestObject, which contains the presentation_definition.
    return NextResponse.json(sessionData.requestObject, { status: 200 });
  } catch (error: any) {
    console.error(`[API/GET] Internal Server Error: ${error.message}`, { state });
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
    console.log('[API/POST] Received request with body:', body);

    const validation = postBodySchema.safeParse(body);

    if (!validation.success) {
      console.error('[API/POST] Bad Request: Missing or invalid vp_token or state.', validation.error.flatten());
      return NextResponse.json({ error: 'Bad Request: Missing or invalid vp_token or state.' }, { status: 400 });
    }

    const { vp_token, state } = validation.data;
    console.log(`[API/POST] Parsed state: ${state}`);
    const sessionRef = verificationSessions.doc(state);

    // First, verify the presentation using our Genkit flow.
    console.log(`[API/POST] Invoking verification flow for state: ${state}`);
    const verificationResult = await verifyPresentation({ vp_token, state });
    console.log(`[API/POST] Verification result for state ${state}:`, verificationResult);


    if (verificationResult.isValid) {
      // According to OpenID4VP Direct Post, the response should be empty on success.
      console.log(`[API/POST] Success: Responding 200 OK for state: ${state}`);
      return NextResponse.json({}, { status: 200 });
    } else {
      // If verification fails, we still update Firestore but return an error.
      console.error(`[API/POST] Verification failed for state ${state}: ${verificationResult.message}`);
      return NextResponse.json({ error: verificationResult.message || 'Verification failed.' }, { status: 400 });
    }
  } catch (error: any) {
    // This catches errors from parsing JSON or from the verification flow itself.
    // It's important to respond with a proper error format.
    console.error(`[API/POST] Internal Server Error: ${error.message}`, error);
    return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
  }
}
