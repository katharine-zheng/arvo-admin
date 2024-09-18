import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
const shopifyApiSecret = defineSecret("SHOPIFY_API_SECRET");
import * as shopify from "./shopify";
// import * as admin from "firebase-admin";
// admin.initializeApp();
// const db = admin.firestore();
// const projectId = (admin.app().options).projectId;
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
