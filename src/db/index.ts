// Database schema exports
export { user, account } from './schema.js';
export * from './schema.js';

// Database connection exports
export { getDatabase, initDatabase, closeDatabase, type DatabaseConfig } from './connection.js';
// Default database connection alias
export { getDatabase as db } from './connection.js';

// Migration exports
export { runMigrations, initializeDatabase, type MigrationConfig } from './migrate.js';

// Type exports
export type {
  User,
  NewUser,
  UserUpdate,
  Account,
  NewAccount,
  AccountUpdate,
  UserWithAccounts,
  AccountWithUser,
  OAuthTokens,
  GitLabAccount,
  DatabaseResult,
  PaginatedResult,
} from './types.js';
