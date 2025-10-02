import { Database as BunDatabase } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { createLogger } from "../logging";
import * as schema from "./schema";

export type DatabaseConfig = {
  path: string;
  wal?: boolean;
  timeout?: number;
};

const logger = createLogger("Database");
let db: ReturnType<typeof drizzle> | null = null;
let sqliteInstance: { close: () => void } | null = null;

export const initDatabase = (config: DatabaseConfig): ReturnType<typeof drizzle> => {
  if (db) {
    // Return existing instance without warning to reduce log noise
    return db;
  }

  try {
    logger.info(`Initializing database at ${config.path}`);

    const sqlite = new BunDatabase(config.path, {
      create: true,
    });

    // Enable WAL mode for better concurrency if requested
    if (config.wal !== false) {
      sqlite.exec("PRAGMA journal_mode = WAL");
    }

    // Enable foreign keys
    sqlite.exec("PRAGMA foreign_keys = ON");

    db = drizzle(sqlite, { schema });
    sqliteInstance = sqlite;

    logger.info("Database initialized successfully");
    return db;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Failed to initialize database: ${error.message}`);
    } else {
      logger.error("Failed to initialize database: Unknown error");
    }
    throw error;
  }
};

export const getDatabase = (): ReturnType<typeof drizzle> => {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
};

// Extend Database type to include schema properties
export type Database = ReturnType<typeof drizzle> & {
  account: {
    update: (args: { where: { accountId: string }; data: Record<string, unknown> }) => Promise<void>;
    findUnique: (args: { where: { accountId: string } }) => Promise<Record<string, unknown> | null>;
  };
};

export const closeDatabase = (): void => {
  if (!db && !sqliteInstance) {
    return;
  }

  logger.info("Closing database connection");

  try {
    sqliteInstance?.close();
  } catch (error) {
    logger.warn("Failed to close SQLite database cleanly", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  db = null;
  sqliteInstance = null;
};

// Export schema for external use
export { schema };
