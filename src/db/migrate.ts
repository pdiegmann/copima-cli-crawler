import { createLogger } from "../logging";
import type { DatabaseConfig } from "./connection";
import { initDatabase } from "./connection";
const logger = createLogger("DatabaseMigrate");

export type MigrationConfig = {
  migrationsFolder?: string;
} & DatabaseConfig;

export const runMigrations = (_config: MigrationConfig): undefined => {
  // Check if the schema exists by trying to query the account table
  try {
    const db = initDatabase(_config);
    // Test if the account table exists
    db.select()
      .from({ name: "account" } as any)
      .limit(1)
      .all();
    logger.info("Database schema already exists, skipping migrations");
    return;
  } catch {
    // Schema doesn't exist, we need to create it
    logger.info("Schema not found, creating database schema");

    // Since drizzle-kit push was used, we'll create the schema manually
    const db = initDatabase(_config);

    // Create the tables using SQL directly
    const sqlite = (db as any).$client;

    if (!sqlite) {
      throw new Error("Unable to access SQLite client from Drizzle instance");
    }

    // Create user table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS user (
        ban_expires integer,
        banned integer,
        ban_reason text,
        created_at integer NOT NULL,
        email text NOT NULL,
        email_verified integer NOT NULL,
        id text PRIMARY KEY NOT NULL,
        image text,
        name text NOT NULL,
        role text,
        updated_at integer NOT NULL
      );
    `);

    // Create unique index for user email
    sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS user_email_unique ON user (email);");

    // Create account table
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS account (
        access_token text,
        access_token_expires_at integer,
        account_id text NOT NULL,
        created_at integer NOT NULL,
        id text PRIMARY KEY NOT NULL,
        id_token text,
        password text,
        provider_id text NOT NULL,
        refresh_token text,
        refresh_token_expires_at integer,
        scope text,
        updated_at integer NOT NULL,
        user_id text NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user(id) ON UPDATE no action ON DELETE cascade
      );
    `);

    logger.info("Database schema created successfully");
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
