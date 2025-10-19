import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type { OutputConfig } from "../config/types.js";
import { createLogger } from "../logging";
import type { SafeRecord } from "../types/api.js";
import { DeduplicationRegistry } from "./deduplicationRegistry.js";

const logger = createLogger("StorageManager");

/**
 * Storage Manager
 *
 * Manages the hierarchical storage of processed data into JSONL files,
 * ensuring the folder structure mirrors the API's resource hierarchy
 * (e.g., GitLab groups and projects).
 */
export class StorageManager {
  private rootDir: string;
  private fileNaming: "lowercase" | "kebab-case" | "snake_case";
  private prettyPrint: boolean;
  private compression: "none" | "gzip" | "brotli";
  private deduplicationRegistry?: DeduplicationRegistry;

  constructor(config: OutputConfig, deduplicationRegistry?: DeduplicationRegistry) {
    this.rootDir = config.rootDir;
    this.fileNaming = config.fileNaming || "lowercase";
    this.prettyPrint = config.prettyPrint || false;
    this.compression = config.compression || "none";
    this.deduplicationRegistry = deduplicationRegistry;
  }

  /**
   * Creates a hierarchical path for a resource based on its type and context.
   *
   * @param resourceType - The type of resource (e.g., 'users', 'groups', 'projects').
   * @param hierarchy - An array representing the hierarchical path (e.g., ['groups', 'groupName', 'projects', 'projectName']).
   * @returns The full path to the directory where the resource should be stored.
   */
  createHierarchicalPath(resourceType: string, hierarchy: string[] = []): string {
    let fileName = this.formatFileName(resourceType);
    if (!fileName.endsWith(".jsonl")) {
      fileName += ".jsonl";
    }
    const fullPath = join(this.rootDir, ...hierarchy, fileName);
    const dirPath = dirname(fullPath);

    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
      logger.debug(`Created directory structure: ${dirPath}`);
    }

    return fullPath;
  }

  /**
   * Writes data to a JSONL file at the specified path with optional deduplication.
   *
   * @param filePath - The full path to the JSONL file.
   * @param data - The data to write, either a single object or an array of objects.
   * @param append - Whether to append to the file or overwrite it.
   * @param resourceType - Optional resource type for deduplication (e.g., 'users', 'projects').
   * @param idField - Optional field name to use as ID for deduplication (default: 'id').
   * @returns The number of lines written.
   */
  writeJsonlFile(filePath: string, data: SafeRecord | SafeRecord[], append: boolean = true, resourceType?: string, idField: string = "id"): number {
    try {
      const dataArray = Array.isArray(data) ? data : [data];
      if (dataArray.length === 0) {
        logger.debug(`No data to write to ${filePath}`);
        return 0;
      }

      // Filter out duplicates if deduplication is enabled
      let filteredData = dataArray;
      if (this.deduplicationRegistry && this.deduplicationRegistry.isEnabled() && resourceType) {
        filteredData = dataArray.filter((item) => {
          if (!item) return false;

          const itemId = item[idField];
          if (!itemId) {
            logger.warn(`Item missing ${idField} field, cannot deduplicate`, { resourceType });
            return true; // Include items without ID
          }

          const id = String(itemId);
          if (this.deduplicationRegistry!.isWritten(resourceType, id)) {
            logger.debug(`Skipping duplicate ${resourceType}: ${id}`);
            return false;
          }

          return true;
        });

        logger.debug(`Deduplication: ${dataArray.length} -> ${filteredData.length} items (${dataArray.length - filteredData.length} duplicates skipped)`);
      }

      if (filteredData.length === 0) {
        logger.debug(`No new data to write to ${filePath} after deduplication`);
        return 0;
      }

      let content = "";
      const writtenIds: string[] = [];

      for (const item of filteredData) {
        if (item) {
          const jsonString = this.prettyPrint ? JSON.stringify(item, null, 2) : JSON.stringify(item);
          content += `${jsonString}\n`;

          // Track ID for registry
          if (resourceType && this.deduplicationRegistry && this.deduplicationRegistry.isEnabled()) {
            const itemId = item[idField];
            if (itemId) {
              writtenIds.push(String(itemId));
            }
          }
        }
      }

      if (content) {
        writeFileSync(filePath, content, { flag: append ? "a" : "w" });
        logger.debug(`Wrote ${filteredData.length} lines to ${filePath} (${append ? "append" : "overwrite"} mode)`);

        // Mark resources as written in registry
        if (resourceType && this.deduplicationRegistry && this.deduplicationRegistry.isEnabled() && writtenIds.length > 0) {
          this.deduplicationRegistry.markBatchWritten(resourceType, writtenIds, filePath);
          this.deduplicationRegistry.save();
        }
      }

      return filteredData.length;
    } catch (error) {
      logger.error(`Failed to write to ${filePath}:`, error as SafeRecord);
      return 0;
    }
  }

  /**
   * Formats a resource type into a file name based on the configured naming convention.
   *
   * @param resourceType - The type of resource.
   * @returns The formatted file name.
   */
  private formatFileName(resourceType: string): string {
    switch (this.fileNaming) {
      case "kebab-case":
        return resourceType
          .replace(/([a-z])([A-Z])/g, "$1-$2")
          .toLowerCase()
          .replace(/\s+/g, "-");
      case "snake_case":
        return resourceType
          .replace(/([a-z])([A-Z])/g, "$1_$2")
          .toLowerCase()
          .replace(/\s+/g, "_");
      case "lowercase":
      default:
        return resourceType.toLowerCase().replace(/\s+/g, "");
    }
  }

  /**
   * Gets the root directory for output storage.
   *
   * @returns The root directory path.
   */
  getRootDir(): string {
    return this.rootDir;
  }

  /**
   * Updates the output configuration.
   *
   * @param config - The new output configuration.
   */
  updateConfig(config: OutputConfig): void {
    this.rootDir = config.rootDir;
    this.fileNaming = config.fileNaming || "lowercase";
    this.prettyPrint = config.prettyPrint || false;
    this.compression = config.compression || "none";
    logger.debug("Updated StorageManager configuration");
  }

  /**
   * Sets the deduplication registry for this storage manager.
   *
   * @param registry - The deduplication registry to use.
   */
  setDeduplicationRegistry(registry: DeduplicationRegistry): void {
    this.deduplicationRegistry = registry;
  }

  /**
   * Gets the deduplication registry if one is configured.
   *
   * @returns The deduplication registry or undefined.
   */
  getDeduplicationRegistry(): DeduplicationRegistry | undefined {
    return this.deduplicationRegistry;
  }
}

/**
 * Creates a new StorageManager instance from configuration.
 *
 * @param config - The output configuration.
 * @param deduplicationRegistry - Optional deduplication registry.
 * @returns A new StorageManager instance.
 */
export const createStorageManager = (config: OutputConfig, deduplicationRegistry?: DeduplicationRegistry): StorageManager => {
  return new StorageManager(config, deduplicationRegistry);
};
