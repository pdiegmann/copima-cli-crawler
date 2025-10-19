import type { Config, OutputConfig } from "../../config/types.js";
import { createLogger } from "../../logging";
import { createDeduplicationRegistry, DeduplicationRegistry } from "../../storage/deduplicationRegistry.js";
import { createHierarchicalStorageManager, HierarchicalStorageManager } from "../../storage/hierarchicalStorage.js";
import { createStorageManager, StorageManager } from "../../storage/storageManager.js";

const logger = createLogger("StorageFactory");

/**
 * Create a deduplication registry from output configuration
 *
 * @param outputConfig - The output configuration
 * @returns DeduplicationRegistry instance or undefined if disabled
 */
export function createDeduplicationRegistryFromConfig(outputConfig: OutputConfig): DeduplicationRegistry | undefined {
  const enabled = outputConfig.deduplication?.enabled !== false; // Default to true
  const registryPath = outputConfig.deduplication?.registryPath;

  if (!enabled) {
    logger.debug("Deduplication is disabled");
    return undefined;
  }

  const registry = registryPath ? new DeduplicationRegistry({ registryPath, enabled: true }) : createDeduplicationRegistry(outputConfig.rootDir, true);

  logger.info("Created deduplication registry", {
    enabled,
    registryPath: registryPath || `${outputConfig.rootDir}/.copima-registry.json`,
  });

  return registry;
}

/**
 * Create a storage manager with deduplication support
 *
 * @param config - The full configuration
 * @returns StorageManager instance with deduplication if enabled
 */
export function createStorageManagerWithDeduplication(config: Config): StorageManager {
  const deduplicationRegistry = createDeduplicationRegistryFromConfig(config.output);
  return createStorageManager(config.output, deduplicationRegistry);
}

/**
 * Create a hierarchical storage manager with deduplication support
 *
 * @param config - The full configuration or output configuration
 * @param hierarchicalConfig - Optional hierarchical storage config overrides
 * @returns HierarchicalStorageManager instance with deduplication if enabled
 */
export function createHierarchicalStorageManagerWithDeduplication(
  config: Config | OutputConfig,
  hierarchicalConfig: Partial<{
    rootDir: string;
    fileNaming: "lowercase" | "kebab-case" | "snake_case";
    hierarchical: boolean;
    compression: "none" | "gzip" | "brotli";
    prettyPrint: boolean;
  }> = {}
): HierarchicalStorageManager {
  // Extract output config
  const outputConfig = "output" in config ? config.output : config;

  const deduplicationRegistry = createDeduplicationRegistryFromConfig(outputConfig);

  return createHierarchicalStorageManager(hierarchicalConfig, deduplicationRegistry);
}

/**
 * Get or create a shared deduplication registry for the current crawl session
 * This ensures all storage managers in the same crawl use the same registry instance
 */
let sharedRegistry: DeduplicationRegistry | undefined;

export function getSharedDeduplicationRegistry(outputConfig: OutputConfig): DeduplicationRegistry | undefined {
  if (!sharedRegistry) {
    sharedRegistry = createDeduplicationRegistryFromConfig(outputConfig);
  }
  return sharedRegistry;
}

/**
 * Clear the shared deduplication registry
 * Should be called at the end of a crawl session
 */
export function clearSharedDeduplicationRegistry(): void {
  if (sharedRegistry) {
    sharedRegistry.save();
    sharedRegistry = undefined;
    logger.debug("Cleared shared deduplication registry");
  }
}

/**
 * Get statistics from the shared deduplication registry
 */
export function getDeduplicationStats(): Record<string, number> | null {
  if (!sharedRegistry || !sharedRegistry.isEnabled()) {
    return null;
  }
  return sharedRegistry.getStats();
}
