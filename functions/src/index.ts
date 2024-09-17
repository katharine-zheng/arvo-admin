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

exports.shopifyInitAuth = onRequest(
  {secrets: [shopifyApiKey, shopifyApiSecret]},
  (req, res) => {
    corsHandler(req, res, async () => {
      const {shop, hmac, state} = req.query;
      if (!shop || !hmac || !state) {
        logger.error(`Parameter missing: ${shop} - ${hmac}`);
        res.status(400).send("Parameter missing");
        return;
      }
      logger.log(`state: ${state}`);

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

exports.shopifyAuthCallback = onRequest(
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
      const shopData = await getShopifyShopData(shop.toString(), accessToken);

      await storeShopifyData(state.toString(), accessToken, shopData);
      await registerUninstallWebhook(shop.toString(), accessToken);

      // todo update
      const redirectUrl = "https://arvo-prod.web.app/dashboard";

      res.redirect(302, redirectUrl);
    } catch (error) {
      logger.error("Error exchanging code for access token:", error);
      res.status(500).send("Error during OAuth");
    }
  });

/**
 * Retrieves the access token for the specified shop.
 * @param {string} query - The name of the shop.
 * @param {string} secret - token.
 * @return {any} A promise that resolves to the access token.
 */
export function validateHmac(query: any, secret: string): any {
  const hmac = query.hmac;
  const map = Object.assign({}, query) as {[key: string]: string};
  delete map["hmac"];
  delete map["state"];

  const sortedParams = Object.keys(map).sort();
  const message = sortedParams
    .map((key) => `${key}=${encodeURIComponent(map[key])}`)
    .join("&");

  const generatedHmac = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  return generatedHmac === hmac;
}

/**
 * Retrieves the access token for the specified shop.
 * @param {string} accountId - Account Id
 * @param {string} accessToken - token.
 * @param {string} shopData - shopify shop data.
 * @return {Promise<boolean>} A promise that resolves to the access token.
 */
export async function storeShopifyData(accountId: string,
  accessToken: string, shopData: any): Promise<boolean> {
  try {
    const docRef = db.collection("accounts").doc(accountId);
    const doc = await docRef.get();
    const updateTime = admin.firestore.FieldValue.serverTimestamp();
    const domain = shopData.myshopify_domain;
    const batch = db.batch();

    logger.log(`accountId: ${accountId}`);
    if (doc.exists) {
      batch.update(docRef, {
        [`platformStores.${shopData.id}`]: {
          accessToken,
          updateTime,
          type: "shopify",
          shop: shopData,
          id: shopData.id,
          subdomain: domain,
        },
      });
      logger.log(`Access token saved for account id: ${doc.id}`);
    } else {
      logger.error(`storeShopifyData: account not found: ${accountId}`);
      return false;
    }

    const storeRef = db.collection("platformStores")
      .doc(`shopify-${shopData.id}`);
    batch.set(storeRef, {
      accountId,
      accessToken,
      updateTime,
      id: shopData.id,
      subdomain: domain,
      shop: shopData,
      type: "shopify",
    });
    logger.log("Access token saved for platform store");
    await batch.commit();
    return true;
  } catch (error) {
    logger.error("Error checking Shopify store:", error);
    return false;
  }
}

/**
 * Retrieves the access token for the specified shop.
 * @param {string} storeId - store id
 * @return {Promise<any>} A promise that resolves to the access token.
 */
export async function _getShopifyAccessToken(storeId: string):
  Promise<any> {
  try {
    const docRef = db.collection("platformStores").doc(`shopify-${storeId}`);
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data();
      if (data) {
        return data.accessToken;
      } else {
        logger.error(`_getShopifyAccessToken: token not found: ${storeId}`);
      }
    }

    return null;
  } catch (error) {
    logger.error(error);
    throw new HttpsError("internal", "Error occurred");
  }
}

/**
 * verifies the shopify webhook
 * @param {any} req - req
 * @param {string} secret - shopify secret
 * @return {boolean} value if hmac is correct
 */
function verifyShopifyWebhook(req: any, secret: any): boolean {
  const hmacHeader = req.get("X-Shopify-Hmac-Sha256");

  if (!hmacHeader || !req.rawBody) {
    console.error("Missing HMAC header or raw body");
    return false;
  }

  const generatedHmac = crypto
    .createHmac("sha256", secret)
    .update(req.rawBody, "utf8")
    .digest("base64");

  if (hmacHeader !== generatedHmac) {
    logger.error("generated hmac: " + generatedHmac);
    logger.error("hmacHeader: " + hmacHeader);
  }
  return generatedHmac === hmacHeader;
}

exports.uninstallShopify = onRequest(
  {secrets: [shopifyApiSecret]},
  async (req, res) => {
    corsHandler(req, res, async () => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");

      // Verify that the request came from Shopify
      if (!verifyShopifyWebhook(req, shopifyApiSecret.value())) {
        logger.error("Shopify HMAC verification failed.");
        res.status(403).send("Forbidden");
        return;
      }

      const shopDomain = req.body.myshopify_domain;
      const storeId = req.body.id;
      logger.info(req.body);
      logger.info(`App uninstalled from store: ${shopDomain}`);
      try {
        const accountId = await getAccountIdByShopId(storeId);
        if (!accountId) {
          logger.error(`Account not found: ${shopDomain} id: ${accountId}`);
          res.status(404).send("Account not found");
          return;
        }

        const batch = db.batch();
        const accountRef = admin.firestore().collection("accounts")
          .doc(accountId.toString());

        batch.update(accountRef, {[`platformStores.${storeId}`]:
          admin.firestore.FieldValue.delete(),
        });

        const storeRef = db.collection("platformStores")
          .doc(`shopify-${storeId}`);
        batch.delete(storeRef);
        await batch.commit();
        logger.info(`Store data for ${shopDomain} deleted successfully.`);
      } catch (error) {
        logger.error(`Error deleting store data for ${shopDomain}:`, error);
        res.status(500).send("Error cleaning up store data");
        return;
      }

      // TODO logic for canceling subscription

      // Respond with success
      res.status(200).send("Uninstall webhook handled");
    });
  });

/**
 * registeres the shopify webhook for uninstallation
 * @param {string} shopId - shopify shopId
 * @return {string} accountId
 */
async function getAccountIdByShopId(shopId: string): Promise<any> {
  try {
    const accountsRef = db.collection("accounts");
    const querySnapshot = await accountsRef
      .where(`platformStores.${shopId}`, "!=", null)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      logger.error("getAccountIdByShopId: account not found. storeId:", shopId);
      return null;
    }
    return querySnapshot.docs[0].id;
  } catch (error) {
    logger.error(`Error in getAccountIdByShop: ${error}`);
    return null;
  }
}

/**
 * registeres the shopify webhook for uninstallation
 * @param {string} shop - req
 * @param {string} accessToken - shopify accessToken
 */
async function registerUninstallWebhook(shop: string, accessToken: string) {
  try {
    const response = await axios.post(
      `https://${shop}/admin/api/2024-01/webhooks.json`,
      {
        webhook: {
          topic: "app/uninstalled",
          address: "https://us-central1-arvo-prod.cloudfunctions.net/uninstallShopify",
          format: "json",
        },
      }, {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );
    logger.info("Uninstall webhook registered:", response.data);
  } catch (error) {
    logger.error(error);
  }
}

/**
 * Getting the shopify shop object
 *
 * @param {string} shop shopify domain
 * @param {string} accessToken access token
 * @return {Promise<any>}
 */
export async function getShopifyShopData(shop: string, accessToken: string):
Promise<any> {
  const headers = {
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
  };

  const shopEndpoint = `https://${shop}/admin/api/2023-04/shop.json`;
  let shopData;
  try {
    const axiosResponse = await axios.get(shopEndpoint, headers);
    if (axiosResponse.data && axiosResponse.data.shop) {
      shopData = axiosResponse.data.shop;
    }
    return shopData;
  } catch (error) {
    console.error("Error getting shop details:", error);
    // res.status(500).send("CF: an error occurred with shop details");
    return null;
  }
}

exports.getShopifyProducts = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    const {storeId, shop} = req.body.data;
    if (!storeId || !shop) {
      logger.error(`Required parameter missing: ${shop} - ${storeId}`);
      res.status(400).send("CF: getProducts - Missing parameters");
      return;
    }
    const accessToken = await _getShopifyAccessToken(storeId);
    if (!accessToken) {
      logger.error("Missing access token");
      res.status(400).send("CF: getProducts - Missing access token");
      return;
    }
    const headers = {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
    };

    const endpoint = `https://${shop}/admin/api/2024-01/products.json`;
    let result;

    try {
      const axiosResponse = await axios.get(endpoint, headers);

      if (axiosResponse.data && axiosResponse.data.products) {
        result = axiosResponse.data;
      }
      res.status(200).send({data: result});
      return result;
    } catch (error) {
      res.status(500).send(`CF: an error with shopify products: ${shop}`);
      return;
    }
  });
});
