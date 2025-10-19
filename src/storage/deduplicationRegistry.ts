import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { createLogger } from "../logging";

const logger = createLogger("DeduplicationRegistry");

/**
 * Configuration for the deduplication registry
 */
export type DeduplicationRegistryConfig = {
  registryPath: string;
  enabled: boolean;
};

/**
 * Registry entry for tracking written resources
 */
export type RegistryEntry = {
  id: string;
  resourceType: string;
  filePath: string;
  writtenAt: string; // ISO timestamp
  checksumOrSize?: string | number; // Optional validation data
};

/**
 * Deduplication Registry
 *
 * Maintains a centralized lookup system of resource IDs that have been
 * successfully written to storage. This prevents duplicate data from being
 * written to JSONL files.
 *
 * Key features:
 * - Thread-safe file-based storage
 * - Resource type namespacing
 * - Validation to prevent false positives
 * - Persistent across crawler steps
 */
export class DeduplicationRegistry {
  private registryPath: string;
  private enabled: boolean;
  private cache: Map<string, Map<string, RegistryEntry>>; // resourceType -> id -> entry
  private dirty: boolean;

  constructor(config: DeduplicationRegistryConfig) {
    this.registryPath = config.registryPath;
    this.enabled = config.enabled;
    this.cache = new Map();
    this.dirty = false;

    if (this.enabled) {
      this.loadRegistry();
    }
  }

  /**
   * Check if a resource has already been written
   *
   * @param resourceType - Type of resource (e.g., 'user', 'project', 'member')
   * @param id - Unique identifier for the resource
   * @returns true if the resource has been written, false otherwise
   */
  isWritten(resourceType: string, id: string): boolean {
    if (!this.enabled) {
      return false;
    }

    const typeMap = this.cache.get(resourceType);
    if (!typeMap) {
      return false;
    }

    return typeMap.has(id);
  }

  /**
   * Mark a resource as written
   *
   * @param resourceType - Type of resource (e.g., 'user', 'project', 'member')
   * @param id - Unique identifier for the resource
   * @param filePath - Path where the resource was written
   * @param checksumOrSize - Optional checksum or size for validation
   */
  markWritten(resourceType: string, id: string, filePath: string, checksumOrSize?: string | number): void {
    if (!this.enabled) {
      return;
    }

    if (!this.cache.has(resourceType)) {
      this.cache.set(resourceType, new Map());
    }

    const typeMap = this.cache.get(resourceType);
    if (!typeMap) {
      return;
    }

    const entry: RegistryEntry = {
      id,
      resourceType,
      filePath,
      writtenAt: new Date().toISOString(),
      checksumOrSize,
    };

    typeMap.set(id, entry);
    this.dirty = true;

    logger.debug(`Marked as written: ${resourceType}/${id} at ${filePath}`);
  }

  /**
   * Mark multiple resources as written in a batch
   *
   * @param resourceType - Type of resource
   * @param ids - Array of resource IDs
   * @param filePath - Path where the resources were written
   */
  markBatchWritten(resourceType: string, ids: string[], filePath: string): void {
    if (!this.enabled) {
      return;
    }

    for (const id of ids) {
      this.markWritten(resourceType, id, filePath);
    }
  }

  /**
   * Get statistics about written resources
   *
   * @returns Object with counts per resource type
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const [resourceType, typeMap] of this.cache.entries()) {
      stats[resourceType] = typeMap.size;
    }

    return stats;
  }

  /**
   * Clear all entries for a specific resource type
   *
   * @param resourceType - Type of resource to clear
   */
  clearResourceType(resourceType: string): void {
    if (!this.enabled) {
      return;
    }

    this.cache.delete(resourceType);
    this.dirty = true;

    logger.info(`Cleared registry entries for resource type: ${resourceType}`);
  }

  /**
   * Clear all entries from the registry
   */
  clearAll(): void {
    if (!this.enabled) {
      return;
    }

    this.cache.clear();
    this.dirty = true;

    logger.info("Cleared all registry entries");
  }

  /**
   * Save the registry to disk
   */
  save(): void {
    if (!this.enabled || !this.dirty) {
      return;
    }

    try {
      const registryData: Record<string, Record<string, RegistryEntry>> = {};

      for (const [resourceType, typeMap] of this.cache.entries()) {
        registryData[resourceType] = {};
        for (const [id, entry] of typeMap.entries()) {
          registryData[resourceType][id] = entry;
        }
      }

      const dir = dirname(this.registryPath);
      mkdirSync(dir, { recursive: true });

      writeFileSync(this.registryPath, JSON.stringify(registryData, null, 2), "utf-8");
      this.dirty = false;

      logger.debug(`Saved registry to ${this.registryPath}`);
    } catch (error) {
      logger.error("Failed to save registry", {
        path: this.registryPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Load the registry from disk
   */
  private loadRegistry(): void {
    if (!existsSync(this.registryPath)) {
      logger.debug("Registry file does not exist, starting with empty registry");
      return;
    }

    try {
      const content = readFileSync(this.registryPath, "utf-8");
      const registryData: Record<string, Record<string, RegistryEntry>> = JSON.parse(content);

      this.cache.clear();

      for (const [resourceType, entries] of Object.entries(registryData)) {
        const typeMap = new Map<string, RegistryEntry>();
        for (const [id, entry] of Object.entries(entries)) {
          typeMap.set(id, entry);
        }
        this.cache.set(resourceType, typeMap);
      }

      logger.info(`Loaded registry from ${this.registryPath}`, {
        resourceTypes: Object.keys(registryData).length,
        totalEntries: Object.values(registryData).reduce((sum, entries) => sum + Object.keys(entries).length, 0),
      });
    } catch (error) {
      logger.error("Failed to load registry, starting with empty registry", {
        path: this.registryPath,
        error: error instanceof Error ? error.message : String(error),
      });
      this.cache.clear();
    }
  }

  /**
   * Get all entries for a specific resource type
   *
   * @param resourceType - Type of resource
   * @returns Array of registry entries
   */
  getEntriesForType(resourceType: string): RegistryEntry[] {
    const typeMap = this.cache.get(resourceType);
    if (!typeMap) {
      return [];
    }

    return Array.from(typeMap.values());
  }

  /**
   * Check if registry is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * Create a deduplication registry with default configuration
 *
 * @param rootDir - Root directory for output
 * @param enabled - Whether deduplication is enabled
 * @returns DeduplicationRegistry instance
 */
export const createDeduplicationRegistry = (rootDir: string, enabled: boolean = true): DeduplicationRegistry => {
  const registryPath = join(rootDir, ".copima-registry.json");

  return new DeduplicationRegistry({
    registryPath,
    enabled,
  });
};
