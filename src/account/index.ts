// Account schema and types
export * from "./schema";
export { account, user } from "./schema";

// Account storage
export { closeStorage, getStorage, initStorage, type StorageConfig } from "./storage";
// Backward compatibility aliases
export { closeDatabase, getDatabase, initDatabase, type DatabaseConfig } from "./storage";
// Default storage alias
export { getStorage as storage } from "./storage";
// Backward compatibility default alias
export { getStorage as db } from "./storage";

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

// YamlStorage export
export { YamlStorage } from "./yamlStorage";
