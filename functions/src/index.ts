
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import * as dotenv from "dotenv";
dotenv.config();

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// We need to lazy-import the flow to avoid initializing it when the function is deployed.
// This is a common pattern for using Genkit flows within Cloud Functions.
const getVerifyPresentationFlow = async () => {
    const { verifyPresentation } = await import("../../src/ai/flows/verify-presentation-flow");
    return verifyPresentation;
};


// Initialize Firebase Admin SDK for the Cloud Functions environment.
if (admin.apps.length === 0) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Make sure to handle the newline characters correctly for the private key
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
      try {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
          logger.info("Firebase Admin SDK initialized successfully for functions.");
      } catch (error) {
          logger.error("Error initializing Firebase Admin SDK for functions:", error);
      }
  } else {
      logger.warn("Firebase Admin credentials not found in functions/.env variables. Functions requiring admin rights may not work correctly.");
  }
}

const db = admin.firestore();

// This Cloud Function has a dual purpose:
// 1. GET request with a 'state' query param: Serves the request object for the wallet (acts as request_uri).
// 2. POST request with 'vp_token' and 'state': Handles the presentation response from the wallet.
export const openid4vp_handler = onRequest(
  {cors: true},
  async (request, response) => {
    
    // --- Case 1: Wallet is requesting the presentation details ---
    if (request.method === "GET") {
      const state = request.query.state as string;
      if (!state) {
        logger.error("GET request missing state parameter.");
        response.status(400).send("Bad Request: Missing state parameter.");
        return;
      }
      
      try {
        const sessionRef = db.collection("verificationSessions").doc(state);
        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists) {
          logger.error(`Session not found for state: ${state}`);
          response.status(404).send("Not Found: Invalid or expired state.");
          return;
        }
        const sessionData = sessionDoc.data();
        if (!sessionData?.requestObject) {
          logger.error(`Request object missing in session for state: ${state}`);
          response.status(500).send("Internal Server Error: Request object not found.");
          return;
        }
        logger.info(`Serving request object for state: ${state}`);
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

        // The body might be URL-encoded, so we need to handle that.
        const body = request.body;
        const vp_token = body.vp_token;
        const state = body.state;
    
        if (!vp_token || !state) {
          response.status(400).send("Missing vp_token or state");
          return;
        }
    
        const sessionRef = db.collection("verificationSessions").doc(state);
        
        try {
          await sessionRef.update({
            status: "received",
            vp_token,
          });
    
          logger.info(`Session ${state} updated with vp_token. Now invoking verification flow...`);
          
          const verifyPresentation = await getVerifyPresentationFlow();
          const verificationResult = await verifyPresentation({ vp_token, state });
    
          if (verificationResult.isValid) {
              logger.info(`Session ${state} successfully verified by Genkit flow.`);
              // According to OpenID4VP Direct Post, the response should be empty on success.
              response.status(200).send();
          } else {
              logger.warn(`Session ${state} verification failed: ${verificationResult.message}`);
              response.status(400).send({ error: verificationResult.message });
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
          response.status(500).send({ error: errorMessage });
        }
        return;
    }
    
    // If not GET or POST
    response.status(405).send("Method Not Allowed");
  },
);
