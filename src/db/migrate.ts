import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createLogger } from "../logging";
import type { DatabaseConfig } from "./connection";
import { getDatabase, initDatabase } from "./connection";
const logger = createLogger("DatabaseMigrate");

export type MigrationConfig = {
  migrationsFolder?: string;
} & DatabaseConfig;

export const runMigrations = (config: MigrationConfig): undefined => {
  const migrationsFolder = config.migrationsFolder || "./drizzle";

  try {
    logger.info("Starting database migrations", {
      path: config.path,
      migrationsFolder,
    });

    // Initialize database if not already done
    const db = getDatabase() || initDatabase(config);

    // Run migrations
    migrate(db, { migrationsFolder });

    logger.info("Database migrations completed successfully");
  } catch (error) {
    logger.error("Failed to run database migrations", { error });
    throw error;
  }
};

export const initializeDatabase = (config: MigrationConfig): undefined => {
  try {
    logger.info("Initializing database with migrations");

    // Initialize the database connection
    initDatabase(config);

    // Run any pending migrations
    runMigrations(config);

    logger.info("Database initialization completed");
  } catch (error) {
    logger.error("Failed to initialize database", { error });
    throw error;
  }
};
