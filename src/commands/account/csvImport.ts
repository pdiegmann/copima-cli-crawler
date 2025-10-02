import { readFileSync } from "fs";
import type { Account, NewAccount, NewUser, User } from "../../account/types";
import type { YamlStorage } from "../../account/yamlStorage";
import { createLogger } from "../../logging";

const logger = createLogger("CSVImport");

// CSV row types matching the exact headers
type UserCSVRow = {
  id: string;
  name: string;
  email: string;
  email_verified: string;
  image: string;
  created_at: string;
  updated_at: string;
  role: string;
  banned: string;
  ban_reason: string;
  ban_expires: string;
};

type AccountCSVRow = {
  id: string;
  account_id: string;
  provider_id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  id_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
  scope: string;
  password: string;
  created_at: string;
  updated_at: string;
};

/**
 * Parse a CSV file into rows
 */
const parseCSV = <T>(filePath: string): T[] => {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter((line) => line.trim());

  if (lines.length === 0) {
    return [];
  }

  // Parse header
  const headerLine = lines[0]!;
  const headers = headerLine.split(",").map((h) => h.trim());

  // Parse rows
  const rows: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;

    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]!] = values[j] || "";
    }

    rows.push(row as T);
  }

  return rows;
};

/**
 * Convert CSV user row to User type
 */
const csvRowToUser = (row: UserCSVRow): NewUser => {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.email_verified.toLowerCase() === "true" || row.email_verified === "1",
    image: row.image || null,
    role: row.role || null,
    banned: row.banned ? row.banned.toLowerCase() === "true" || row.banned === "1" : null,
    banReason: row.ban_reason || null,
    banExpires: row.ban_expires ? new Date(row.ban_expires) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};

/**
 * Convert CSV account row to Account type
 */
const csvRowToAccount = (row: AccountCSVRow): NewAccount => {
  return {
    id: row.id,
    accountId: row.account_id,
    providerId: row.provider_id,
    userId: row.user_id,
    accessToken: row.access_token || null,
    refreshToken: row.refresh_token || null,
    idToken: row.id_token || null,
    accessTokenExpiresAt: row.access_token_expires_at ? new Date(row.access_token_expires_at) : null,
    refreshTokenExpiresAt: row.refresh_token_expires_at ? new Date(row.refresh_token_expires_at) : null,
    scope: row.scope || null,
    password: row.password || null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};

/**
 * Check if source data is newer than existing data
 */
const isNewer = (sourceUpdatedAt: Date, existingUpdatedAt: Date | string): boolean => {
  const sourceTime = sourceUpdatedAt.getTime();
  const existingTime = typeof existingUpdatedAt === "string" ? new Date(existingUpdatedAt).getTime() : existingUpdatedAt.getTime();
  return sourceTime > existingTime;
};

/**
 * Merge user data - only update if source is newer
 */
const mergeUser = (existing: User, source: NewUser): User => {
  // If source is not newer, keep existing
  if (!isNewer(source.updatedAt, existing.updatedAt)) {
    logger.debug(`User ${existing.id} not updated - existing data is newer or equal`);
    return existing;
  }

  logger.debug(`Updating user ${existing.id} - source data is newer`);
  return {
    ...existing,
    ...source,
    id: existing.id, // Always keep original ID
    createdAt: existing.createdAt, // Always keep original creation time
  };
};

/**
 * Merge account data - only update if source is newer
 */
const mergeAccount = (existing: Account, source: NewAccount): Account => {
  // If source is not newer, keep existing
  if (!isNewer(source.updatedAt, existing.updatedAt)) {
    logger.debug(`Account ${existing.id} not updated - existing data is newer or equal`);
    return existing;
  }

  logger.debug(`Updating account ${existing.id} - source data is newer`);
  return {
    ...existing,
    ...source,
    id: existing.id, // Always keep original ID
    createdAt: existing.createdAt, // Always keep original creation time
  };
};

export type ImportStats = {
  usersProcessed: number;
  usersAdded: number;
  usersUpdated: number;
  usersSkipped: number;
  accountsProcessed: number;
  accountsAdded: number;
  accountsUpdated: number;
  accountsSkipped: number;
  errors: string[];
};

/**
 * Process a single user row
 */
const processUserRow = (storage: YamlStorage, row: UserCSVRow, stats: ImportStats): void => {
  const newUser = csvRowToUser(row);
  const existing = storage.findUserById(newUser.id);

  if (!existing) {
    storage.insertUser(newUser);
    stats.usersAdded++;
    logger.debug(`Added new user: ${newUser.id}`);
    return;
  }

  const merged = mergeUser(existing, newUser);
  if (merged !== existing) {
    storage.upsertUser(merged, "id");
    stats.usersUpdated++;
  } else {
    stats.usersSkipped++;
  }
};

/**
 * Import users from CSV file
 */
export const importUsersFromCSV = async (storage: YamlStorage, filePath: string): Promise<ImportStats> => {
  const stats: ImportStats = {
    usersProcessed: 0,
    usersAdded: 0,
    usersUpdated: 0,
    usersSkipped: 0,
    accountsProcessed: 0,
    accountsAdded: 0,
    accountsUpdated: 0,
    accountsSkipped: 0,
    errors: [],
  };

  try {
    logger.info(`Importing users from ${filePath}`);
    const rows = parseCSV<UserCSVRow>(filePath);

    for (const row of rows) {
      stats.usersProcessed++;

      try {
        processUserRow(storage, row, stats);
      } catch (error) {
        const errorMsg = `Failed to process user row ${stats.usersProcessed}: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMsg);
        stats.errors.push(errorMsg);
      }
    }

    logger.info(`Users import completed: ${stats.usersAdded} added, ${stats.usersUpdated} updated, ${stats.usersSkipped} skipped, ${stats.errors.length} errors`);
  } catch (error) {
    const errorMsg = `Failed to import users from ${filePath}: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    stats.errors.push(errorMsg);
    throw error;
  }

  return stats;
};

/**
 * Process a single account row
 */
const processAccountRow = (storage: YamlStorage, row: AccountCSVRow, stats: ImportStats): void => {
  const newAccount = csvRowToAccount(row);

  // Verify user exists
  const user = storage.findUserById(newAccount.userId);
  if (!user) {
    const errorMsg = `Account ${newAccount.id} references non-existent user ${newAccount.userId}`;
    logger.warn(errorMsg);
    stats.errors.push(errorMsg);
    stats.accountsSkipped++;
    return;
  }

  const existing = storage.findAccountByAccountId(newAccount.accountId);

  if (!existing) {
    storage.insertAccount(newAccount);
    stats.accountsAdded++;
    logger.debug(`Added new account: ${newAccount.id}`);
    return;
  }

  const merged = mergeAccount(existing, newAccount);
  if (merged !== existing) {
    storage.updateAccount(merged.accountId, merged);
    stats.accountsUpdated++;
  } else {
    stats.accountsSkipped++;
  }
};

/**
 * Import accounts from CSV file
 */
export const importAccountsFromCSV = async (storage: YamlStorage, filePath: string): Promise<ImportStats> => {
  const stats: ImportStats = {
    usersProcessed: 0,
    usersAdded: 0,
    usersUpdated: 0,
    usersSkipped: 0,
    accountsProcessed: 0,
    accountsAdded: 0,
    accountsUpdated: 0,
    accountsSkipped: 0,
    errors: [],
  };

  try {
    logger.info(`Importing accounts from ${filePath}`);
    const rows = parseCSV<AccountCSVRow>(filePath);

    for (const row of rows) {
      stats.accountsProcessed++;

      try {
        processAccountRow(storage, row, stats);
      } catch (error) {
        const errorMsg = `Failed to process account row ${stats.accountsProcessed}: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMsg);
        stats.errors.push(errorMsg);
      }
    }

    logger.info(`Accounts import completed: ${stats.accountsAdded} added, ${stats.accountsUpdated} updated, ${stats.accountsSkipped} skipped, ${stats.errors.length} errors`);
  } catch (error) {
    const errorMsg = `Failed to import accounts from ${filePath}: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    stats.errors.push(errorMsg);
    throw error;
  }

  return stats;
};

/**
 * Import both users and accounts from CSV files
 */
export const importFromCSV = async (storage: YamlStorage, usersFile: string, accountsFile: string): Promise<ImportStats> => {
  const combinedStats: ImportStats = {
    usersProcessed: 0,
    usersAdded: 0,
    usersUpdated: 0,
    usersSkipped: 0,
    accountsProcessed: 0,
    accountsAdded: 0,
    accountsUpdated: 0,
    accountsSkipped: 0,
    errors: [],
  };

  // Import users first
  const userStats = await importUsersFromCSV(storage, usersFile);
  combinedStats.usersProcessed = userStats.usersProcessed;
  combinedStats.usersAdded = userStats.usersAdded;
  combinedStats.usersUpdated = userStats.usersUpdated;
  combinedStats.usersSkipped = userStats.usersSkipped;
  combinedStats.errors.push(...userStats.errors);

  // Then import accounts
  const accountStats = await importAccountsFromCSV(storage, accountsFile);
  combinedStats.accountsProcessed = accountStats.accountsProcessed;
  combinedStats.accountsAdded = accountStats.accountsAdded;
  combinedStats.accountsUpdated = accountStats.accountsUpdated;
  combinedStats.accountsSkipped = accountStats.accountsSkipped;
  combinedStats.errors.push(...accountStats.errors);

  return combinedStats;
};
