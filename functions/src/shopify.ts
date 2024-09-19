import {HttpsError, onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import axios from "axios";
import crypto = require("crypto");

import * as cors from "cors";
const corsHandler = cors({origin: true});

import * as admin from "firebase-admin";
admin.initializeApp();
const db = admin.firestore();
const shopifyApiKey = defineSecret("SHOPIFY_API_KEY");
const shopifyApiSecret = defineSecret("SHOPIFY_API_SECRET");

// const projectId = (admin.app().options).projectId;

export const initAuth = onRequest(
  {secrets: [shopifyApiKey, shopifyApiSecret]},
  (req, res) => {
    corsHandler(req, res, async () => {
      const {shop, hmac, state} = req.query;
      if (!shop || !hmac || !state) {
        logger.error(`Parameter missing: ${shop} - ${hmac}`);
        res.status(400).send("Parameter missing");
        return;
      }

      // const isValidHmac = validateHmac(req.query, shopifyApiKey.value());
      // if (!isValidHmac) {
      //   res.status(400).send("Invalid HMAC");
      // }

      const map = Object.assign({}, req.query) as {[key: string]: string};
      delete map["hmac"];
      delete map["state"];

      const sortedParams = Object.keys(map).sort();
      const message = sortedParams
        .map((key) => `${key}=${encodeURIComponent(map[key])}`)
        .join("&");

      const hash = crypto
        .createHmac("sha256", shopifyApiSecret.value())
        .update(message)
        .digest("hex");

      if (hmac !== hash) {
        res.status(403).send(`HMAC failed: ${hmac} - ${hash}`);
        return;
      }

      const scopes = "read_products,read_content";
      const redirectUri = `https://${req.hostname}/shopifyAuthCallback`;
      const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${shopifyApiKey.value()}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;
      res.redirect(302, installUrl);
    });
  });

//   /**
//  * Retrieves the access token for the specified shop.
//  * @param {string} query - The name of the shop.
//  * @param {string} secret - token.
//  * @return {boolean} A promise that resolves to hmac validation
//  */
// export function validateHmac(query: any, secret: string): boolean {
//   const hmac = query.hmac;
//   const map = Object.assign({}, query) as {[key: string]: string};
//   delete map["hmac"];
//   delete map["state"];

//   const sortedParams = Object.keys(map).sort();
//   const message = sortedParams
//     .map((key) => `${key}=${encodeURIComponent(map[key])}`)
//     .join("&");

//   const generatedHmac = crypto
//     .createHmac("sha256", secret)
//     .update(message)
//     .digest("hex");

//   return generatedHmac === hmac;
// }

export const authCallback = onRequest(
  {secrets: [shopifyApiKey, shopifyApiSecret]},
  async (req, res) => {
    const {shop, hmac, code, state} = req.query;
    if (!shop || !hmac || !code || !state) {
      logger.error(`Missing: ${shop} - ${hmac} - ${code} - ${state}`);
      res.status(400).send("Missing parameters");
      return;
    }

    // Exchange authorization code for access token
    const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token`;
    const accessTokenPayload = {
      client_id: shopifyApiKey.value(),
      client_secret: shopifyApiSecret.value(),
      code,
    };

    try {
      const response = await axios.post(accessTokenRequestUrl,
        accessTokenPayload);
      const accessToken = response.data.access_token;
      const domain = shop.toString();

      await registerWebhook(
        "app/uninstalled", "OnAppUninstall", domain, accessToken);
      await registerWebhook(
        "products/create", "OnProductsCreate", domain, accessToken);
      await registerWebhook(
        "products/update", "OnProductsUpdate", domain, accessToken);
      await registerWebhook(
        "products/delete", "OnProductsDelete", domain, accessToken);

      const shopData = await fetchShop(shop.toString(), accessToken);
      const products = await fetchProducts(shop.toString(), accessToken);
      // const shopData = await fetchData(domain, "shop", accessToken);
      // const products = await fetchData(domain, "products", accessToken);
      const webhooks = await fetchWebhooks(domain, accessToken);
      await storeInitialData(state.toString(), accessToken, {
        shop: shopData, products, webhooks,
      });

      // todo update
      const redirectUrl = "https://arvo-prod.web.app/dashboard";

      res.redirect(302, redirectUrl);
    } catch (error) {
      logger.error("Error exchanging code for access token:", error);
      res.status(500).send("Error during OAuth");
    }
  });

/**
 * Getting the shopify shop object
 * @param {string} shop shopify domain
 * @param {string} accessToken access token
 * @return {Promise<any>}
 */
export async function fetchShop(shop: string, accessToken: string):
Promise<any> {
  const headers = {
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
  };

  const endpoint = `https://${shop}/admin/api/2023-04/shop.json`;
  let result;
  try {
    const axiosResponse = await axios.get(endpoint, headers);
    if (axiosResponse.data && axiosResponse.data.shop) {
      result = axiosResponse.data.shop;
    }
    return result;
  } catch (error) {
    logger.error("Error getting shop details:", error);
    return null;
  }
}

/**
 * Getting shopify products
 * @param {string} shop shopify domain
 * @param {string} accessToken access token
 * @return {Promise<any>}
 */
export async function fetchProducts(shop: string, accessToken: string):
Promise<any> {
  const headers = {
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
  };

  const endpoint = `https://${shop}/admin/api/2024-01/products.json`;
  let result = [];
  try {
    const axiosResponse = await axios.get(endpoint, headers);
    if (axiosResponse.data && axiosResponse.data.products) {
      result = axiosResponse.data.products;
    }
  } catch (error) {
    logger.error("Error getting shop details:", error);
  }
  return result;
}

/**
 * Getting shopify products
 * @param {string} shop shopify domain
//  * @param {string} type data type
 * @param {string} accessToken access token
 * @return {Promise<any>}
 */
export async function fetchWebhooks(shop: string, accessToken: string):
Promise<any> {
  // logger.log(`shop: ${shop}, type: ${type}, token: ${accessToken}`);
  const headers = {
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
  };

  const endpoint = `https://${shop}/admin/api/2024-01/webhooks.json`;
  let result;
  try {
    const response = await axios.get(endpoint, headers);
    if (response.data && response.data.webhooks) {
      result = response.data.webhooks;
    } else {
      logger.error("fetchWebhooks: empty");
    }
  } catch (error) {
    logger.error("fetchWebhooks: Error getting webhooks: ", error);
  }
  return result;
}

/**
 * Retrieves the access token for the specified shop.
 * @param {string} accountId - Account Id
 * @param {string} accessToken - token.
 * @param {any} data - fetched data
 * @return {Promise<boolean>} A promise that resolves to the access token.
 */
export async function storeInitialData(accountId: string,
  accessToken: string, data: any): Promise<boolean> {
  const {shop, products, webhooks} = data;
  const domain = shop.myshopify_domain;
  const shopId = shop.id;
  try {
    const docRef = db.collection("accounts").doc(accountId);
    const doc = await docRef.get();
    const updateTime = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();

    if (doc.exists) {
      batch.update(docRef, {
        [`platformStores.${shopId}`]: {
          accessToken,
          updateTime,
          type: "shopify",
          shop: shop,
          id: shopId,
          subdomain: domain,
        },
        updateTime,
      });
      logger.log(`storeInitialData: access token saved for account: ${doc.id}`);
    } else {
      logger.error(`storeInitialData: account not found: ${accountId}`);
      return false;
    }

    const storeRef = db.collection("platformStores").doc();
    batch.set(storeRef, {
      accountId,
      accessToken,
      updateTime,
      id: shopId,
      subdomain: domain,
      shop: shop,
      type: "shopify",
      webhooks,
    });
    logger.log("Access token saved for platform store");

    if (products && products.length > 0) {
      products.forEach((product: any) => {
        const newDocRef = db.collection("products").doc();
        const productData = {
          id: newDocRef.id,
          shopId: shopId,
          accountId,
          type: "shopify",
          description: product.body_html,
          price: product.variants[0].price,
          productId: product.id,
          images: product.images,
          options: product.options,
          status: product.status,
          tags: product.tags,
          title: product.title,
          productType: product.product_type,
          variants: product.variants,
          vendor: product.vendor,
          updateTime: updateTime,
        };

        batch.set(newDocRef, productData);
      });
    } else {
      logger.error("storeInitialData: no products");
    }
    await batch.commit();
    return true;
  } catch (error) {
    logger.error("Error checking Shopify store:", error);
    return false;
  }
}

/**
 * registeres the shopify webhook for uninstallation
 * @param {string} topic - webhook topic
 * @param {string} functionName - function name
 * @param {string} shop - shop domain
 * @param {string} accessToken - shopify accessToken
 */
async function registerWebhook(
  topic: string, functionName: string, shop: string, accessToken: string) {
  try {
    await axios.post(`https://${shop}/admin/api/2024-01/webhooks.json`, {
      webhook: {
        topic: topic,
        address: `https://us-central1-arvo-prod.cloudfunctions.net/shopify${functionName}`,
        format: "json",
      },
    }, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });
    logger.info(`Webhook registered for ${topic}`);
  } catch (error) {
    logger.error(error);
  }
}

/**
 * verifies the shopify webhook
 * @param {any} req - req
 * @param {string} secret - shopify secret
 * @return {boolean} value if hmac is correct
 */
function verifyWebhook(req: any, secret: string): boolean {
  const hmacHeader = req.get("X-Shopify-Hmac-Sha256");

  if (!hmacHeader || !req.rawBody) {
    logger.error("verifyWebhook: Missing HMAC header or raw body");
    return false;
  } else if (!secret) {
    logger.error("verifyWebhook: Missing secret");
  }

  const generatedHmac = crypto
    .createHmac("sha256", secret)
    .update(req.rawBody, "utf8")
    .digest("base64");

  if (hmacHeader !== generatedHmac) {
    logger.error("original hmac: " + hmacHeader);
    logger.error("generated hmac: " + generatedHmac);
  }
  return generatedHmac === hmacHeader;
}

/**
 * Retrieves the access token for the specified shop.
 * @param {string} shopId - store id
 * @return {Promise<any>} A promise that resolves to the access token.
 */
export async function getAccessToken(shopId: string):
  Promise<any> {
  try {
    const storeSnapshot = await db.collection("platformStores")
      .where("id", "==", shopId)
      .limit(1)
      .get();

    if (storeSnapshot.empty) {
      logger.log(`getAccessToken: Store not found: ${shopId}`);
      return null;
    } else {
      const data = storeSnapshot.docs[0].data();
      return data.accessToken;
    }
  } catch (error) {
    logger.error("getAccessToken: ", error);
    throw new HttpsError("internal", "Error occurred");
  }
}

export const onAppUninstall = onRequest(
  {secrets: [shopifyApiKey, shopifyApiSecret]},
  async (req, res) => {
    corsHandler(req, res, async () => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");

      // Verify that the request came from Shopify
      if (!verifyWebhook(req, shopifyApiSecret.value())) {
        logger.error("Shopify HMAC verification failed.");
        res.status(403).send("Forbidden");
        return;
      }

      const shopDomain = req.body.myshopify_domain;
      const shopId = req.body.id;
      try {
        const accountId = await getAccountIdByShopId(shopId);
        if (!accountId) {
          logger.error(`onAppUninstall: Account not found for ${shopDomain}`);
          res.status(404).send("Account not found");
          return;
        }

        const batch = db.batch();
        const accountRef = admin.firestore().collection("accounts")
          .doc(accountId.toString());

        batch.update(accountRef, {[`platformStores.${shopId}`]:
          admin.firestore.FieldValue.delete(),
        });

        const productsSnapshot = await db.collection("products")
          .where("shopId", "==", shopId)
          .get();

        if (productsSnapshot.empty) {
          logger.log(`No products found for shopId: ${shopId}`);
        } else {
          // Use a batch to delete all products associated with the shopId
          productsSnapshot.forEach((doc: any) => {
            batch.delete(doc.ref);
          });
        }

        const storeSnapshot = await db.collection("platformStores")
          .where("id", "==", shopId)
          .limit(1)
          .get();

        if (storeSnapshot.empty) {
          logger.log(`Store not found: ${shopId}`);
        } else {
          logger.log(`Store ${shopId} removed`);
          batch.delete(storeSnapshot.docs[0].ref);
        }

        await batch.commit();
        logger.info(`onAppUninstall: Db update for ${shopDomain} done.`);
      } catch (error) {
        logger.error(`Error deleting store data for ${shopDomain}:`, error);
        res.status(500).send("Error cleaning up store data");
        return;
      }

      // TODO logic for canceling subscription

      // Respond with success
      logger.info(`onAppUninstall: completed - ${shopDomain}`);
      res.status(200).send("Uninstall webhook handled");
    });
  });

/**
 * registeres the shopify webhook for uninstallation
 * @param {string} shopId - shopify shopId
 * @return {any} accountId or null
 */
async function getAccountIdByShopId(shopId: string): Promise<any> {
  try {
    const accountsRef = db.collection("accounts");
    const querySnapshot = await accountsRef
      .where(`platformStores.${shopId}`, "!=", null)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      logger.error("getAccountIdByShopId: account not found. shopId:", shopId);
      return null;
    }
    logger.log(`***getAccountIdByShopId: done: ${querySnapshot.docs[0].id}`);
    return querySnapshot.docs[0].id;
  } catch (error) {
    logger.error(`Error in getAccountIdByShop: ${error}`);
    return null;
  }
}

export const onProductsCreate = onRequest(
  {secrets: [shopifyApiSecret]},
  async (req, res) => {
    corsHandler(req, res, async () => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");

      // Verify that the request came from Shopify
      if (!verifyWebhook(req, shopifyApiSecret.value())) {
        logger.error("Shopify HMAC verification failed.");
        res.status(403).send("Forbidden");
        return;
      }

      const product = req.body;
      const productId = product.id;
      if (!productId) {
        res.status(400).send("Product ID is missing");
        return;
      }

      try {
        const productRef = db.collection("products").doc();
        const productData = {
          id: productRef.id,
          description: product.body_html,
          price: product.variants[0].price,
          productId: product.id,
          images: product.images,
          options: product.options,
          status: product.status,
          tags: product.tags,
          title: product.title,
          type: product.product_type,
          variants: product.variants,
          vendor: product.vendor,
          updateTime: admin.firestore.FieldValue.serverTimestamp(),
        };

        await productRef.set(productData);
        res.status(200).send(`Product ${productId} updated.`);
      } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).send("Internal Server Error");
      }

      // Respond with success
      res.status(200).send("Uninstall webhook handled");
    });
  });

export const onProductsUpdate = onRequest(
  {secrets: [shopifyApiSecret]},
  async (req, res) => {
    corsHandler(req, res, async () => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");

      // Verify that the request came from Shopify
      if (!verifyWebhook(req, shopifyApiSecret.value())) {
        logger.error("Shopify HMAC verification failed.");
        res.status(403).send("Forbidden");
        return;
      }

      const product = req.body;
      const productId = product.id;
      if (!productId) {
        res.status(400).send("Product ID is missing");
        return;
      }

      try {
        const snapshot = await db.collection("products")
          .where("productId", "==", productId)
          .limit(1)
          .get();

        if (snapshot.empty) {
          logger.error(`Product ${productId} not found`);
          res.status(404).send(`Product ${productId} not found`);
          return;
        }

        const productData = {
          description: product.body_html,
          price: product.variants[0].price,
          productId: product.id,
          images: product.images,
          options: product.options,
          status: product.status,
          tags: product.tags,
          title: product.title,
          type: product.product_type,
          variants: product.variants,
          vendor: product.vendor,
          updateTime: admin.firestore.FieldValue.serverTimestamp(),
        };

        await snapshot.docs[0].ref.update(productData);
        res.status(200).send(`Product ${productId} updated.`);
      } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).send("Internal Server Error");
      }

      // Respond with success
      res.status(200).send("Uninstall webhook handled");
    });
  });

export const onProductsDelete = onRequest(
  {secrets: [shopifyApiSecret]},
  async (req, res) => {
    corsHandler(req, res, async () => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");

      // Verify that the request came from Shopify
      if (!verifyWebhook(req, shopifyApiSecret.value())) {
        logger.error("Shopify HMAC verification failed.");
        res.status(403).send("Forbidden");
        return;
      }

      const product = req.body;
      const productId = product.id;
      if (!productId) {
        res.status(400).send("Product ID is missing");
        return;
      }

      try {
        const snapshot = await db.collection("products")
          .where("productId", "==", productId)
          .limit(1)
          .get();

        if (snapshot.empty) {
          logger.error(`Product ${productId} not found`);
          res.status(404).send(`Product ${productId} not found`);
          return;
        }

        await snapshot.docs[0].ref.delete();
        res.status(200).send(`Product ${productId} deleted.`);
      } catch (error) {
        logger.error("Error deleting product:", error);
        res.status(500).send("Internal Server Error");
      }

      // Respond with success
      res.status(200).send("Uninstall webhook handled");
    });
  });

export const addWebhook = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    const {topic, functionName, shop, shopId} = req.body.data;
    if (!shop || !shopId || !topic || !functionName) {
      logger.error(`Parameters missing: ${shop} - ${shopId} -
      ${topic} - ${functionName}`);
      return;
    }

    const accessToken = await getAccessToken(shopId);
    if (accessToken) {
      await registerWebhook(topic, functionName, shop, accessToken);
    } else {
      logger.error(`Access token missing for: ${shopId}`);
    }
  });
});

export const deleteWebhook = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    const {shop, shopId, webhookId} = req.body.data;
    if (!shop || !shopId || !webhookId) {
      logger.error(`Parameters missing: ${shop} - ${shopId} - ${webhookId}`);
      return;
    }

    const accessToken = await getAccessToken(shopId);
    if (accessToken) {
      const endpoint = `https://${shop}/admin/api/2024-01/webhooks/${webhookId}.json`;
      const headers = {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
      };
      try {
        await axios.delete(endpoint, headers);
        const storeSnapshot = await db.collection("platformStores")
          .where("id", "==", shopId)
          .limit(1)
          .get();

        if (storeSnapshot.empty) {
          logger.error(`Store not found / webhook not removed: ${shopId}`);
        } else {
          const storeDocRef = storeSnapshot.docs[0].ref;
          // const storeData = (await storeRef.get()).data();
          // const data = storeSnapshot.docs[0].data();

          // await storeRef.update(storeRef, {
          //   webhooks: admin.firestore.FieldValue.arrayRemove()
          // });

          // const storeDocRef = db.collection('platformStores')
          // .doc(`shopify-${shopId}`);
          const storeDoc = await storeDocRef.get();
          if (!storeDoc.exists) {
            res.status(404).send(`Store ${shopId} not found`);
            return;
          }

          const storeData = storeDoc.data();
          if (!storeData || !storeData.webhooks) {
            res.status(404).send(`No webhooks found for store ${shopId}`);
            logger.error(`No webhooks found for shopify store ${shopId}`);
            return;
          }

          const updatedWebhooks = storeData.webhooks
            .filter((webhook: any) => webhook.id !== webhookId);
          await storeDocRef.update({
            webhooks: updatedWebhooks,
          });
        }
        logger.info(`Webhook ${webhookId} deleted for ${shop}`);
      } catch (error) {
        logger.error(error);
      }
    } else {
      logger.error(`Access token missing for: ${shopId}`);
    }
  });
});

export const getWebhooks = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    const {shopId, shop} = req.body.data;
    if (!shopId || !shop) {
      logger.error(`Parameters missing: ${shop} - ${shopId}`);
      res.status(400).send("CF: getWebhooks - Missing parameters");
      return;
    }
    const accessToken = await getAccessToken(shopId);
    if (!accessToken) {
      logger.error("Missing access token");
      res.status(400).send("CF: getWebhooks - Missing access token");
      return;
    }
    // const list = await fetchWebhooks(shop, accessToken);
    // if (!list || list.length == 0) {
    //   logger.error("webhooks not found");
    // } else {
    //   logger.info(list);
    //   return list;
    // }
    const headers = {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    };

    const endpoint = `https://${shop}/admin/api/2024-01/webhooks.json`;
    let result;

    try {
      const axiosResponse = await axios.get(endpoint, headers);

      if (axiosResponse.data && axiosResponse.data.webhooks) {
        result = axiosResponse.data.webhooks;
      }
      res.status(200).send({data: result});
      return result;
    } catch (error) {
      logger.error(`CF: an error with shopify webhooks: ${shop}`);
      res.status(500).send(`CF: an error with shopify webhooks: ${shop}`);
      return;
    }
  });
});

// export const getProducts = onRequest(async (req, res) => {
//   corsHandler(req, res, async () => {
//     res.set("Access-Control-Allow-Origin", "*");
//     res.set("Access-Control-Allow-Methods", "GET, POST");
//     res.set("Access-Control-Allow-Headers", "Content-Type");

//     const {shopId, shop} = req.body.data;
//     if (!shopId || !shop) {
//       logger.error(`Parameters missing: ${shop} - ${shopId}`);
//       res.status(400).send("CF: getProducts - Missing parameters");
//       return;
//     }
//     const accessToken = await getAccessToken(shopId);
//     if (!accessToken) {
//       logger.error("Missing access token");
//       res.status(400).send("CF: getProducts - Missing access token");
//       return;
//     }
//     const headers = {
//       headers: {
//         "Content-Type": "application/json",
//         "X-Shopify-Access-Token": accessToken,
//       },
//     };

//     const endpoint = `https://${shop}/admin/api/2024-01/products.json`;
//     let result;

//     try {
//       const axiosResponse = await axios.get(endpoint, headers);

//       if (axiosResponse.data && axiosResponse.data.products) {
//         result = axiosResponse.data;
//       }
//       res.status(200).send({data: result});
//       return result;
//     } catch (error) {
//       res.status(500).send(`CF: an error with shopify products: ${shop}`);
//       return;
//     }
//   });
// });

// webhooks to create
// orders/create **
// orders/updated
// products/create
// products/update ** - done
// products/delete - not tested
// customers/create **
// customer/update

// future webhooks to create
// fulfillments/create
// checkouts/create
// inventory_levels/update
