import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import logger from '../utils/logger.js';
import * as schema from './schema.js';

export type DatabaseConfig = {
  path: string;
  wal?: boolean;
  timeout?: number;
};

let db: ReturnType<typeof drizzle> | null = null;

export function initDatabase(config: DatabaseConfig) {
  if (db) {
    logger.warn('Database already initialized');
    return db;
  }

  try {
    logger.info(`Initializing database at ${config.path}`);

    const sqlite = new Database(config.path, {
      fileMustExist: false,
      timeout: config.timeout || 5000, // Default 5 second timeout
    });

    // Enable WAL mode for better concurrency if requested
    if (config.wal !== false) {
      sqlite.pragma('journal_mode = WAL');
    }

    // Enable foreign keys
    sqlite.pragma('foreign_keys = ON');

    db = drizzle(sqlite, { schema });

    logger.info('Database initialized successfully');
    return db;
  } catch (error) {
    logger.error('Failed to initialize database', { error });
    throw error;
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    logger.info('Closing database connection');
    // The better-sqlite3 database will be closed automatically when the process exits
    db = null;
  }
}

// Export schema for external use
export { schema };
