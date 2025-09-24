// src/auth/tokenManager.ts

import { addSeconds } from "date-fns";
import type { OAuth2TokenResponse } from "../types/api";
import logger from "../utils/logger";

export class TokenManager {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async getAccessToken(accountId: string): Promise<string | null> {
    const account = await this.db.account.findUnique({ where: { accountId } });
    if (!account) {
      logger.error(`Account with ID ${accountId} not found.`);
      return null;
    }

    if (!account.accessToken || !account.accessTokenExpiresAt) {
      logger.error(`Access token or expiration missing for account ${accountId}`);
      return null;
    }

    const now = new Date();
    if (now < new Date(account.accessTokenExpiresAt)) {
      return account.accessToken;
    }

    return await this.refreshAccessToken(accountId);
  }

  private async refreshAccessToken(accountId: string): Promise<string | null> {
    const account = await this.db.account.findUnique({ where: { accountId } });
    if (!account || !account.refreshToken) {
      logger.error(`Cannot refresh token for account ${accountId}. Refresh token missing.`);
      return null;
    }

    try {
      const response = await this.fetchNewTokens();
      await this.updateTokens(accountId, response);
      return response.access_token;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to refresh access token for account ${accountId}: ${errorMessage}`);
      return null;
    }
  }

  private async fetchNewTokens(): Promise<OAuth2TokenResponse> {
    // Replace with actual API call
    throw new Error("fetchNewTokens not implemented");
  }

  private async updateTokens(accountId: string, tokenResponse: OAuth2TokenResponse): Promise<void> {
    const now = new Date();
    const accessTokenExpiresAt = addSeconds(now, tokenResponse.expires_in);
    const refreshTokenExpiresAt = tokenResponse.refresh_expires_in ? addSeconds(now, tokenResponse.refresh_expires_in) : null;

    await this.db.account.update({
      where: { accountId },
      data: {
        accessToken: tokenResponse.access_token,
        accessTokenExpiresAt,
        refreshToken: tokenResponse.refresh_token,
        refreshTokenExpiresAt,
      },
    });

    logger.info(`Tokens updated for account ${accountId}`);
  }
}
