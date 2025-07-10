
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as jwt from "jsonwebtoken";

admin.initializeApp();
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

    try {
      const sessionRef = db.collection("verificationSessions").doc(state);
      await sessionRef.update({
        status: "received",
        vp_token,
      });

      // Here you would trigger the verification flow.
      // For now, we just acknowledge receipt.
      // In a real scenario, you'd call a verification service/flow.
      // The verification flow would then update the session document with
      // the final status (success, error).

      logger.info(`Session ${state} updated with vp_token.`);
      response.status(200).send("Presentation received.");
    } catch (error) {
      logger.error("Error handling presentation:", error);
      response.status(500).send("Internal Server Error");
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
        response.status(404).send("Verification session not found.");
        return;
      }

      const sessionData = sessionDoc.data();
      if (!sessionData) {
        response.status(404).send("Session data not found.");
        return;
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

    