import { createWriteStream } from "fs";
import { access, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import type { GitLabGroup, GitLabProject } from "../types/api.js";
import { createLogger } from "./logger.js";

const logger = createLogger("HierarchicalStorage");

export type HierarchicalStorageConfig = {
  rootDir: string;
  fileNaming: "lowercase" | "kebab-case" | "snake_case";
  hierarchical: boolean;
  compression: "none" | "gzip" | "brotli";
  prettyPrint: boolean;
};

export type GitLabArea = {
  id: string | number;
  fullPath: string;
  type: "group" | "project";
};

export class HierarchicalStorageManager {
  private config: HierarchicalStorageConfig;

  constructor(config: HierarchicalStorageConfig) {
    this.config = config;
  }

  /**
   * Create hierarchical directory path for a GitLab area
   */
  createHierarchicalPath(area: GitLabArea): string {
    if (!this.config.hierarchical) {
      // Flat structure - use root directory only
      return this.config.rootDir;
    }

    // Create nested directory structure based on GitLab hierarchy
    const pathParts = area.fullPath.split("/");
    const sanitizedParts = pathParts.map((part) => this.sanitizePathPart(part));

    return join(this.config.rootDir, ...sanitizedParts);
  }

  /**
   * Write data to JSONL files in hierarchical structure
   */
  async writeJSONLToHierarchy(area: GitLabArea, resourceType: string, data: any[]): Promise<void> {
    if (!data || data.length === 0) {
      logger.debug("No data to write", { area: area.fullPath, resourceType });
      return;
    }

    const directoryPath = this.createHierarchicalPath(area);
    const fileName = this.generateFileName(resourceType);
    const filePath = join(directoryPath, fileName);

    // Ensure directory exists
    await this.ensureDirectoryStructure(directoryPath);

    // Write JSONL data
    await this.writeJSONLData(filePath, data);

    logger.info("JSONL data written to hierarchical structure", {
      area: area.fullPath,
      resourceType,
      filePath,
      recordCount: data.length,
    });
  }

  /**
   * Ensure directory structure exists
   */
  async ensureDirectoryStructure(path: string): Promise<void> {
    try {
      await access(path);
      logger.debug("Directory already exists", { path });
    } catch {
      // Directory doesn't exist, create it
      try {
        await mkdir(path, { recursive: true });
        logger.debug("Directory structure created", { path });
      } catch (error) {
        logger.error("Failed to create directory structure", {
          path,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }
  }

  /**
   * Write data to JSONL file
   */
  private async writeJSONLData(filePath: string, data: any[]): Promise<void> {
    try {
      const writeStream = createWriteStream(filePath, { flags: "w", encoding: "utf8" });

      return new Promise((resolve, reject) => {
        writeStream.on("error", reject);
        writeStream.on("finish", resolve);

        // Write each object as a separate line
        for (const item of data) {
          const jsonLine = this.config.prettyPrint ? `${JSON.stringify(item, null, 2)}\n` : `${JSON.stringify(item)}\n`;

          writeStream.write(jsonLine);
        }

        writeStream.end();
      });
    } catch (error) {
      logger.error("Failed to write JSONL data", {
        filePath,
        recordCount: data.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate standardized file name based on resource type
   */
  private generateFileName(resourceType: string): string {
    let fileName: string;

    switch (this.config.fileNaming) {
      case "kebab-case":
        fileName = resourceType.toLowerCase().replace(/[_\s]+/g, "-");
        break;
      case "snake_case":
        fileName = resourceType.toLowerCase().replace(/[-\s]+/g, "_");
        break;
      case "lowercase":
      default:
        fileName = resourceType.toLowerCase().replace(/[-_\s]+/g, "");
        break;
    }

    return `${fileName}.jsonl`;
  }

  /**
   * Sanitize path part for file system compatibility
   */
  private sanitizePathPart(part: string): string {
    // Replace invalid file system characters
    return part
      .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid characters
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/\.+$/, "") // Remove trailing dots
      .toLowerCase(); // Convert to lowercase for consistency
  }

  /**
   * Create area object from GitLab group
   */
  static createAreaFromGroup(group: GitLabGroup): GitLabArea {
    return {
      id: group.id,
      fullPath: group.fullPath,
      type: "group",
    };
  }

  /**
   * Create area object from GitLab project
   */
  static createAreaFromProject(project: GitLabProject): GitLabArea {
    // Note: GitLabProject currently only has id, we'll need to enhance this
    return {
      id: project.id,
      fullPath: String(project.id), // Fallback until fullPath is available
      type: "project",
    };
  }

  /**
   * Write multiple resource types for an area
   */
  async writeMultipleResources(area: GitLabArea, resources: Record<string, any[]>): Promise<void> {
    const directoryPath = this.createHierarchicalPath(area);
    await this.ensureDirectoryStructure(directoryPath);

    const writePromises = Object.entries(resources).map(([resourceType, data]) => this.writeJSONLToHierarchy(area, resourceType, data));

    await Promise.all(writePromises);

    logger.info("Multiple resources written to hierarchy", {
      area: area.fullPath,
      resourceTypes: Object.keys(resources),
      totalRecords: Object.values(resources).reduce((sum, data) => sum + data.length, 0),
    });
  }

  /**
   * Get full file path for a resource type in an area
   */
  getResourceFilePath(area: GitLabArea, resourceType: string): string {
    const directoryPath = this.createHierarchicalPath(area);
    const fileName = this.generateFileName(resourceType);
    return join(directoryPath, fileName);
  }

  /**
   * Create index file with area metadata
   */
  async createAreaIndex(area: GitLabArea, metadata: any): Promise<void> {
    const directoryPath = this.createHierarchicalPath(area);
    const indexPath = join(directoryPath, "index.json");

    await this.ensureDirectoryStructure(directoryPath);

    const indexData = {
      area: {
        id: area.id,
        fullPath: area.fullPath,
        type: area.type,
      },
      metadata,
      createdAt: new Date().toISOString(),
    };

    const indexContent = this.config.prettyPrint ? JSON.stringify(indexData, null, 2) : JSON.stringify(indexData);

    await writeFile(indexPath, indexContent, "utf8");

    logger.debug("Area index created", {
      area: area.fullPath,
      indexPath,
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<HierarchicalStorageConfig>): void {
    this.config = { ...this.config, ...newConfig };

    logger.info("Hierarchical storage configuration updated", {
      rootDir: this.config.rootDir,
      fileNaming: this.config.fileNaming,
      hierarchical: this.config.hierarchical,
      compression: this.config.compression,
      prettyPrint: this.config.prettyPrint,
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): HierarchicalStorageConfig {
    return { ...this.config };
  }

  /**
   * Calculate total storage size for an area
   */
  async calculateAreaSize(area: GitLabArea): Promise<number> {
    // This would be implemented to calculate directory size
    // For now, return 0 as placeholder
    logger.debug("Calculating area size", { area: area.fullPath });
    return 0;
  }

  /**
   * Validate storage configuration
   */
  validateConfig(): boolean {
    if (!this.config.rootDir) {
      logger.error("Root directory not configured");
      return false;
    }

    const validFileNamingOptions = ["lowercase", "kebab-case", "snake_case"];
    if (!validFileNamingOptions.includes(this.config.fileNaming)) {
      logger.error("Invalid file naming option", { fileNaming: this.config.fileNaming });
      return false;
    }

    const validCompressionOptions = ["none", "gzip", "brotli"];
    if (!validCompressionOptions.includes(this.config.compression)) {
      logger.error("Invalid compression option", { compression: this.config.compression });
      return false;
    }

    return true;
  }
}

/**
 * Create hierarchical storage manager with default configuration
 */
export const createHierarchicalStorageManager = (config: Partial<HierarchicalStorageConfig> = {}): HierarchicalStorageManager => {
  const defaultConfig: HierarchicalStorageConfig = {
    rootDir: "./output",
    fileNaming: "lowercase",
    hierarchical: true,
    compression: "none",
    prettyPrint: false,
    ...config,
  };

  return new HierarchicalStorageManager(defaultConfig);
};
