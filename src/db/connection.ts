import { createLogger } from "../logging";
import { YamlStorage } from "./yamlStorage";

export type DatabaseConfig = {
  path: string;
  wal?: boolean; // Kept for backward compatibility, but ignored
  timeout?: number; // Kept for backward compatibility, but ignored
};

const logger = createLogger("Database");
let storage: YamlStorage | null = null;

export const initDatabase = (config: DatabaseConfig): YamlStorage => {
  if (storage) {
    // Return existing instance without warning to reduce log noise
    return storage;
  }

  try {
    logger.info(`Initializing YAML storage at ${config.path}`);

    // Convert .sqlite extension to .yaml if present
    const yamlPath = config.path.replace(/\.sqlite$/, ".yaml");
    storage = new YamlStorage(yamlPath);

    logger.info("YAML storage initialized successfully");
    return storage;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Failed to initialize YAML storage: ${error.message}`);
    } else {
      logger.error("Failed to initialize YAML storage: Unknown error");
    }
    throw error;
  }
};

export const getDatabase = (): YamlStorage => {
  if (!storage) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return storage;
};

// Database type for compatibility
export type Database = YamlStorage;

export const closeDatabase = (): void => {
  if (!storage) {
    return;
  }

  logger.info("Closing YAML storage");

  try {
    storage.flush();
  } catch (error) {
    logger.warn("Failed to flush YAML storage cleanly", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  storage = null;
};
