import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {SessionsClient, v3} from "@google-cloud/dialogflow-cx";
import * as logger from "firebase-functions/logger";

// import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
// const client = new SecretManagerServiceClient();

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
      logger.info(`${projectId} - ${location} - ${agent} - ${sessionId}`);

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

// /**
//  * listEntityTypes
//  */
// async function listEntityTypes() {
//   const parent = agentPath;

//   const [entityTypes] = await dialogflowClient.listEntityTypes({parent});
//   logger.log("Entity types:");
//   entityTypes.forEach((entityType) => {
//     logger.log(`${entityType.displayName} - ${entityType.name}`);
//   });
// }

/**
 * Firebase Cloud Function triggered by Shopify webhook
 * (e.g., products/update)
 * @param {any} products - shopify product
 */
export async function updateDialogflowEntities(products: any) {
  try {
    // Ensure products exist in the request
    if (!products || products.length === 0) {
      logger.error("Product data missing");
      return;
    }

    // Initialize arrays for different entity types
    const productEntities: any[] = [];
    const brandEntities: any[] = [];
    const productTypeEntities: any[] = [];
    const productOptionEntities: any[] = [];

    // Process each product and extract relevant entities
    products.forEach((product: any) => {
      // Add product title to product entities
      productEntities.push({
        value: product.title,
        synonyms: [product.title,
          `${product.title} ${product.variants[0].title}`],
      });

      // Add brand to brand entities
      if (product.vendor) {
        brandEntities.push({
          value: product.vendor,
          synonyms: [product.vendor],
        });
      }

      // Add product type to product type entities
      if (product.product_type) {
        productTypeEntities.push({
          value: product.product_type,
          synonyms: [product.product_type],
        });
      }

      // Add product options (e.g., color, size) to product options entities
      if (product.options && product.options.length > 0) {
        product.options.forEach((option: any) => {
          productOptionEntities.push({
            value: option.name,
            synonyms: option.values,
          });
        });
      }
    });

    // Update or create necessary entity types for each category
    await createOrUpdateEntityType("Product", productEntities);
    await createOrUpdateEntityType("Brand", brandEntities);
    await createOrUpdateEntityType("ProductType", productTypeEntities);
    await createOrUpdateEntityType("ProductOptions", productOptionEntities);

    logger.info("Product entities updated successfully");
  } catch (error) {
    logger.error("Error updating Dialogflow entities:", error);
  }
}

/**
 * Helper function to create or update an entity type in Dialogflow
 * @param {string} displayName - entity type
 * @param {any[]} newEntities - new entities
 */
async function createOrUpdateEntityType(
  displayName: string, newEntities: any[]) {
  // Check if the entity type exists, or create it if it doesn"t
  let entityTypeId = await getEntityTypeIdByDisplayName(displayName);
  if (!entityTypeId) {
    // If entity type doesn"t exist, create it
    entityTypeId = await createEntityType(displayName);
  }

  const entityTypeResourceName = `${entityTypeId}`;

  // Fetch existing entities for the entity type
  const [existingEntityType] = await dialogflowClient
    .getEntityType({name: entityTypeResourceName});
  const existingEntities = existingEntityType.entities || [];

  // Merge the new entities with the existing ones
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

  const [response] = await dialogflowClient.updateEntityType(request);
  logger.log(`Updated ${displayName} entities:`, response);
}

// export async function updateDialogflowEntities(products: any) {
//   logger.info("updateDialogflowEntities");
//   await listEntityTypes();
//   try {
//     // Update or add product entities
//     const title = product.title;
//     const resourceName = `${agentPath}/entityTypes/${entityTypeId}`;
//     logger.info(`resourceName: ${resourceName}`);
//     await updateEntityType(resourceName, {
//       value: title,
//       synonyms: [title, `${title} ${product.variants[0].title}`],
//     });
//     // res.status(200).send("Entities updated successfully");
//   } catch (error) {
//     logger.error("Error updating Dialogflow entities:", error);
//     // res.status(500).send("Error updating entities");
//   }
//   return;
// }

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
    logger.log(`Entity type with displayName "${displayName}" not found.`);
    return null; // Return null if not found
  }
}

/**
 * @param {string} displayName - entity type
 */
async function createEntityType(displayName: string) {
  const parent = agentPath;

  logger.log(`Creating new entity type: ${displayName}`);

  const [createdEntityType] = await dialogflowClient.createEntityType({
    parent,
    entityType: {
      displayName, // Display name for the entity type (e.g., "Product")
      kind: "KIND_MAP", // KIND_MAP is used for typical entities like products
    },
  });

  logger.log(`Entity type ${displayName} -
    resource name: ${createdEntityType.name}`);
  return createdEntityType.name;
}

// /**
//  * @param {string} resourceName - entity type
//  * @param {any} newEntities - any
//  */
// async function updateEntityType(resourceName: string, newEntities: any) {
//   logger.info("updateEntityType: " + resourceName);

//   // Fetch existing entities, if any
//   const [existingEntityType] = await dialogflowClient
//     .getEntityType({name: resourceName});
//   const existingEntities = existingEntityType.entities || [];

//   // Merge existing entities with new entities
//   const mergedEntities = mergeEntities(existingEntities, newEntities);

//   // Update Dialogflow entity type with the merged list of entities
//   const request = {
//     entityType: {
//       name: resourceName,
//       entities: mergedEntities,
//     },
//     updateMask: {
//       paths: ["entities"],
//     },
//   };

//   const [response] = await dialogflowClient.updateEntityType(request);
//   logger.log(`Updated ${resourceName} entities:`, response);
// }

/**
 * Function to merge existing entities with new entities
 * (ensures no duplicates)
 * @param {any[]} existingEntities - any
 * @param {any[]} newEntities - any
 * @return {any[]} mergedEntities
 */
function mergeEntities(existingEntities: any[], newEntities: any[]): any[] {
  logger.info("mergeEntities");
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

  logger.info(mergedEntities);
  return mergedEntities;
}
