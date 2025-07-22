import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import {
  ADD_DISTRICT_EVENT,
  ADD_PRODUCT_EVENT,
  REMOVE_DISTRICT_EVENT,
  REMOVE_PRODUCT_EVENT,
  UPDATE_DISTRICT_EVENT
} from '@ps-refarch/district-settings';
import { EventBridgeEvent } from 'aws-lambda';
import { ProductConfig } from '../cdk/lib/main-stack-props';
import {
  Folder,
  Product,
  Tenant,
  TenantProduct,
  TenantType,
  User
} from '../util/db-schema';
import { getExpirationTimestamp, getProductByCode } from '../util/db-utils';

export const FTP_PRODUCT_SHORT_NAME = 'FTP';
export const SOURCE_US = 'handle-district-settings.ts';

// Initialize Logger
const logger = new Logger({
  serviceName: 'district-settings-service',
  logLevel: process.env.LOG_LEVEL || ('INFO' as any)
});

// Initialize Tracer
const tracer = new Tracer({
  serviceName: 'district-settings-service'
});

interface DistrictSettingsEvent {
  districtUid: string; // '4ffa60b1-6763-40e4-a1e4-c2174641db07';
  districtName: string; // 'Portfolio Innovation Manual Testing 1 - Groot';
  product: string; // 'SIS';
  districtProducts: {
    productName: string; // 'SmartFind Express';
    productUid: string; // '1127b363-5a9e-4272-8b4d-4175c7215412';
    productShortName: string; // 'SFE';
  }[];
}

async function addUpdateDistrict(props: {
  existingTenant?: TenantType;
  districtUid: string;
  districtName: string;
}): Promise<void> {
  const { existingTenant, districtUid, districtName } = props;

  if (existingTenant) {
    // Update existing tenant
    logger.info('Updating existing tenant', { districtUid });

    await Tenant.update({
      id: districtUid,
      name: districtName || existingTenant.name,
      active: true,
      expires: 0, // No expiration for active tenants
      source: SOURCE_US
    });

    logger.info('Successfully updated tenant', { districtUid });
  } else {
    // Create new tenant
    logger.info('Creating new tenant', { districtUid });

    await Tenant.create({
      id: districtUid,
      name: districtName || 'Unknown District',
      source: SOURCE_US
    });

    logger.info('Successfully created tenant', { districtUid });
  }
}

/**
 * Reactivates all tenant-related entities that may have been previously deactivated
 * This includes TenantProduct, User, and Folder entities
 */
export async function reactivateTenantEntities(props: {
  tenantId: string;
}): Promise<void> {
  const { tenantId } = props;

  logger.info('Reactivating tenant-related entities', { tenantId });

  // Reactivate all TenantProduct entities for this tenant
  const tenantProducts = await TenantProduct.find({
    tenantId
  });

  if (tenantProducts.length > 0) {
    logger.info(
      `Found ${tenantProducts.length} TenantProduct entities to reactivate`
    );

    await Promise.all(
      tenantProducts.map(async (tp) => {
        await TenantProduct.update({
          tenantId: tp.tenantId,
          productId: tp.productId,
          productCode: tp.productCode,
          active: true,
          expires: 0, // Clear expiration
          source: SOURCE_US
        });
      })
    );

    logger.info(
      `Successfully reactivated ${tenantProducts.length} TenantProduct entities`
    );
  }

  // Reactivate User entities for this tenant
  const users = await User.find({
    tenantId
  });

  if (users.length > 0) {
    logger.info(`Found ${users.length} User entities to reactivate`);

    await Promise.all(
      users.map(async (user) => {
        await User.update({
          tenantId: user.tenantId,
          id: user.id,
          active: true,
          expires: 0, // Clear expiration
          source: SOURCE_US
        });
      })
    );

    logger.info(`Successfully reactivated ${users.length} User entities`);
  }

  // Reactivate Folder entities for this tenant
  const folders = await Folder.find({
    tenantId
  });

  if (folders.length > 0) {
    logger.info(`Found ${folders.length} Folder entities to reactivate`);

    await Promise.all(
      folders.map(async (folder) => {
        await Folder.update({
          tenantId: folder.tenantId,
          id: folder.id,
          active: true,
          expires: 0, // Clear expiration
          source: SOURCE_US
        });
      })
    );

    logger.info(`Successfully reactivated ${folders.length} Folder entities`);
  }

  logger.info('Successfully reactivated all tenant-related entities', {
    tenantId
  });
}

/**
 * Adds a product to a district by creating a TenantProduct record
 * First finds the Product entity by productCode, then creates the relationship
 * If the relationship already exists, it will not create a duplicate
 */
export async function addProductToDistrict(props: {
  tenantId: string;
  productShortName: string;
}): Promise<void> {
  const { tenantId, productShortName } = props;

  logger.info('Processing product for district', {
    tenantId,
    productShortName
  });

  const product = await getProductByCode(productShortName);

  if (!product) {
    logger.info(
      'No matching Product entity found for productShortName, ignoring',
      {
        productShortName
      }
    );
    return;
  }

  const productId = product.id;

  logger.info('Found matching Product entity', {
    productShortName,
    productId
  });

  // Check if the tenant-product relationship already exists
  const existingTenantProduct = await TenantProduct.get({
    tenantId,
    productId
  });

  if (!existingTenantProduct) {
    // Create new tenant-product relationship
    await TenantProduct.create({
      tenantId,
      productId,
      productCode: productShortName,
      source: SOURCE_US
    });

    logger.info('Successfully added product to district', {
      tenantId,
      productId,
      productShortName
    });
  } else {
    logger.info('Product already added to district - updating', {
      tenantId,
      productId,
      productShortName
    });

    await TenantProduct.update({
      tenantId,
      productId,
      productCode: productShortName,
      // Ensure the relationship is active and no expiration
      active: true,
      expires: 0,
      source: SOURCE_US
    });
  }
}

/**
 * Deactivates a product for a tenant
 */
async function deactivateProductForTenant(props: {
  tenantId: string;
  productId: string;
}): Promise<void> {
  const { tenantId, productId } = props;
  const expires = getExpirationTimestamp();

  logger.info('Deactivating product for tenant', {
    tenantId,
    productId
  });

  // Get the TenantProduct to get the productCode
  const tenantProduct = await TenantProduct.get({
    tenantId,
    productId
  });

  if (tenantProduct) {
    await TenantProduct.update({
      tenantId,
      productId,
      productCode: tenantProduct.productCode,
      active: false,
      expires,
      source: SOURCE_US
    });
  } else {
    logger.warn('TenantProduct not found for deactivation', {
      tenantId,
      productId
    });
  }

  logger.info('Successfully deactivated product for tenant', {
    tenantId,
    productId
  });
}

/**
 * Reconciles the district products list with the current state in the database
 * For ADD/UPDATE events: Ensures products in the event are active, but preserves existing products
 * For REMOVE events: Deactivates specific products mentioned in the event
 */
async function reconcileDistrictProducts(props: {
  tenantId: string;
  productShortNames: string[];
  productConfigs: Record<string, ProductConfig>;
  detailType: string;
  specificProductToRemove?: string; // For DELETE /products events
}): Promise<void> {
  const {
    tenantId,
    productShortNames,
    productConfigs,
    detailType,
    specificProductToRemove
  } = props;

  logger.info('Reconciling district products', {
    tenantId,
    productShortNames,
    detailType,
    specificProductToRemove,
    productConfigs
  });

  // Filter products that are in our product configs
  const relevantProductShortNames = productShortNames.filter((shortName) => {
    const isRelevant = productConfigs[shortName] != null;
    logger.info('Product relevance check', {
      productShortName: shortName,
      isRelevant
    });
    return isRelevant;
  });

  // Get all tenant-product relationships for this tenant (both active and inactive)
  const existingTenantProducts = await TenantProduct.find({
    tenantId
  });

  // Filter to just active tenant products
  const activeTenantProducts = existingTenantProducts.filter(
    (tp) => tp.active !== false
  );

  logger.info('Found existing tenant products', {
    total: existingTenantProducts.length,
    active: activeTenantProducts.length
  });

  // Create a map of product IDs to product short names for quick lookup
  const productIdToShortNameMap = new Map<string, string>();
  const shortNameToProductIdMap = new Map<string, string>();

  // Get all products and build the maps
  const allProducts = await Product.find(
    { GSI1PK: 'ALL_PRODUCTS' },
    { index: 'GSI1' }
  );

  // Process all products and build the maps
  allProducts.forEach((product) => {
    productIdToShortNameMap.set(product.id, product.productCode);
    shortNameToProductIdMap.set(product.productCode, product.id);
  });

  // Identify products to add (in the event but not active in DB)
  const productsToAdd = relevantProductShortNames.filter((shortName) => {
    const productId = shortNameToProductIdMap.get(shortName);
    if (!productId) return false; // Product doesn't exist in our system

    // Check if this product is already active for the tenant
    return !activeTenantProducts.some((tp) => tp.productId === productId);
  });

  // Identify products to deactivate based on event type
  let productsToDeactivate: any[] = [];

  if (detailType === REMOVE_DISTRICT_EVENT) {
    // For REMOVE_DISTRICT_EVENT, deactivate all products
    logger.info('REMOVE_DISTRICT_EVENT: Deactivating all products for tenant', {
      tenantId,
      activeProductCount: activeTenantProducts.length
    });
    productsToDeactivate = activeTenantProducts;
  } else {
    // For all other events (including DELETE /products):
    // 1. Get the list of product IDs that should be active from the event
    const activeProductIds = relevantProductShortNames
      .map((shortName) => shortNameToProductIdMap.get(shortName))
      .filter((id) => id !== undefined) as string[];

    // 2. Find all tenant products that are not in the active list
    productsToDeactivate = activeTenantProducts.filter(
      (tp) => !activeProductIds.includes(tp.productId)
    );

    logger.info('Products to keep active vs deactivate', {
      tenantId,
      activeProductIds,
      productsToDeactivateCount: productsToDeactivate.length,
      productsToDeactivate: productsToDeactivate.map((tp) => ({
        productId: tp.productId,
        productCode: tp.productCode
      }))
    });
  }

  logger.info('Reconciliation plan', {
    productsToAdd: productsToAdd.length,
    productsToDeactivate: productsToDeactivate.length,
    detailType
  });

  // Add missing products
  await Promise.all(
    productsToAdd.map((shortName) =>
      addProductToDistrict({
        tenantId,
        productShortName: shortName
      })
    )
  );

  // Deactivate products if needed
  await Promise.all(
    productsToDeactivate.map((tp) =>
      deactivateProductForTenant({
        tenantId,
        productId: tp.productId
      })
    )
  );

  logger.info('Successfully reconciled district products', {
    tenantId,
    added: productsToAdd.length,
    deactivated: productsToDeactivate.length,
    detailType
  });
}

/**
 * Disables a tenant and all related entities
 * Sets active=false and expires timestamp on the tenant and all entities with TENANT# as PK
 * This includes TenantProduct, User, Folder, etc.
 */
async function disableTenant(props: { tenantId: string }): Promise<void> {
  const { tenantId } = props;

  logger.info('Disabling tenant', { tenantId });
  const expires = getExpirationTimestamp();

  // Update the tenant to mark it as inactive
  await Tenant.update({
    id: tenantId,
    active: false,
    expires,
    source: SOURCE_US
  });

  logger.info('Tenant marked as inactive, now disabling related entities');

  // Disable all TenantProduct entities for this tenant
  const tenantProducts = await TenantProduct.find({
    tenantId
  });

  if (tenantProducts.length > 0) {
    logger.info(
      `Found ${tenantProducts.length} TenantProduct entities to disable`
    );

    await Promise.all(
      tenantProducts.map(async (tp) => {
        await TenantProduct.update({
          tenantId: tp.tenantId,
          productId: tp.productId,
          productCode: tp.productCode,
          active: false,
          expires,
          source: SOURCE_US
        });
      })
    );

    logger.info(
      `Successfully disabled ${tenantProducts.length} TenantProduct entities`
    );
  }

  // Find and disable User entities for this tenant
  const users = await User.find({
    tenantId
  });

  if (users.length > 0) {
    logger.info(`Found ${users.length} User entities to disable`);

    await Promise.all(
      users.map(async (user) => {
        await User.update({
          tenantId: user.tenantId,
          id: user.id,
          active: false,
          expires,
          source: SOURCE_US
        });
      })
    );

    logger.info(`Successfully disabled ${users.length} User entities`);
  }

  // Find and disable Folder entities for this tenant
  const folders = await Folder.find({
    tenantId
  });

  if (folders.length > 0) {
    logger.info(`Found ${folders.length} Folder entities to disable`);

    await Promise.all(
      folders.map(async (folder) => {
        await Folder.update({
          tenantId: folder.tenantId,
          id: folder.id,
          active: false,
          expires,
          source: SOURCE_US
        });
      })
    );

    logger.info(`Successfully disabled ${folders.length} Folder entities`);
  }

  logger.info('Successfully disabled tenant and all related entities', {
    tenantId
  });
}

/**
 * Handler for district settings events from EventBridge
 * Processes district settings updates and synchronizes tenant data
 */
export const lambdaHandler = async (
  event: EventBridgeEvent<string, DistrictSettingsEvent>
): Promise<void> => {
  logger.info('Received district settings event', { event });

  const productConfigs = JSON.parse(
    process.env.PRODUCT_CONFIGS || '{}'
  ) as Record<string, ProductConfig>;

  // Extract district settings data from the event
  const { 'detail-type': detailType, detail } = event;

  if (!detail || !detail.districtUid) {
    logger.error('Invalid event format: missing districtId in detail', {
      event
    });
    return;
  }

  const { districtUid, districtName } = detail;

  logger.info('Processing district settings update', {
    detailType,
    districtUid,
    districtName,
    districtProducts: detail.districtProducts
  });

  // Check if tenant already exists
  const existingTenant = await Tenant.get({
    id: districtUid
  });

  // Add/update district and add product are basically the same as far we are concerned
  if (
    detailType === ADD_DISTRICT_EVENT ||
    detailType === UPDATE_DISTRICT_EVENT ||
    detailType === ADD_PRODUCT_EVENT
  ) {
    await addUpdateDistrict({ existingTenant, districtUid, districtName });

    // Reactivate any previously deactivated tenant-related entities
    await reactivateTenantEntities({ tenantId: districtUid });
  }

  // For all event types, reconcile the products with appropriate behavior
  // Process products if they exist in the event
  if (detail.districtProducts && Array.isArray(detail.districtProducts)) {
    logger.info('Processing district products', {
      productCount: detail.districtProducts.length
    });

    // Extract product short names from the event
    const productShortNames = detail.districtProducts.map(
      (product) => product.productShortName
    );

    // For ADD_PRODUCT_EVENT, we might have a specific product to add
    const specificProduct =
      detailType === ADD_PRODUCT_EVENT && detail.product
        ? detail.product
        : undefined;

    // If there's a specific product and it's not in the list, add it
    if (specificProduct && !productShortNames.includes(specificProduct)) {
      productShortNames.push(specificProduct);
    }

    // Reconcile district products with appropriate behavior based on event type
    await reconcileDistrictProducts({
      tenantId: districtUid,
      productShortNames,
      productConfigs,
      detailType,
      // For product removal events, specify which product to remove
      specificProductToRemove:
        detailType === REMOVE_PRODUCT_EVENT ? detail.product : undefined
    });
  } else if (detailType === REMOVE_PRODUCT_EVENT && detail.product) {
    // Handle DELETE /products event with no districtProducts array
    await reconcileDistrictProducts({
      tenantId: districtUid,
      productShortNames: [],
      productConfigs,
      detailType,
      specificProductToRemove: detail.product
    });
  } else {
    logger.info(
      'No district products in event, skipping product reconciliation'
    );
  }

  if (detailType === REMOVE_DISTRICT_EVENT && existingTenant) {
    logger.info('Removing district', { districtUid });

    await disableTenant({ tenantId: districtUid });

    logger.info('Successfully removed district', { districtUid });
  }
};

// Export the handler wrapped with the tracer
export const handler = middy(lambdaHandler).use(captureLambdaHandler(tracer));
