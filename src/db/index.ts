// Database schema exports
export * from "./schema";
export { account, user } from "./schema";

// Database connection exports
export { closeDatabase, getDatabase, initDatabase, type DatabaseConfig } from "./connection";
// Default database connection alias
export { getDatabase as db } from "./connection";

// Migration exports
export { initializeDatabase, runMigrations, type MigrationConfig } from "./migrate";

// Type exports
export type {
  Account,
  AccountUpdate,
  AccountWithUser,
  DatabaseResult,
  GitLabAccount,
  NewAccount,
  NewUser,
  OAuthTokens,
  PaginatedResult,
  User,
  UserUpdate,
  UserWithAccounts
} from "./types.js";
