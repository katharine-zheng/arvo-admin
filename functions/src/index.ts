import {onRequest} from "firebase-functions/v2/https";
import * as shopify from "./shopify";
// import * as admin from "firebase-admin";
// admin.initializeApp();
// const db = admin.firestore();
// const projectId = (admin.app().options).projectId;

exports.shopifyInitAuth = onRequest(shopify.initAuth);
exports.shopifyAuthCallback = onRequest(shopify.authCallback);
exports.shopifyGetProducts = onRequest(shopify.getProducts);
exports.shopifyOnAppUninstall = onRequest(shopify.onAppUninstall);

// exports.createShopifySubscription =
//   onRequest(shopify.createSubscription);
// exports.cancelShopifySubscription =
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
