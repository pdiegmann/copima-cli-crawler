// src/auth/tokenManager.ts

import { addSeconds } from "date-fns";
import type { YamlStorage } from "../account/yamlStorage";
import { createLogger } from "../logging";
import type { OAuth2TokenResponse } from "../types/api";

const logger = createLogger("TokenManager");

export type TokenSource = {
  token: string;
  source: "pat" | "oauth2" | "flag" | "config";
  accountId?: string;
};

export class TokenManager {
  private readonly db: YamlStorage;

  constructor(db: YamlStorage) {
    this.db = db;
  }

  /**
   * Get a valid token with priority:
   * 1. PAT (Personal Access Token) - passed as parameter
   * 2. OAuth2 token from YAML storage - looked up by accountId
   * 3. OAuth2 token from explicit access/refresh tokens - stored if provided
   */
  async getValidToken(options: {
    pat?: string;
    accountId?: string;
    accessToken?: string;
    refreshToken?: string;
  }) {
    // Priority 1: PAT (never stored, just used)
    if (options.pat) {
      logger.debug("Using Personal Access Token (PAT)");
      return { token: options.pat, source: "pat" as const };
    }

    // Priority 2: OAuth2 tokens explicitly provided (store and use)
    if (options.accessToken && options.refreshToken && options.accountId) {
      logger.debug(`Storing and using OAuth2 tokens for account ${options.accountId}`);
      await this.storeOAuth2Tokens(options.accountId, options.accessToken, options.refreshToken);
      return { token: options.accessToken, source: "oauth2" as const, accountId: options.accountId };
    }

    // Priority 3: Look up OAuth2 tokens from YAML storage
    const resolvedAccountId = await this.resolveAccountId(options.accountId);
    if (!resolvedAccountId) {
      return null;
    }

    const token = await this.getAccessToken(resolvedAccountId);
    if (!token) {
      return null;
    }

    return { token, source: "oauth2" as const, accountId: resolvedAccountId };
  }

  /**
   * Store OAuth2 tokens for an account
   */
  private async storeOAuth2Tokens(accountId: string, accessToken: string, refreshToken: string) {
    const { randomUUID } = await import("node:crypto");
    const now = new Date();

    // Check if account already exists
    const existingAccount = this.db.findAccountByAccountId(accountId);

    if (existingAccount) {
      // Update existing account
      this.db.updateAccount(accountId, {
        accessToken,
        refreshToken,
        updatedAt: now,
      });
      logger.info(`Updated OAuth2 tokens for account ${accountId}`);
    } else {
      // Create new account
      // First ensure a user exists
      const userId = randomUUID();
      const userEmail = `${accountId}@local`;

      // Try to find existing user or create new one
      let existingUser = this.db.findUserByEmail(userEmail);
      if (!existingUser) {
        // Create a default user
        const user = {
          id: userId,
          name: "Default User",
          email: userEmail,
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
        };
        existingUser = this.db.upsertUser(user);
      }

      this.db.insertAccount({
        id: randomUUID(),
        accountId,
        providerId: "gitlab",
        userId: existingUser.id,
        accessToken,
        refreshToken,
        createdAt: now,
        updatedAt: now,
      });
      logger.info(`Stored OAuth2 tokens for new account ${accountId}`);
    }
  }

  async getAccessToken(accountId: string) {
    try {
      const accountRecord = this.db.findAccountByAccountId(accountId);

      if (!accountRecord) {
        logger.error(`Account with ID ${accountId} not found.`);
        return null;
      }

      if (!accountRecord.accessToken || !accountRecord.accessTokenExpiresAt) {
        logger.error(`Access token or expiration missing for account ${accountId}`);
        return null;
      }

      const now = new Date();
      if (now < new Date(accountRecord.accessTokenExpiresAt)) {
        return accountRecord.accessToken;
      }

      return await this.refreshAccessToken(accountId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to get access token for account ${accountId}: ${errorMessage}`);
      return null;
    }
  }

  async resolveAccountId(accountId?: string) {
    try {
      if (accountId) {
        const accountRecord = this.db.findAccountByAccountId(accountId);

        if (!accountRecord) {
          logger.error(`Account with ID ${accountId} not found.`);
          return null;
        }

        return accountId;
      }

      const defaultAccountRecord = this.db.findAccountByAccountId("default");

      if (defaultAccountRecord) {
        return defaultAccountRecord.accountId;
      }

      const accounts = this.db.getAllAccounts();

      if (accounts.length === 0) {
        logger.error("No stored accounts found. Please run 'copima auth' to authenticate.");
        return null;
      }

      const accountsWithTokens = accounts.filter((acc) => acc.accessToken && acc.refreshToken);
      const candidateAccounts = accountsWithTokens.length > 0 ? accountsWithTokens : accounts;

      if (candidateAccounts.length === 1) {
        const soleAccountId = candidateAccounts[0]!.accountId;
        logger.info(`Auto-selected sole stored account '${soleAccountId}'.`);
        return soleAccountId;
      }

      const uniqueUserIds = new Set(candidateAccounts.map((acc) => acc.userId));

      if (uniqueUserIds.size === 1) {
        const toEpoch = (value: unknown): number => {
          if (value instanceof Date) {
            return value.getTime();
          }
          if (typeof value === "number") {
            return value;
          }
          if (typeof value === "string") {
            const parsed = Date.parse(value);
            return Number.isNaN(parsed) ? 0 : parsed;
          }
          return 0;
        };

        const sortedAccounts = [...candidateAccounts].sort((a, b) => toEpoch(b.updatedAt) - toEpoch(a.updatedAt));
        const chosenAccountId = sortedAccounts[0]!.accountId;
        logger.info(`Auto-selected most recent account '${chosenAccountId}' for user '${sortedAccounts[0]!.userId}'. Detected ${candidateAccounts.length} stored account entries.`);
        return chosenAccountId;
      }

      logger.error("Multiple accounts found across different users. Please specify an account ID with --account-id.");
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to resolve account ID: ${errorMessage}`);
      return null;
    }
  }

  // eslint-disable-next-line sonarjs/no-invariant-returns
  async refreshAccessToken(accountId: string) {
    try {
      const accountRecord = this.db.findAccountByAccountId(accountId);

      if (!accountRecord?.refreshToken) {
        logger.error(`Cannot refresh token for account ${accountId}. Refresh token missing.`);
        return null;
      }

      // For now, return null since we don't have the refresh implementation
      // This will be implemented when we have the OAuth2 refresh flow working
      logger.warn(`Token refresh not yet implemented for account ${accountId}`);
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to refresh access token for account ${accountId}: ${errorMessage}`);
      return null;
    }
  }

  private async updateTokens(accountId: string, tokenResponse: OAuth2TokenResponse) {
    const now = new Date();
    const accessTokenExpiresAt = addSeconds(now, tokenResponse.expires_in);
    const refreshTokenExpiresAt = tokenResponse.refresh_expires_in ? addSeconds(now, tokenResponse.refresh_expires_in) : null;

    this.db.updateAccount(accountId, {
      accessToken: tokenResponse.access_token,
      accessTokenExpiresAt,
      refreshToken: tokenResponse.refresh_token,
      refreshTokenExpiresAt,
      updatedAt: now,
    });

    logger.info(`Tokens updated for account ${accountId}`);
  }
}
