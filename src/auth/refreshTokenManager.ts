// src/auth/refreshTokenManager.ts

import { Database } from "../db/connection";
import { logger } from "../utils/logger";
import { OAuth2TokenResponse } from "../types";
import { addSeconds } from "date-fns";

export class RefreshTokenManager {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async updateRefreshToken(accountId: string, tokenResponse: OAuth2TokenResponse): Promise<void> {
    const now = new Date();
    const refreshTokenExpiresAt = tokenResponse.refresh_expires_in ? addSeconds(now, tokenResponse.refresh_expires_in) : null;

    await this.db.account.update({
      where: { accountId },
      data: {
        refreshToken: tokenResponse.refresh_token,
        refreshTokenExpiresAt,
      },
    });

    logger.info(`Refresh token updated for account ${accountId}`);
  }

  async invalidateRefreshToken(accountId: string): Promise<void> {
    await this.db.account.update({
      where: { accountId },
      data: {
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });

    logger.info(`Refresh token invalidated for account ${accountId}`);
  }

  async validateRefreshToken(accountId: string): Promise<boolean> {
    const account = await this.db.account.findUnique({ where: { accountId } });
    if (!account) {
      logger.error(`Account with ID ${accountId} not found.`);
      return false;
    }

    if (!account.refreshToken || !account.refreshTokenExpiresAt) {
      logger.error(`Refresh token or expiration missing for account ${accountId}`);
      return false;
    }

    const now = new Date();
    if (now > new Date(account.refreshTokenExpiresAt)) {
      logger.error(`Refresh token expired for account ${accountId}`);
      return false;
    }

    return true;
  }
}
