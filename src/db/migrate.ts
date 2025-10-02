import { createLogger } from "../logging";
import type { DatabaseConfig } from "./connection";
import { initDatabase } from "./connection";

const logger = createLogger("DatabaseMigrate");

export type MigrationConfig = {
  migrationsFolder?: string; // Kept for backward compatibility, but ignored
} & DatabaseConfig;

export const runMigrations = (_config: MigrationConfig): void => {
  // YAML storage doesn't need migrations - initialization creates the file if needed
  logger.info("YAML storage doesn't require migrations, skipping");
};

export const initializeDatabase = (config: MigrationConfig): void => {
  const globalState = globalThis as typeof globalThis & { __copimaDatabaseInitialized?: boolean; __copimaDatabasePath?: string };

  if (globalState.__copimaDatabaseInitialized && globalState.__copimaDatabasePath === config.path) {
    initDatabase(config);
    return;
  }

  try {
    logger.info("Initializing YAML storage");

    // Initialize the YAML storage
    initDatabase(config);

    logger.info("YAML storage initialization completed");

    globalState.__copimaDatabaseInitialized = true;
    globalState.__copimaDatabasePath = config.path;
  } catch (error) {
    logger.error("Failed to initialize YAML storage", { error });
    throw error;
  }
};
