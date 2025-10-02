import { randomUUID } from "crypto";
import colors from "picocolors";
import treeify from "treeify";
import { getDatabase, initStorage } from "../../account/index";
import { createLogger } from "../../logging";
import type { SafeRecord } from "../../types/api.js";
import { importAccountsFromCSV, importFromCSV, importUsersFromCSV, type ImportStats } from "./csvImport";

const logger = createLogger("AccountCommands");

// Helper function to ensure storage is initialized
const ensureDatabase = (): ReturnType<typeof getDatabase> => {
  try {
    return getDatabase();
  } catch {
    // Initialize storage if not already done
    initStorage({ path: "./database.yaml" });
    return getDatabase();
  }
};

type AddAccountFlags = {
  host?: string;
  "access-token"?: string;
  "refresh-token"?: string;
  "account-id"?: string;
  name?: string;
  email?: string;
};

type ListAccountsFlags = {
  format?: string;
  "show-tokens"?: boolean;
};

type RemoveAccountFlags = {
  host?: string;
  "account-id"?: string;
  force?: boolean;
};

type RefreshTokenFlags = {
  host?: string;
  "account-id"?: string;
  "client-id"?: string;
  "client-secret"?: string;
};

export const addAccount = async (flags: AddAccountFlags): Promise<void | Error> => {
  if (!flags.host || !flags["access-token"] || !flags.name || !flags.email) {
    logger.error(colors.red("❌ Missing required parameters: host, access-token, name, and email are required"));
    return new Error("Missing required parameters");
  }

  logger.info(colors.cyan("💾 Adding new GitLab account..."));

  try {
    const userId = randomUUID();
    const accountId = flags["account-id"] || randomUUID();
    const now = new Date();

    const storage = ensureDatabase();

    // Create user record
    storage.upsertUser({
      id: userId,
      name: flags.name,
      email: flags.email,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create account record
    storage.insertAccount({
      id: randomUUID(),
      accountId: accountId,
      providerId: "gitlab",
      userId: userId,
      accessToken: flags["access-token"],
      refreshToken: flags["refresh-token"],
      createdAt: now,
      updatedAt: now,
    });

    logger.info(colors.green("✅ Account added successfully"));
    logger.info(`📍 Host: ${colors.bold(flags.host)}`);
    logger.info(`👤 Name: ${colors.bold(flags.name)}`);
    logger.info(`📧 Email: ${colors.bold(flags.email)}`);
    logger.info(`🆔 Account ID: ${colors.bold(accountId)}`);
  } catch (error) {
    logger.error(colors.red("❌ Failed to add account"));
    logger.error(error instanceof Error ? error.message : String(error));
    return error instanceof Error ? error : new Error(String(error));
  }
};

type ImportCSVFlags = {
  "users-file"?: string;
  "accounts-file"?: string;
};

export const importCSV = async (flags: ImportCSVFlags): Promise<void | Error> => {
  const logger = createLogger("ImportCSV");

  try {
    const { "users-file": usersFile, "accounts-file": accountsFile } = flags;

    // Validate required flags
    if (!usersFile && !accountsFile) {
      logger.error(colors.red("❌ At least one of --users-file or --accounts-file must be provided"));
      return new Error("At least one of --users-file or --accounts-file must be provided");
    }

    // Get storage
    const storage = ensureDatabase();

    let stats: ImportStats;

    if (usersFile && accountsFile) {
      // Import both
      logger.info(colors.cyan("📥 Importing users and accounts from CSV files..."));
      stats = await importFromCSV(storage, usersFile, accountsFile);
    } else if (usersFile) {
      // Import only users
      logger.info(colors.cyan("📥 Importing users from CSV file..."));
      stats = await importUsersFromCSV(storage, usersFile);
    } else {
      // Import only accounts
      logger.info(colors.cyan("📥 Importing accounts from CSV file..."));
      stats = await importAccountsFromCSV(storage, accountsFile!);
    }

    // Display results
    console.log(`\n${colors.bold("📊 Import Results:")}`);
    console.log(colors.bold("=================="));

    if (stats.usersProcessed > 0) {
      console.log(colors.cyan("\n👥 Users:"));
      console.log(`  ${colors.gray("Processed:")} ${colors.bold(String(stats.usersProcessed))}`);
      console.log(`  ${colors.green("Added:")}     ${colors.bold(String(stats.usersAdded))}`);
      console.log(`  ${colors.yellow("Updated:")}   ${colors.bold(String(stats.usersUpdated))}`);
      console.log(`  ${colors.gray("Skipped:")}   ${colors.bold(String(stats.usersSkipped))}`);
    }

    if (stats.accountsProcessed > 0) {
      console.log(colors.cyan("\n🔑 Accounts:"));
      console.log(`  ${colors.gray("Processed:")} ${colors.bold(String(stats.accountsProcessed))}`);
      console.log(`  ${colors.green("Added:")}     ${colors.bold(String(stats.accountsAdded))}`);
      console.log(`  ${colors.yellow("Updated:")}   ${colors.bold(String(stats.accountsUpdated))}`);
      console.log(`  ${colors.gray("Skipped:")}   ${colors.bold(String(stats.accountsSkipped))}`);
    }

    if (stats.errors.length > 0) {
      console.log(colors.red("\n⚠️  Errors:"));
      stats.errors.forEach((error, index) => {
        console.log(colors.red(`  ${index + 1}. ${error}`));
      });
      logger.warn(colors.yellow(`⚠️  Import completed with ${stats.errors.length} error(s)`));
      return new Error(`Import completed with ${stats.errors.length} error(s)`);
    }

    logger.info(colors.green("\n✅ Import completed successfully"));
  } catch (error) {
    logger.error(colors.red("❌ Import failed"));
    logger.error(error instanceof Error ? error.message : String(error));
    return error instanceof Error ? error : new Error(String(error));
  }
};

export const listAccounts = async (flags: ListAccountsFlags): Promise<void | Error> => {
  logger.info(colors.cyan("📋 Listing GitLab accounts..."));

  try {
    const storage = ensureDatabase();
    const accountsWithUsers = storage.getAccountsWithUsers();

    if (accountsWithUsers.length === 0) {
      logger.info(colors.yellow("📭 No accounts found"));
      return;
    }

    const accounts = accountsWithUsers.map((acc) => ({
      accountId: acc.accountId,
      name: acc.user.name,
      email: acc.user.email,
      accessToken: acc.accessToken,
      refreshToken: acc.refreshToken,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt,
    }));

    const format = flags.format || "table";
    const showTokens = flags["show-tokens"] || false;

    if (format === "json") {
      const output = accounts.map((acc) => ({
        accountId: acc.accountId,
        name: acc.name,
        email: acc.email,
        ...(showTokens && {
          accessToken: acc.accessToken,
          refreshToken: acc.refreshToken,
        }),
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
      }));
      logger.info(JSON.stringify(output, null, 2));
    } else if (format === "yaml") {
      // Simple YAML output without importing yaml library
      accounts.forEach((acc) => {
        logger.info(`- accountId: ${acc.accountId}`);
        logger.info(`  name: ${acc.name}`);
        logger.info(`  email: ${acc.email}`);
        if (showTokens) {
          logger.info(`  accessToken: ${acc.accessToken || "null"}`);
          logger.info(`  refreshToken: ${acc.refreshToken || "null"}`);
        }
        logger.info(`  createdAt: ${acc.createdAt?.toISOString()}`);
        logger.info(`  updatedAt: ${acc.updatedAt?.toISOString()}`);
      });
    } else {
      // Table format using treeify; group by user and show each account entry
      const tree: Record<string, Record<string, SafeRecord>> = {};
      accounts.forEach((acc) => {
        const userKey = `${acc.name} (${acc.email})`;
        if (!tree[userKey]) {
          tree[userKey] = {};
        }

        const accountLabel = `Account ${acc.accountId}`;
        const accountDetails: SafeRecord = {
          "Account ID": acc.accountId,
          Created: acc.createdAt?.toISOString(),
          Updated: acc.updatedAt?.toISOString(),
        };

        if (showTokens) {
          accountDetails["Access Token"] = acc.accessToken ? `${acc.accessToken.substring(0, 20)}...` : "None";
          accountDetails["Refresh Token"] = acc.refreshToken ? `${acc.refreshToken.substring(0, 20)}...` : "None";
        }

        tree[userKey]![accountLabel] = accountDetails;
      });

      logger.info(colors.bold("\n📋 GitLab Accounts:"));
      logger.info(treeify.asTree(tree as any, true, true));
    }

    logger.info(colors.green(`✅ Found ${accounts.length} account(s)`));
  } catch (error) {
    logger.error(colors.red("❌ Failed to list accounts"));
    logger.error(error instanceof Error ? error.message : String(error));
    return error instanceof Error ? error : new Error(String(error));
  }
};

export const removeAccount = async (flags: RemoveAccountFlags): Promise<void | Error> => {
  if (!flags.host && !flags["account-id"]) {
    logger.error(colors.red("❌ Either host or account-id must be provided"));
    return new Error("Either host or account-id must be provided");
  }

  logger.info(colors.cyan("🗑️  Removing GitLab account..."));

  try {
    const storage = ensureDatabase();

    // Find the account to remove
    let accountToRemove;
    if (flags["account-id"]) {
      accountToRemove = storage.findAccountByAccountId(flags["account-id"]);
    } else if (flags.host) {
      // Using host as email for now - this could be improved
      const userByEmail = storage.findUserByEmail(flags.host);
      if (userByEmail) {
        const userAccounts = storage.findAccountsByUserId(userByEmail.id);
        accountToRemove = userAccounts[0];
      }
    }

    if (!accountToRemove) {
      logger.error(colors.red("❌ Account not found"));
      return new Error("Account not found");
    }

    const userRecord = storage.findUserById(accountToRemove.userId);

    if (!flags.force) {
      logger.warn(colors.yellow("⚠️  About to remove account:"));
      logger.warn(`   Name: ${userRecord?.name || "Unknown"}`);
      logger.warn(`   Email: ${userRecord?.email || "Unknown"}`);
      logger.warn(`   Account ID: ${accountToRemove.accountId || "Unknown"}`);
      logger.warn(colors.red("   This action cannot be undone!"));

      // In a real CLI, this would prompt for confirmation
      // For now, we'll require the --force flag
      logger.error(colors.red("❌ Use --force to confirm account removal"));
      return new Error("Use --force to confirm account removal");
    }

    // Remove user (which will cascade remove accounts)
    storage.deleteUser(accountToRemove.userId);

    logger.info(colors.green("✅ Account removed successfully"));
    logger.info(`👤 Removed: ${colors.bold(userRecord?.name || "Unknown")} (${userRecord?.email || "Unknown"})`);
  } catch (error) {
    logger.error(colors.red("❌ Failed to remove account"));
    logger.error(error instanceof Error ? error.message : String(error));
    return error instanceof Error ? error : new Error(String(error));
  }
};

export const refreshToken = async (flags: RefreshTokenFlags, _positionals?: string[]): Promise<void | Error> => {
  if (!flags.host && !flags["account-id"]) {
    logger.error(colors.red("❌ Either host or account-id must be provided"));
    return new Error("Either host or account-id must be provided");
  }

  if (!flags["client-id"] || !flags["client-secret"]) {
    logger.error(colors.red("❌ OAuth2 client-id and client-secret are required"));
    return new Error("OAuth2 client-id and client-secret are required");
  }

  logger.info(colors.cyan("🔄 Refreshing OAuth2 tokens..."));

  try {
    const storage = ensureDatabase();

    // Find the account
    let accountToRefresh;
    if (flags["account-id"]) {
      accountToRefresh = storage.findAccountByAccountId(flags["account-id"]);
    } else {
      accountToRefresh = storage.findAccountByAccountId(flags.host!);
    }

    if (!accountToRefresh) {
      logger.error(colors.red("❌ Account not found"));
      return new Error("Account not found");
    }

    if (!accountToRefresh.refreshToken) {
      logger.error(colors.red("❌ No refresh token available for this account"));
      return new Error("No refresh token available for this account");
    }

    // Implementing OAuth2 token refresh
    const tokenEndpoint = "https://gitlab.example.com/oauth/token";
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: accountToRefresh.refreshToken,
        client_id: flags["client-id"],
        client_secret: flags["client-secret"],
      }),
    });

    if (!response.ok) {
      logger.error(colors.red(`❌ Failed to refresh token: ${response.statusText}`));
      throw new Error("Token refresh failed");
    }

    const data = (await response.json()) as any;

    // Update tokens in storage
    storage.updateAccount(accountToRefresh.accountId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    });

    logger.info(colors.green("✅ Token refreshed successfully"));
    logger.info(`🔑 New Access Token: ${data.access_token}`);
    logger.info("🔄 Refresh Token Updated");
  } catch (error) {
    logger.error(colors.red("❌ Failed to refresh tokens"));
    logger.error(error instanceof Error ? error.message : String(error));
    return error instanceof Error ? error : new Error(String(error));
  }
};
