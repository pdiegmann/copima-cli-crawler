// src/auth/tokenManager.ts

import { addSeconds } from "date-fns";
import { eq } from "drizzle-orm";
import { account } from "../db/schema";
import { createLogger } from "../logging";
import type { OAuth2TokenResponse } from "../types/api";

const logger = createLogger("TokenManager");

export class TokenManager {
  private readonly db: any;

  constructor(db?: any) {
    this.db = db;
  }

  async getValidToken(accountId: string = "default"): Promise<string | null> {
    return await this.getAccessToken(accountId);
  }

  async getAccessToken(accountId: string): Promise<string | null> {
    try {
      const [accountRecord] = await this.db.select().from(account).where(eq(account.accountId, accountId)).limit(1);

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

  // eslint-disable-next-line sonarjs/no-invariant-returns
  async refreshAccessToken(accountId: string): Promise<string | null> {
    try {
      const [accountRecord] = await this.db.select().from(account).where(eq(account.accountId, accountId)).limit(1);

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

    await this.db
      .update(account)
      .set({
        accessToken: tokenResponse.access_token,
        accessTokenExpiresAt,
        refreshToken: tokenResponse.refresh_token,
        refreshTokenExpiresAt,
        updatedAt: now,
      })
      .where(eq(account.accountId, accountId));

    logger.info(`Tokens updated for account ${accountId}`);
  }
}
