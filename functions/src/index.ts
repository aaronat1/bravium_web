
import * as dotenv from "dotenv";
dotenv.config();

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Import Genkit flow statically
import { verifyPresentation } from "../../src/ai/flows/verify-presentation-flow";


// Initialize Firebase Admin SDK.
// It is safe to call this multiple times.
try {
  if (admin.apps.length === 0) {
    admin.initializeApp();
    logger.info("Firebase Admin SDK initialized for functions.");
  }
} catch (e) {
  logger.error("Error initializing Firebase Admin SDK in functions/src/index.ts", e);
}

const db = admin.firestore();

/**
 * This Cloud Function has a dual purpose for OpenID4VP:
 * 1. GET request with 'state' query param: Serves the request object for the wallet (acts as request_uri).
 * 2. POST request with 'vp_token' and 'state': Handles the presentation response from the wallet.
 */
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
    
          logger.info(`Session ${state} updated with vp_token. Now invoking verification flow...`);
          
          const verificationResult = await verifyPresentation({ vp_token, state });
    
          if (verificationResult.isValid) {
              logger.info(`Session ${state} successfully verified by Genkit flow.`);
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
