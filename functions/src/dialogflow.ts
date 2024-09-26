import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {SessionsClient, v3} from "@google-cloud/dialogflow-cx";
import * as logger from "firebase-functions/logger";
import {db} from "./firebase";

const projectId = "arvo-prod";
const location = "us-central1";
const agent = "4b1a865f-eb67-4984-a12b-12d32e7b77f3";

const agentPath = `projects/${projectId}/locations/${location}/agents/${agent}`;
const sessionClient = new SessionsClient({
});

const dialogflowClient = new v3.EntityTypesClient({
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

      // Build the session path for Dialogflow CX
      const sessionPath = sessionClient.projectLocationAgentSessionPath(
        projectId,
        location,
        agent,
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

// /**
//  * listEntityTypes
//  */
// async function listEntityTypes() {
//   const parent = agentPath;

//   const [entityTypes] = await dialogflowClient.listEntityTypes({parent});
//   entityTypes.forEach((entityType) => {
//   });
// }

/**
 * updateDialogflowEntities
 * @param {string} domain - shop domain
 * @param {any} products - shopify product
 */
export async function updateDialogflowEntities(domain: string, products: any) {
  if (!products || products.length === 0) {
    logger.error("updateDialogflowEntities: products missing");
    return;
  } else if (!domain) {
    logger.error("updateDialogflowEntities: domain missing");
    return;
  }

  // Frequency counters for each entity type
  const productCounts: {[key: string]: number} = {};
  const brandCounts: {[key: string]: number} = {};
  const productTypeCounts: {[key: string]: number} = {};
  const productOptionCounts: {[key: string]: number} = {};
  const productVariantCounts: {[key: string]: number} = {};

  // Process each product and extract relevant entities
  for (const product of products) {
    const title = product.title;

    // Track product entity usage
    productCounts[title] = (productCounts[title] || 0) + 1;

    // Track brand (vendor) usage
    if (product.vendor && !isInvalidBrand(product.vendor)) {
      brandCounts[product.vendor] = (brandCounts[product.vendor] || 0) + 1;
    }

    // Track product type usage
    const productType = product.product_type || product.productType;
    if (productType) {
      productTypeCounts[productType] =
        (productTypeCounts[productType] || 0) + 1;
    }

    // Track product options (e.g., color, size) usage
    if (product.options && product.options.length > 0) {
      for (const option of product.options) {
        if (option.name && option.name !== "Title") {
          productOptionCounts[option.name] =
            (productOptionCounts[option.name] || 0) + 1;
        }
      }
    }

    // Track product variants usage (ignoring "Default Title")
    if (product.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        if (variant.title !== "Default Title") {
          const variantName = `${title} ${variant.title}`;
          productVariantCounts[variantName] =
            (productVariantCounts[variantName] || 0) + 1;
        }
      }
    }
  }

  try {
    // Process each entity and update usage counts
    await processEntities(domain, productCounts, "Product");
    await processEntities(domain, brandCounts, "Brand");
    await processEntities(domain, productTypeCounts, "ProductType");
    await processEntities(domain, productOptionCounts, "ProductOptions");
    await processEntities(domain, productVariantCounts, "ProductVariants");

    // Update or create necessary entity types in Dialogflow
    await createOrUpdateEntityType("Product",
      mapEntitiesToDialogflowFormat(Object.keys(productCounts)));
    await createOrUpdateEntityType("Brand",
      mapEntitiesToDialogflowFormat(Object.keys(brandCounts)));
    await createOrUpdateEntityType("ProductType",
      mapEntitiesToDialogflowFormat(Object.keys(productTypeCounts)));
    await createOrUpdateEntityType("ProductOptions",
      mapEntitiesToDialogflowFormat(Object.keys(productOptionCounts)));
    await createOrUpdateEntityType("ProductVariants",
      mapEntitiesToDialogflowFormat(Object.keys(productVariantCounts)));

    logger.info("Dialogflow entities updated successfully");
  } catch (error) {
    logger.error("Error updating Dialogflow entities:", error);
  }
}

/**
 * @param {string[]} entities
 * @return {any[]}
 */
function mapEntitiesToDialogflowFormat(entities: string[]): any[] {
  return entities.map((entity) => ({
    value: entity,
    synonyms: [entity],
  }));
}

/**
 * @param {string} domain
 * @param {any} entityCounts
 * @param {string} entityType
 */
async function processEntities(
  domain: string, entityCounts: any, entityType: string) {
  for (const [entityValue, count] of Object.entries(entityCounts)) {
    await incrementEntityUsage(
      domain, entityType, entityValue, count as number);
  }
}

/**
 * incrementEntityUsage - does not include dialogflow entity updates
 * @param {any[]} domain shop domain
 * @param {string} entityType - entityTypeId
 * @param {string} entityValue - entityValue
 * @param {number} incrementBy - incrementBy
 */
async function incrementEntityUsage(
  domain: string, entityType: string, entityValue: string, incrementBy = 1) {
  const entityRef = db.collection("dialogflowEntity")
    .doc(`${entityType}-${entityValue}`);

  await db.runTransaction(async (transaction) => {
    const entityDoc = await transaction.get(entityRef);

    if (!entityDoc.exists) {
      // Create a new entity usage document with the initial usage count
      transaction.set(entityRef, {
        entityType: entityType,
        entityValue: entityValue,
        usageCount: incrementBy,
        shopDomains: [domain],
      });
    } else {
      const usageData = entityDoc.data();
      const currentUsageCount = usageData?.usageCount || 0;
      const newUsageCount = currentUsageCount + incrementBy;
      const updatedShopDomains = usageData?.shopDomains || [];
      if (!updatedShopDomains.includes(domain)) {
        updatedShopDomains.push(domain);
      }

      transaction.update(entityRef, {
        usageCount: newUsageCount,
        shopDomains: updatedShopDomains,
      });
    }
  });
}

/**
 * Helper function to create or update an entity type in Dialogflow
 * @param {string} displayName - entity type
 * @param {any[]} newEntities - new entities
 */
async function createOrUpdateEntityType(
  displayName: string, newEntities: any[]) {
  // Check if the entity type exists, or create it if it doesn’t
  let entityTypeId = await getEntityTypeIdByDisplayName(displayName);
  if (!entityTypeId) {
    entityTypeId = await createEntityType(displayName);
  }

  const entityTypeResourceName = `${entityTypeId}`;

  // Fetch existing entities for the entity type
  const [existingEntityType] = await dialogflowClient
    .getEntityType({name: entityTypeResourceName});
  const existingEntities = existingEntityType.entities || [];

  // Merge new entities with existing ones
  const mergedEntities = mergeEntities(existingEntities, newEntities);

  // Update the entity type with the merged list of entities
  const request = {
    entityType: {
      name: entityTypeResourceName,
      entities: mergedEntities,
    },
    updateMask: {
      paths: ["entities"],
    },
  };

  await dialogflowClient.updateEntityType(request);
}

/**
 * @param {string} displayName - entity type
 */
async function getEntityTypeIdByDisplayName(displayName: string) {
  const parent = agentPath;

  // List all entity types
  const [entityTypes] = await dialogflowClient.listEntityTypes({parent});

  // Find the entity type by display name
  const entityType = entityTypes
    .find((type) => type.displayName === displayName);

  if (entityType) {
    return entityType.name;
  } else {
    logger.info(`Entity with displayName "${displayName}" not found.`);
    return null; // Return null if not found
  }
}

/**
 * @param {string} displayName - entity type
 */
async function createEntityType(displayName: string) {
  const parent = agentPath;

  const [createdEntityType] = await dialogflowClient.createEntityType({
    parent,
    entityType: {
      displayName, // Display name for the entity type (e.g., "Product")
      kind: "KIND_MAP", // KIND_MAP is used for typical entities like products
    },
  });

  return createdEntityType.name;
}

/**
 * Function to merge existing entities with new entities
 * (ensures no duplicates)
 * @param {any[]} existingEntities - any
 * @param {any[]} newEntities - any
 * @return {any[]} mergedEntities
 */
function mergeEntities(existingEntities: any[], newEntities: any[]): any[] {
  const newEntitiesArray = Array
    .isArray(newEntities) ? newEntities : [newEntities];

  const mergedEntities = [...existingEntities];

  newEntitiesArray.forEach((newEntity) => {
    // Check if the new entity already exists
    const existingEntity = existingEntities
      .find((e) => e.value === newEntity.value);
    if (!existingEntity) {
      // If not, add it to the merged list
      mergedEntities.push(newEntity);
    } else {
      // If it exists, update the synonyms
      existingEntity.synonyms = Array
        .from(new Set([...existingEntity.synonyms, ...newEntity.synonyms]));
    }
  });

  return mergedEntities;
}

/**
 * compareEntities
 * @param {any} newProduct - newProduct
 * @param {any[]} oldProduct - oldProduct
 */
export async function compareEntities(newProduct: any, oldProduct: any) {
  // Check if title has changed
  const domain = newProduct.shopDomain;
  if (oldProduct.title !== newProduct.title) {
    await handleEntityUpdate(
      domain, "Product", oldProduct.title, newProduct.title);
  }

  // Check if vendor (brand) has changed
  if (oldProduct.vendor !== newProduct.vendor) {
    await handleEntityUpdate(
      domain, "Brand", oldProduct.vendor, newProduct.vendor);
  }

  // Check if product type has changed
  if (oldProduct.productType !== newProduct.productType) {
    await handleEntityUpdate(
      domain, "ProductType", oldProduct.productType, newProduct.productType);
  }

  // Check if options have changed
  const oldOptions = oldProduct.options
    .map((option: any) => option.name).join(",");
  const newOptions = newProduct.options
    .map((option: any) => option.name).join(",");

  if (oldOptions !== newOptions) {
    // Handle options removal and increment new options
    await handleOptionsUpdate(domain, oldProduct.options, newProduct.options);
  }

  // Check if variants have changed
  const oldVariants = oldProduct.variants
    .map((variant: any) => variant.title).join(",");
  const newVariants = newProduct.variants
    .map((variant: any) => variant.title).join(",");

  if (oldVariants !== newVariants) {
    await handleVariantsUpdate(
      domain, oldProduct.variants, newProduct.variants);
  }
}

/**
 * Helper function decrements or removes
 * the old entity and increments or adds the new entity.
 * @param {string} domain shop domain
 * @param {string} entityType entityType
 * @param {string} oldValue oldValue
 * @param {string} newValue newValue
 */
async function handleEntityUpdate(
  domain: string, entityType: string, oldValue: string, newValue: string) {
  if (oldValue && oldValue !== newValue) {
    // Decrement the old entity
    await decrementEntityUsage(domain, entityType, oldValue, 1);
  }

  if (newValue && oldValue !== newValue) {
    // Increment the new entity
    await incrementEntityUsage(domain, entityType, newValue, 1);
    await createOrUpdateEntityType(entityType, [{
      value: newValue,
      synonyms: [newValue],
    }]);
  }
}

/**
 * handleOptionsUpdate
 * @param {any[]} domain shop domain
 * @param {any[]} oldOptions oldOptions
 * @param {any[]} newOptions newOptions
 */
async function handleOptionsUpdate(
  domain: string, oldOptions: any[], newOptions: any[]) {
  const oldOptionNames = oldOptions.map((option) => option.name);
  const newOptionNames = newOptions.map((option) => option.name);

  // Decrement removed options
  for (const oldOption of oldOptionNames) {
    if (!newOptionNames.includes(oldOption)) {
      await decrementEntityUsage(domain, "ProductOptions", oldOption, 1);
    }
  }

  // Increment added options
  for (const newOption of newOptionNames) {
    if (!oldOptionNames.includes(newOption)) {
      await incrementEntityUsage(domain, "ProductOptions", newOption);
      await createOrUpdateEntityType("ProductOptions", [{
        value: newOption,
        synonyms: [newOption],
      }]);
    }
  }
}

/**
 * handleVariantsUpdate
 * @param {any[]} domain shop domain
 * @param {any[]} oldVariants oldVariants
 * @param {any[]} newVariants newVariants
 */
async function handleVariantsUpdate(
  domain: string, oldVariants: any[], newVariants: any[]) {
  const oldVariantTitles = oldVariants.map((variant) => variant.title);
  const newVariantTitles = newVariants.map((variant) => variant.title);

  // Decrement removed variants
  for (const oldVariant of oldVariantTitles) {
    if (!newVariantTitles.includes(oldVariant)) {
      await decrementEntityUsage(domain, "ProductVariants", oldVariant, 1);
    }
  }

  // Increment added variants
  for (const newVariant of newVariantTitles) {
    if (!oldVariantTitles.includes(newVariant)) {
      await incrementEntityUsage(domain, "ProductVariants", newVariant);
      await createOrUpdateEntityType("ProductVariants", [{
        value: newVariant,
        synonyms: [newVariant],
      }]);
    }
  }
}

/**
 * Function to check if an entity
 * (brand, product type, option) is still in use
 * @param {any[]} productList products
 */
export async function cleanUpEntities(productList: any[]) {
  const products = new Map<string, number>();
  const brands = new Map<string, number>();
  const productTypes = new Map<string, number>();
  const productOptions = new Map<string, number>();
  const productVariants = new Map<string, number>();

  if (!productList || productList.length === 0) {
    logger.warn("cleanUpEntities: nothing to clean up");
  }

  const domain = productList[0].shopDomain;

  productList.forEach((product) => {
    // Track product title and increment count
    const productTitle = product.title;
    products.set(productTitle,
      (products.get(productTitle) || 0) + 1);

    // Track product variants and increment count
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach((variant: any) => {
        if (variant.title !== "Default Title") {
          const variantName = `${product.title} ${variant.title}`;
          productVariants.set(variantName,
            (productVariants.get(variantName) || 0) + 1);
        }
      });
    }

    // Track brand (vendor) and increment count
    if (product.vendor && !isInvalidBrand(product.vendor)) {
      brands.set(product.vendor,
        (brands.get(product.vendor) || 0) + 1);
    }

    // Track product type and increment count
    if (product.productType) {
      productTypes.set(product.productType,
        (productTypes.get(product.productType) || 0) + 1);
    }

    // Track product options and increment count
    if (product.options && product.options.length > 0) {
      product.options.forEach((option: any) => {
        if (option.name && option.name !== "Title") {
          productOptions.set(option.name,
            (productOptions.get(option.name) || 0) + 1);
        }
      });
    }
  });

  for (const [productTitle, count] of products.entries()) {
    await decrementEntityUsage(domain, "Product", productTitle, count);
  }

  for (const [variantTitle, count] of productVariants.entries()) {
    await decrementEntityUsage(domain, "ProductVariants", variantTitle, count);
  }

  for (const [brand, count] of brands.entries()) {
    await decrementEntityUsage(domain, "Brand", brand, count);
  }

  for (const [productType, count] of productTypes.entries()) {
    await decrementEntityUsage(domain, "ProductType", productType, count);
  }

  for (const [option, count] of productOptions.entries()) {
    await decrementEntityUsage(domain, "ProductOptions", option, count);
  }
}

/**
 * decrementEntityUsage - includes dialogflow update
 * @param {string} domain - shop domain
 * @param {string} entityType - entityTypeId
 * @param {string} entityValue - entityValue
 * @param {number} decrementBy - entityValue
 */
async function decrementEntityUsage(domain: string,
  entityType: string, entityValue: string, decrementBy: number) {
  const entityRef = db.collection("dialogflowEntity")
    .doc(`${entityType}-${entityValue}`);

  await db.runTransaction(async (transaction) => {
    const entityDoc = await transaction.get(entityRef);

    if (!entityDoc.exists) {
      logger.warn(`NOT FOUND: ${entityType}-${entityValue}`);
      return;
    }

    const usageData = entityDoc.data();
    const currentUsageCount = usageData?.usageCount || 0;
    const newUsageCount = currentUsageCount - decrementBy;
    let updatedShopDomains = usageData?.shopDomains || [];
    updatedShopDomains = updatedShopDomains.filter((d: string) => d !== domain);

    if (newUsageCount <= 0 && updatedShopDomains.length === 0) {
      // If usage reaches zero or below, remove the entity
      transaction.delete(entityRef);

      // Remove from Dialogflow
      await removeEntityFromDialogflow(entityType, entityValue);
    } else {
      // Otherwise, update the usage count
      transaction.update(entityRef, {
        usageCount: newUsageCount,
        shopDomains: updatedShopDomains,
      });
    }
  });
}

/**
 * Helper function to remove a product from Dialogflow entities
 * Helper function to handle cleanup for brand, product type, and options
 * (e.g., brand, product type, option)
 * @param {string} entityType - entityType
 * @param {string} entityValue - entityValue
 */
async function removeEntityFromDialogflow(
  entityType: string, entityValue: string) {
  const entityTypeId = await getEntityTypeIdByDisplayName(entityType);

  if (!entityTypeId) {
    logger.warn(`EntityType ${entityType} not in Dialogflow.`);
    return;
  }

  if (entityType === "ProductType" && entityValue === "snowboard") {
    logger.info("remove: ProductType-snowboard");
  } else if (entityType === "Brand" &&
    (entityValue === "Hydrogen Vendor" || entityValue === "Snowboard Vendor")) {
    logger.info(`remove: Brand-${entityValue}`);
  }

  const entityTypeResourceName = `${entityTypeId}`;

  // Fetch the existing entity type from Dialogflow
  const [existingEntityType] = await dialogflowClient
    .getEntityType({name: entityTypeResourceName});
  const existingEntities = existingEntityType.entities || [];

  // Filter out the entity that needs to be removed
  const updatedEntities = existingEntities
    .filter((entity) => entity.value !== entityValue);

  // Update Dialogflow with the updated list of entities
  const request = {
    entityType: {
      name: entityTypeResourceName,
      entities: updatedEntities,
    },
    updateMask: {
      paths: ["entities"],
    },
  };

  // Apply the update to Dialogflow
  await dialogflowClient.updateEntityType(request);
}

/**
 * Helper function to check if the brand name is invalid
 * @param {string} brand - brandName
 * @return {boolean} value if brandName is valid
 */
export function isInvalidBrand(brand: string): boolean {
  // Regex for default Shopify patterns
  const invalidPatterns = [/quickstart/i, /\d{8}/];
  return invalidPatterns.some((pattern) => pattern.test(brand));
}
