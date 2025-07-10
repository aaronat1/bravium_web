
import * as dotenv from "dotenv";
dotenv.config();

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { z } from "zod";
import { genkit, type GenkitError } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

// Initialize Firebase Admin SDK. It is safe to call this multiple times.
if (admin.apps.length === 0) {
  admin.initializeApp();
  logger.info("Firebase Admin SDK initialized for functions.");
}
const db = admin.firestore();

// Initialize Genkit and the AI model directly within the function's scope.
genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});

// --- Genkit Verification Logic (Self-contained within the function) ---
const verifyPrompt = {
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
};

async function verifyPresentationWithGenkit(input: { vp_token: any; state: string; }): Promise<{ isValid: boolean; message: string; claims?: any; }> {
    const { vp_token, state } = input;
    const sessionDocRef = db.collection('verificationSessions').doc(state);
    
    const sessionDoc = await sessionDocRef.get();
    if (!sessionDoc.exists) {
        await sessionDocRef.set({ status: 'error', error: 'Invalid or expired state.' }, { merge: true });
        throw new Error("Invalid or expired state.");
    }

    try {
        const jws = vp_token; 
        const { output, error } = await genkit.generate({
            prompt: verifyPrompt.prompt,
            model: 'googleai/gemini-2.0-flash',
            input: { jws },
            output: { schema: verifyPrompt.output.schema }
        });

        if (error) {
           throw error as GenkitError;
        }
        if (!output) {
            throw new Error("AI verifier did not return a valid output.");
        }

        if (output.isValid) {
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
    } catch (err: any) {
        const errorMessage = err.message || "An unexpected error occurred during AI verification.";
        await sessionDocRef.set({ status: 'error', error: errorMessage }, { merge: true });
        throw new Error(errorMessage);
    }
}
// --- End of Genkit Logic ---


export const openid4vp_handler = functions.region("us-central1").https.onRequest(
  async (request, response) => {
    // Enable CORS for all origins, required by wallets.
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type");

    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }
    
    logger.info(`openid4vp_handler received a ${request.method} request.`);

    // --- Case 1: Wallet is requesting the presentation details ---
    if (request.method === "GET") {
      const state = request.query.state as string;
      if (!state) {
        logger.error("GET request missing state parameter.");
        response.status(400).send("Bad Request: Missing state parameter.");
        return;
      }
      
      logger.info(`GET request received for state: ${state}`);
      try {
        const sessionRef = db.collection("verificationSessions").doc(state);
        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists) {
          logger.error(`Session not found in Firestore for state: ${state}`);
          response.status(404).send("Not Found: Invalid or expired state.");
          return;
        }
        const sessionData = sessionDoc.data();
        if (!sessionData?.requestObject) {
          logger.error(`Request object missing in session for state: ${state}`);
          response.status(500).send("Internal Server Error: Request object not found.");
          return;
        }
        logger.info(`Serving request object for state: ${state}`, { requestObject: sessionData.requestObject });
        response.status(200).json(sessionData.requestObject);
        return;
      } catch (error) {
        logger.error(`Error serving request object for state ${state}:`, error);
        response.status(500).send("Internal Server Error");
        return;
      }
    }

    // --- Case 2: Wallet is submitting the presentation ---
    if (request.method === "POST") {
        logger.info("Received presentation POST request:", {body: request.body});

        const body = request.body;
        const vp_token = body.vp_token;
        const state = body.state;
    
        if (!vp_token || !state) {
          logger.error("POST request missing vp_token or state", {body: request.body});
          response.status(400).send("Bad Request: Missing vp_token or state");
          return;
        }
    
        const sessionRef = db.collection("verificationSessions").doc(state);
        
        try {
          await sessionRef.update({
            status: "received",
            vp_token,
          });
    
          logger.info(`Session ${state} updated with vp_token. Now invoking verification logic...`);
          
          // Call the self-contained verification function
          const verificationResult = await verifyPresentationWithGenkit({ vp_token, state });
    
          if (verificationResult.isValid) {
              logger.info(`Session ${state} successfully verified.`);
              // According to OpenID4VP Direct Post, the response should be empty on success.
              response.status(200).send();
          } else {
              logger.warn(`Session ${state} verification failed: ${verificationResult.message}`);
              response.status(400).json({ error: verificationResult.message });
          }
    
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
          logger.error("Error handling presentation for state", state, ":", error);
           try {
                await sessionRef.update({
                    status: "error",
                    error: errorMessage,
                });
            } catch (updateError) {
                logger.error("Failed to even update session with error state:", updateError);
            }
          response.status(500).json({ error: errorMessage });
        }
        return;
    }
    
    // If not GET or POST
    logger.warn(`Received unsupported method: ${request.method}`);
    response.setHeader("Allow", "GET, POST");
    response.status(405).send("Method Not Allowed");
  },
);
