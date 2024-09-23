import {CallableRequest, onCall, onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
const shopifyApiSecret = defineSecret("SHOPIFY_API_SECRET");
import {SessionsClient} from "@google-cloud/dialogflow-cx";
import * as logger from "firebase-functions/logger";
import * as shopify from "./shopify";
// import * as admin from "firebase-admin";
// admin.initializeApp();
// const db = admin.firestore();
// const projectId = (admin.app().options).projectId;

const projectId = "arvo-prod";
const location = "us-central1";
const agentId = "4b1a865f-eb67-4984-a12b-12d32e7b77f3";
const sessionClient = new SessionsClient({
  apiEndpoint: `${location}-dialogflow.googleapis.com`,
});

export const dialogflowChat = onCall(
  async (request: CallableRequest<any>) => {
    try {
      const {query, sessionId} = request.data;

      if (!query || !sessionId) {
        logger.error(`Parameters missing - ${query} - ${sessionId}`);
        return;
      }
      logger.info(`${projectId} - ${location} - ${agentId} - ${sessionId}`);

      // Build the session path for Dialogflow CX
      const sessionPath = sessionClient.projectLocationAgentSessionPath(
        projectId,
        location,
        agentId,
        sessionId
      );

      // Prepare the request payload for Dialogflow CX
      const dialogflowRequest = {
        session: sessionPath,
        queryInput: {
          text: {
            text: query,
          },
          languageCode: "en", // Define the language you are using
        },
      };

      // Make the detectIntent request
      const [response] = await sessionClient.detectIntent(dialogflowRequest);
      const queryResult = response.queryResult;

      // Log the full query result for debugging
      logger.log("Query Result:", JSON.stringify(queryResult, null, 2));

      // Return the fulfillment text from the response
      return {
        fulfillmentText: queryResult?.responseMessages![0]?.text?.text![0] ||
          "No fulfillment text provided",
        queryResult: queryResult,
      };
    } catch (error) {
      logger.error("Error querying Dialogflow CX:", error);
      logger.error("internal", "Error querying Dialogflow CX", error);
      return;
    }
  });

// export const createShopifySubscription =
//   onRequest(shopify.createSubscription);
// export const cancelShopifySubscription =
//   onRequest(shopify.cancelSubscription);

// todo onDeleteAccount trigger

// /**
// * Fetches media from Instagram
// *
// * @param {any} error error
// * @param {string} docId docId
// * @param {string} message a custom message
// * @return {Promise<any>}
// */
// async function logError(error: any, docId?: string, message?: string):
//   Promise<any> {
//     console.log(`docId: ${docId} - ${message}`);
//     console.error(error.message);
//     console.error(error.code);

//   const timestamp = new Date();
//   const today = timestamp.toISOString().split("T")[0];
//   const errorObj: any = {
//     message: error.message ?? "",
//     code: error.code ?? "",
//     type: error.type ?? "",
//   };
//   // fbtrace_id, error_subcode

//   const errorLog: any = {
//     error: errorObj,
//     message: message,
//     today,
//     timestamp,
//     dateCreated: admin.firestore.FieldValue.serverTimestamp(),
//     user: docId,
//   };

//   let id = "";
//   if (docId) {
//     id = docId;
//   }
//   id = id + timestamp;
//   const docRef = db.collection("_errors").doc(id);
//   await docRef.set(errorLog);
// }

// /**
//  * Gets the key for dialogflow from secret manager
//  * @return {Promise<any>}
//  */
// async function getSecret(): Promise<any> {
//   const secret = "service-account-json";
//   const [version] = await client.accessSecretVersion({
//     name: `projects/${projectId}/secrets/${secret}/versions/latest`,
//   });
//   const payload = version?.payload?.data?.toString();
//   logger.info("payload", payload);
//   if (!payload) {
//     logger.error("secret not found");
//     throw new Error("Secret not found");
//   }
//   return JSON.parse(payload);
// }

export const shopifyAddWebhook = onRequest(shopify.addWebhook);
export const shopifyInitAuth = onRequest(shopify.initAuth);
export const shopifyAuthCallback = onRequest(shopify.authCallback);
export const shopifyDeleteWebhook = onRequest(shopify.deleteWebhook);
export const shopifyGetWebhooks = onRequest(shopify.getWebhooks);
export const shopifyOnAppUninstall = onRequest(shopify.onAppUninstall);
export const shopifyOnProductsCreate = onRequest(
  {secrets: [shopifyApiSecret]},
  shopify.onProductsCreate
);
export const shopifyOnProductsUpdate = onRequest(shopify.onProductsUpdate);
export const shopifyOnProductsDelete = onRequest(
  {secrets: [shopifyApiSecret]},
  shopify.onProductsDelete
);
