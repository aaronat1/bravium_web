
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
import * as jwt from "jsonwebtoken";
import { verifyPresentation } from '../../src/ai/flows/verify-presentation-flow';


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

// This Cloud Function acts as a "direct_post" endpoint for the wallet.
// The wallet sends the verified presentation here.
export const openid4vp_handler = onRequest(
  {cors: true},
  async (request, response) => {
    logger.info("Received presentation:", {body: request.body});

    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }

    const {vp_token, state} = request.body;

    if (!vp_token || !state) {
      response.status(400).send("Missing vp_token or state");
      return;
    }

    const sessionRef = db.collection("verificationSessions").doc(state);
    
    try {
      // First, update the session to indicate receipt
      await sessionRef.update({
        status: "received",
        vp_token,
      });

      logger.info(`Session ${state} updated with vp_token. Now invoking verification flow...`);
      
      // Directly invoke the Genkit verification flow
      const verificationResult = await verifyPresentation({ vp_token, state });

      // The flow itself handles updating Firestore with success or error.
      // We just need to respond to the wallet.
      if (verificationResult.isValid) {
          logger.info(`Session ${state} successfully verified by Genkit flow.`);
          response.status(200).send({ message: verificationResult.message });
      } else {
          logger.warn(`Session ${state} verification failed: ${verificationResult.message}`);
          response.status(400).send({ error: verificationResult.message });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
      logger.error("Error handling presentation for state", state, ":", error);
       try {
            // Ensure the session is marked as failed even if the flow throws an unhandled error
            await sessionRef.update({
                status: "error",
                error: errorMessage,
            });
        } catch (updateError) {
            logger.error("Failed to even update session with error state:", updateError);
        }
      response.status(500).send({ error: errorMessage });
    }
  },
);


// This Cloud Function serves the presentation request JWT.
// The `request_uri` in the QR code will point to this function.
export const request_handler = onRequest(
  {cors: true},
  async (request, response) => {
    logger.info("Request handler called with query:", {query: request.query});
    const state = request.query.state;

    if (typeof state !== "string") {
      response.status(400).send("State parameter is missing or invalid.");
      return;
    }

    try {
      const sessionDoc = await db.collection("verificationSessions").doc(state)
        .get();
      if (!sessionDoc.exists) {
        logger.error(`Verification session not found for state: ${state}`);
        response.status(404).send("Verification session not found.");
        return;
      }

      const sessionData = sessionDoc.data();
      if (!sessionData) {
        response.status(404).send("Session data not found.");
        return;
      }
      
      const projectID = process.env.GCLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      if (!projectID) {
          throw new Error("Project ID is not configured in the environment.");
      }

      const requestObject = {
        response_type: "vp_token",
        client_id: sessionData.clientId,
        presentation_definition: sessionData.presentationDefinition,
        redirect_uri: sessionData.responseUri,
        response_mode: "direct_post",
        state: state,
        nonce: sessionData.nonce,
      };

      // In a real implementation, this JWT should be signed with a key
      // associated with your verifier's DID. For this simulation, we are
      // creating an unsigned JWT by using a dummy secret and ignoring it.
      // This is NOT secure for production.
      const token = jwt.sign(requestObject, "dummy-secret-for-simulation",
        {algorithm: "none"});

      response.setHeader("Content-Type", "application/oauth-authz-req+jwt");
      response.status(200).send(token);
    } catch (error) {
      logger.error("Error handling request:", error);
      response.status(500).send("Internal Server Error");
    }
  },
);
