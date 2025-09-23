import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import logger from '../utils/logger.js';
import { getDatabase, initDatabase } from './connection.js';
import type { DatabaseConfig } from './connection.js';

export type MigrationConfig = {
  migrationsFolder?: string;
} & DatabaseConfig;

export async function runMigrations(config: MigrationConfig) {
  const migrationsFolder = config.migrationsFolder || './drizzle';

  try {
    logger.info('Starting database migrations', {
      path: config.path,
      migrationsFolder,
    });

    // Initialize database if not already done
    const db = getDatabase() || initDatabase(config);

    // Run migrations
    await migrate(db, { migrationsFolder });

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Failed to run database migrations', { error });
    throw error;
  }
}

export async function initializeDatabase(config: MigrationConfig) {
  try {
    logger.info('Initializing database with migrations');

    // Initialize the database connection
    initDatabase(config);

    // Run any pending migrations
    await runMigrations(config);

    logger.info('Database initialization completed');
  } catch (error) {
    logger.error('Failed to initialize database', { error });
    throw error;
  }
}
