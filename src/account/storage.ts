import { createLogger } from "../logging";
import { YamlStorage } from "./yamlStorage";

export type StorageConfig = {
  path: string;
};

const logger = createLogger("AccountStorage");
let storage: YamlStorage | null = null;

export const initStorage = (config: StorageConfig): YamlStorage => {
  if (storage) {
    return storage;
  }

  try {
    logger.info(`Initializing account storage at ${config.path}`);

    // Convert .sqlite extension to .yaml if present for backward compatibility
    const yamlPath = config.path.replace(/\.sqlite$/, ".yaml");
    storage = new YamlStorage(yamlPath);

    logger.info("Account storage initialized successfully");
    return storage;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Failed to initialize account storage: ${error.message}`);
    } else {
      logger.error("Failed to initialize account storage: Unknown error");
    }
    throw error;
  }
};

export const getStorage = (): YamlStorage => {
  if (!storage) {
    throw new Error("Account storage not initialized. Call initStorage() first.");
  }
  return storage;
};

export const closeStorage = (): void => {
  if (!storage) {
    return;
  }

  logger.info("Closing account storage");

  try {
    storage.flush();
  } catch (error) {
    logger.warn("Failed to flush account storage cleanly", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  storage = null;
};

// Backward compatibility exports
export const initDatabase = initStorage;
export const getDatabase = getStorage;
export const closeDatabase = closeStorage;
// eslint-disable-next-line sonarjs/redundant-type-aliases -- Intentional backward compatibility alias
export type DatabaseConfig = StorageConfig;
export type Database = YamlStorage;
