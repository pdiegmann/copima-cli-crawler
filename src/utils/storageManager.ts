import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type { OutputConfig } from "../config/types.js";
import type { SafeRecord } from "../types/api.js";
import { createLogger } from "./logger.js";

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

  constructor(config: OutputConfig) {
    this.rootDir = config.rootDir;
    this.fileNaming = config.fileNaming || "lowercase";
    this.prettyPrint = config.prettyPrint || false;
    this.compression = config.compression || "none";
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
   * Writes data to a JSONL file at the specified path.
   *
   * @param filePath - The full path to the JSONL file.
   * @param data - The data to write, either a single object or an array of objects.
   * @param append - Whether to append to the file or overwrite it.
   * @returns The number of lines written.
   */
  writeJsonlFile(filePath: string, data: SafeRecord | SafeRecord[], append: boolean = true): number {
    try {
      const dataArray = Array.isArray(data) ? data : [data];
      if (dataArray.length === 0) {
        logger.debug(`No data to write to ${filePath}`);
        return 0;
      }

      let content = "";
      for (const item of dataArray) {
        if (item) {
          const jsonString = this.prettyPrint ? JSON.stringify(item, null, 2) : JSON.stringify(item);
          content += `${jsonString}\n`;
        }
      }

      if (content) {
        writeFileSync(filePath, content, { flag: append ? "a" : "w" });
        logger.debug(`Wrote ${dataArray.length} lines to ${filePath} (${append ? "append" : "overwrite"} mode)`);
      }

      return dataArray.length;
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
}

/**
 * Creates a new StorageManager instance from configuration.
 *
 * @param config - The output configuration.
 * @returns A new StorageManager instance.
 */
export const createStorageManager = (config: OutputConfig): StorageManager => {
  return new StorageManager(config);
};
