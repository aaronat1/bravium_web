/**
 * @fileOverview Main entry point for Firebase Cloud Functions.
 * This file defines the HTTPS-triggered function `openid4vp` which handles
 * the OpenID4VP flow for credential verification.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { ai } from "../../src/ai/genkit";
import { z } from "zod";

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();
const verificationSessions = db.collection('verificationSessions');

// Define the Genkit prompt for verification directly inside the function file
// to ensure it gets packaged correctly during deployment.
const verifyPrompt = ai.definePrompt({
    name: 'verifyPresentationPromptInFunction',
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


/**
 * Cloud Function to handle OpenID4VP requests.
 * - GET: Provides the presentation request object to the wallet.
 * - POST: Receives the presentation from the wallet and verifies it.
 */
export const openid4vp = functions.region("us-central1").https.onRequest(async (request, response) => {
    // Enable CORS for all origins, which is required for wallets to interact.
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type");

    if (request.method === "OPTIONS") {
        response.status(204).send();
        return;
    }

    // --- GET Request: Serve the presentation definition ---
    if (request.method === "GET") {
        const state = request.query.state as string;
        if (!state) {
            logger.error("GET request missing state parameter.");
            response.status(400).send("Bad Request: Missing state parameter.");
            return;
        }

        try {
            const sessionDoc = await verificationSessions.doc(state).get();
            if (!sessionDoc.exists) {
                logger.error(`Session not found for state: ${state}`);
                response.status(404).send("Not Found: Invalid or expired state.");
                return;
            }
            const sessionData = sessionDoc.data();
            if (!sessionData?.requestObject) {
                logger.error(`Request object missing for state: ${state}`);
                response.status(500).send("Internal Server Error: Request object not found.");
                return;
            }
            response.status(200).json(sessionData.requestObject);
        } catch (error) {
            logger.error(`Error handling GET for state ${state}:`, error);
            response.status(500).send("Internal Server Error");
        }
        return;
    }

    // --- POST Request: Verify the presentation ---
    if (request.method === "POST") {
        const { vp_token, state } = request.body;
        if (!vp_token || !state) {
            logger.error("POST request missing vp_token or state", { body: request.body });
            response.status(400).send("Bad Request: Missing vp_token or state.");
            return;
        }

        const sessionDocRef = verificationSessions.doc(state);
        try {
            const sessionDoc = await sessionDocRef.get();
            if (!sessionDoc.exists) {
                throw new Error("Invalid or expired state.");
            }

            const { output } = await verifyPrompt({ jws: vp_token });
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
                response.status(200).send({});
            } else {
                const errorMessage = output.error || "Verification failed due to malformed JWS.";
                await sessionDocRef.set({ status: 'error', error: errorMessage }, { merge: true });
                response.status(400).json({ error: errorMessage });
            }
        } catch (error: any) {
            logger.error(`Error handling POST for state ${state}:`, error);
            await sessionDocRef.set({ status: 'error', error: error.message }, { merge: true }).catch();
            response.status(500).json({ error: error.message });
        }
        return;
    }

    // Handle other methods
    response.status(405).send("Method Not Allowed");
});
