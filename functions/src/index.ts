import {CallableRequest,
  HttpsError,
  onCall,
  onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
const shopifyApiSecret = defineSecret("SHOPIFY_API_SECRET");
import {SessionsClient} from "@google-cloud/dialogflow-cx";
import * as logger from "firebase-functions/logger";
import * as shopify from "./shopify";
import {db} from "./firebase";
import {BetaAnalyticsDataClient} from "@google-analytics/data";
// const projectId = (admin.app().options).projectId;

const projectId = "arvo-prod";
const location = "us-central1";
const agentId = "4b1a865f-eb67-4984-a12b-12d32e7b77f3";
const sessionClient = new SessionsClient({
  apiEndpoint: `${location}-dialogflow.googleapis.com`,
});

const gaPrivateKey = defineSecret("GOOGLE_ANALYTICS_PRIVATE_KEY");
const gaClientEmail = defineSecret("GOOGLE_ANALYTICS_CLIENT_EMAIL");

export const getReport = onCall(
  {secrets: [gaPrivateKey, gaClientEmail]},
  async (request: CallableRequest<any>) => {
    // TODO this is for arvo-prod
    const propertyId = "457488060";

    try {
      // Ensure secrets are available
      if (!gaPrivateKey || !gaClientEmail) {
        if (!gaPrivateKey) {
          logger.error("no private key");
        }
        if (!gaClientEmail) {
          logger.error("no clientEmail");
        }
        throw new Error("Missing required secrets");
      }

      // Initialize the analytics data client with the credentials
      const analyticsDataClient = new BetaAnalyticsDataClient({
        "credentials": {
          "private_key": gaPrivateKey.value().replace(/\\n/g, "\n"),
          "client_email": gaClientEmail.value(),
        },
      });

      const reportRequest: any = {
        property: `properties/${propertyId}`,
        dateRanges: request.data.dateRanges,
        metrics: request.data.metrics,
      };

      if (request.data.dimensions) {
        reportRequest.dimensions = request.data.dimensions;
      }

      if (request.data.dimensionFilter) {
        reportRequest.dimensionFilter = request.data.dimensionFilter;
      }

      const [response] = await analyticsDataClient.runReport(reportRequest);

      // Process and return the response data
      const rows = response.rows || [];
      const formattedData = rows.map((row: any) => {
        return {
          date: row.dimensionValues?.[0]?.value,
          sessions: row.metricValues?.[0]?.value,
          pageviews: row.metricValues?.[1]?.value,
        };
      });

      return formattedData;
    } catch (error) {
      logger.error("Error fetching GA data:", error);
      throw new HttpsError("internal",
        "Failed to retrieve GA data");
    }
  });

export const dialogflowChat = onCall(
  async (request: CallableRequest<any>) => {
    try {
      const {query, sessionId, productId, tag} = request.data;

      if (!query || !sessionId) {
        logger.error(`Parameters missing - ${query} - ${sessionId}`);
        return;
      } else if (!productId || !tag) {
        logger.error(`Parameters missing: ${productId} - ${tag}`);
        return;
      }

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
      // const fulfillmentText = response.queryResult?.fulfillmentText;
      const intentTag = queryResult?.intent?.displayName;

      if (intentTag && intentTag === "video.thank.you") {
        const productDoc = await db.collection("products")
          .doc(productId).get();

        if (!productDoc.exists) {
          // TODO log error
          logger.error(`Product not found ${productId}`);
          throw new HttpsError("not-found", "Product not found");
        }

        const productData = productDoc.data();
        if (!productData) {
          // TODO log error
          logger.error(`Product data not found ${productId}`);
          throw new HttpsError("not-found", "Product not found");
        } else if (!productData.mediaList ||
          productData.mediaList.length === 0) {
          // TODO log error
          logger.error(`Product videos not found ${productId}`);
          throw new HttpsError("not-found", "No thank you video found");
        }

        const videos = productData.mediaList.filter((mediaItem: any) => {
          return mediaItem.tags &&
            Array.isArray(mediaItem.tags) &&
            mediaItem.tags.includes(tag);
        });

        if (videos.length === 0) {
          return {
            fulfillmentText: "Sorry, no thank you video is available.",
            videoList: [],
            queryResult: queryResult,
          };
        }

        return {
          fulfillmentText: "Here are your thank you videos.",
          queryResult: queryResult,
          videoList: videos,
        };
      }
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

export const dialogflowRetrieveVideoCall = onCall(
  async (request: CallableRequest<any>) => {
    logger.log("dialogflowRetrieveVideoCall");
    const {productId, tag} = request.data;
    if (!productId || !tag) {
      logger.error(`Parameters missing: ${productId} - ${tag}`);
      return;
    }

    try {
      // Fetch the thank-you video URL from Firestore
      const productDoc = await db.collection("products")
        .doc(productId).get();

      if (!productDoc.exists) {
        // TODO log error
        logger.error(`Product not found ${productId}`);
        throw new HttpsError("not-found", "Product not found");
      }

      const productData = productDoc.data();
      if (!productData) {
        // TODO log error
        logger.error(`Product data not found ${productId}`);
        throw new HttpsError("not-found", "Product not found");
      } else if (!productData.mediaList || productData.mediaList.length === 0) {
        // TODO log error
        logger.error(`Product videos not found ${productId}`);
        throw new HttpsError("not-found", "No thank you video found");
      }

      const thankYouVideos = productData.mediaList.filter((mediaItem: any) => {
        return mediaItem.tags &&
          Array.isArray(mediaItem.tags) &&
          mediaItem.tags.includes(tag);
      });

      if (thankYouVideos.length === 0) {
        return {
          fulfillmentText: "Sorry, no thank you video is available.",
          videoList: [],
        };
      }

      return {
        fulfillmentText: "Here are your thank you videos.",
        videoList: thankYouVideos.map((video: any) => video.url),
      };
    } catch (error) {
      // TODO log error
      logger.error("Error fetching video URL:", error);
      throw new HttpsError("internal", "Error fetching video URL.");
    }
  });

// export const dialogflowRetrieveVideoRequest = onRequest(async (req, res) => {
//   // const {productId, tag} = req.query;
//   // if (!productId || !tag) {
//   //   logger.error(`Parameters missing: ${productId} - ${tag}`);
//   //   return;
//   // }
//   const productId = req.body.sessionInfo?.parameters?.productId || null;
//   if (!productId) {
//     logger.error(`Parameters missing: ${productId}`);
//     return;
//   }
//   // const productId = "m44KD5wyFpKwqKsD1m0i";
//   const tag = "thank you message";
//   try {
//     const productDoc = await db.collection("products")
//       .doc(productId.toString()).get();

//     if (!productDoc.exists) {
//       // TODO log error
//       logger.error(`Product not found ${productId}`);
//       // throw new HttpsError("not-found", "Product not found");
//       res.status(404).send({error: "No thank you videos found"});
//       return;
//     }

//     const productData = productDoc.data();
//     if (!productData) {
//       // TODO log error
//       logger.error(`Product data not found ${productId}`);
//       // throw new HttpsError("not-found", "Product not found");
//       res.status(404).send({error: "No thank you videos found"});
//       return;
//     } else if (!productData.mediaList ||
//        productData.mediaList.length === 0) {
//       // TODO log error
//       logger.error(`Product videos not found ${productId}`);
//       // throw new HttpsError("not-found", "No thank you video found");
//       res.status(404).send({error: "No thank you videos found"});
//       return;
//     }

//     const videos = productData.mediaList.filter((mediaItem: any) => {
//       return mediaItem.tags &&
//         Array.isArray(mediaItem.tags) &&
//         mediaItem.tags.includes(tag);
//     });

//     logger.info(videos);

//     // const videoPayload = videos.map((video: any) => ({
//     //   type: "video",
//     //   rawUrl: video.url,
//     //   accessibilityText: video.title,
//     // }));

//     const videoPayload = videos.map((video: any) => ([
//       {
//         type: "image",
//         rawUrl: video.thumbnailUrl,
//         accessibilityText: `${video.title} thumbnail`,
//       },
//       {
//         type: "button",
//         icon: {
//           type: "play_arrow",
//           color: "#FF0000",
//         },
//         text: `Play ${video.title}`,
//         link: video.url,
//       },
//     ]));

//     // Send back the rich content with the list of videos
//     res.status(200).send({
//       fulfillmentResponse: {
//         messages: [
//           {
//             payload: {
//               richContent: videoPayload,
//             },
//           },
//         ],
//       },
//     });
//     // res.status(200).send({
//     //   fulfillmentResponse: {
//     //     messages: [{
//     //       text: {
//     //         text: [`Here is your thank you video: ${videos[0].url}`],
//     //       },
//     //     }],
//     //   },
//     // });
//   } catch (error) {
//     logger.error("Error fetching video:", error);
//     res.status(500).send({error: "Internal server error"});
//   }
// });

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
export const shopifyUninstallApp = onRequest(shopify.uninstallApp);
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

// export const dialogflowVideoRequest = onRequest(async (req, res) => {
//   const session = req.body.session;
//   const parameters = req.body.queryResult.parameters;
//   const productId = parameters?.productId;

//   if (!productId) {
//     return res.json({
//       fulfillmentText: "Merchant ID is required."
//     });
//   }

//   try {
//     // Fetch thank you videos from Firestore based on the productId
//     const productDoc = await db.collection("products")
//       .doc(productId).get();
//     if (!productDoc.exists || !productDoc.data()?.media) {
//       return res.json({
//         fulfillmentText: "No media found for this merchant."
//       });
//     }

//     const mediaItems = productDoc.data()?.media.filter((item: any) =>
//       item.tags.includes("thank you message")
//     );

//     if (mediaItems.length === 0) {
//       return res.json({
//         fulfillmentText: "No thank you video available for this merchant."
//       });
//     }

//     const videoUrls = mediaItems.map((item: any) => item.url);

//     // Respond to Dialogflow with the video URLs
//     return res.json({
//       fulfillmentText: "Here is your thank you video.",
//       fulfillmentMessages: [
//         {
//           text: {
//             text: videoUrls
//           }
//         }
//       ]
//     });
//   } catch (error) {
//     console.error("Error fetching media:", error);
//     return res.json({
//       fulfillmentText: "An error occurred while fetching the video."
//     });
//   }
// });
