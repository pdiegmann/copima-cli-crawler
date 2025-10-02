// src/auth/refreshTokenManager.ts

import { addSeconds } from "date-fns";
import type { YamlStorage } from "../db/yamlStorage";
import { createLogger } from "../logging/logger";
import type { OAuth2TokenResponse } from "../types/api";

const logger = createLogger("RefreshTokenManager");

export class RefreshTokenManager {
  private readonly db: YamlStorage;

  constructor(db: YamlStorage) {
    this.db = db;
  }

  async updateRefreshToken(accountId: string, tokenResponse: OAuth2TokenResponse): Promise<void> {
    const now = new Date();
    const refreshTokenExpiresAt = tokenResponse.refresh_expires_in ? addSeconds(now, tokenResponse.refresh_expires_in) : null;

    this.db.updateAccount(accountId, {
      refreshToken: tokenResponse.refresh_token,
      refreshTokenExpiresAt,
    });

    logger.info(`Refresh token updated for account ${accountId}`);
  }

  async invalidateRefreshToken(accountId: string): Promise<void> {
    this.db.updateAccount(accountId, {
      refreshToken: null,
      refreshTokenExpiresAt: null,
    });

    logger.info(`Refresh token invalidated for account ${accountId}`);
  }

  async validateRefreshToken(accountId: string): Promise<boolean> {
    const account = this.db.findAccountByAccountId(accountId);
    if (!account) {
      logger.error(`Account with ID ${accountId} not found.`);
      return false;
    }

    if (!account.refreshToken || !account.refreshTokenExpiresAt) {
      logger.error(`Refresh token or expiration missing for account ${accountId}`);
      return false;
    }

    const now = new Date();
    const expiresAt = account.refreshTokenExpiresAt;
    if (!expiresAt || !(typeof expiresAt === "string" || typeof expiresAt === "number" || expiresAt instanceof Date)) {
      logger.error(`Invalid refreshTokenExpiresAt value for account ${accountId}`);
      return false;
    }
    if (now > new Date(expiresAt)) {
      logger.error(`Refresh token expired for account ${accountId}`);
      return false;
    }

    return true;
  }
}
