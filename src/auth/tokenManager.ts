// src/auth/tokenManager.ts

import { addSeconds } from "date-fns";
import type { YamlStorage } from "../account/yamlStorage";
import { createLogger } from "../logging";
import type { OAuth2TokenResponse } from "../types/api";

const logger = createLogger("TokenManager");

export class TokenManager {
  private readonly db: YamlStorage;

  constructor(db: YamlStorage) {
    this.db = db;
  }

  async getValidToken(accountId?: string): Promise<string | null> {
    const resolvedAccountId = await this.resolveAccountId(accountId);
    if (!resolvedAccountId) {
      return null;
    }

    return await this.getAccessToken(resolvedAccountId);
  }

  async getAccessToken(accountId: string): Promise<string | null> {
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

  async resolveAccountId(accountId?: string): Promise<string | null> {
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
  async refreshAccessToken(accountId: string): Promise<string | null> {
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

  private async updateTokens(accountId: string, tokenResponse: OAuth2TokenResponse): Promise<void> {
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
