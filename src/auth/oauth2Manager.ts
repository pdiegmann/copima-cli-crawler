import { createLogger } from "../logging/logger";
import type { OAuth2RefreshRequest, OAuth2RefreshResponse, OAuth2TokenResponse } from "../types/api.js";

const logger = createLogger("OAuth2Manager");

export type OAuth2Config = {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  tokenEndpoint?: string;
  refreshThreshold: number; // seconds before expiry to refresh
  maxRetries: number;
};

export class OAuth2Manager {
  private config: OAuth2Config;
  private readonly refreshTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: OAuth2Config) {
    this.config = config;
  }

  /**
   * Refresh an access token using a refresh token
   */
  async refreshAccessToken(refreshRequest: OAuth2RefreshRequest): Promise<OAuth2RefreshResponse> {
    if (!this.config.enabled) {
      throw new Error("OAuth2 is not enabled");
    }

    if (!this.config.tokenEndpoint) {
      throw new Error("Token endpoint not configured");
    }

    const { refreshToken, clientId, clientSecret, scope } = refreshRequest;

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId || this.config.clientId || "",
      client_secret: clientSecret || this.config.clientSecret || "",
      ...(scope && { scope }),
    });

    let lastError: Error;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(this.config.tokenEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`OAuth2 refresh failed: ${response.status} - ${errorData}`);
        }

        const tokenData = (await response.json()) as OAuth2RefreshResponse;

        logger.info("OAuth2 token refreshed successfully", {
          expiresIn: tokenData.expires_in,
          scope: tokenData.scope,
        });

        return tokenData;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`OAuth2 refresh attempt ${attempt + 1} failed:`, { error: lastError.message });

        if (attempt < this.config.maxRetries - 1) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    logger.error("OAuth2 refresh failed after all retries", { error: lastError!.message });
    throw lastError!;
  }

  /**
   * Check if a token is expired or about to expire
   */
  isTokenExpired(token: OAuth2TokenResponse, customThreshold?: number): boolean {
    if (!token.expires_in) {
      return false; // If no expiry info, assume it's still valid
    }

    const threshold = customThreshold ?? this.config.refreshThreshold;
    const now = Date.now();
    const expiresAt = new Date(token.access_token).getTime() + token.expires_in * 1000;

    return expiresAt - now <= threshold * 1000;
  }

  /**
   * Schedule automatic token refresh before expiration
   */
  scheduleTokenRefresh(accountId: string, token: OAuth2TokenResponse, onRefresh: (newToken: OAuth2RefreshResponse) => Promise<void>): void {
    // Clear existing timer if any
    this.clearTokenRefreshTimer(accountId);

    if (!token.expires_in || !token.refresh_token) {
      logger.debug("Cannot schedule refresh: missing expiry or refresh token", { accountId });
      return;
    }

    // Calculate when to refresh (threshold seconds before expiry)
    const refreshDelayMs = (token.expires_in - this.config.refreshThreshold) * 1000;

    if (refreshDelayMs <= 0) {
      logger.debug("Token expires too soon to schedule refresh", { accountId });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        logger.info("Starting scheduled token refresh", { accountId });

        const refreshedToken = await this.refreshAccessToken({
          refreshToken: token.refresh_token,
          clientId: this.config.clientId,
          clientSecret: this.config.clientSecret,
        });

        await onRefresh(refreshedToken);

        // Schedule next refresh
        this.scheduleTokenRefresh(
          accountId,
          {
            ...token,
            ...refreshedToken,
          },
          onRefresh
        );
      } catch (error) {
        logger.error("Scheduled token refresh failed", {
          accountId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, refreshDelayMs);

    this.refreshTimers.set(accountId, timer);

    logger.debug("Token refresh scheduled", {
      accountId,
      refreshInSeconds: Math.round(refreshDelayMs / 1000),
    });
  }

  /**
   * Clear scheduled token refresh for an account
   */
  clearTokenRefreshTimer(accountId: string): void {
    const timer = this.refreshTimers.get(accountId);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(accountId);
      logger.debug("Token refresh timer cleared", { accountId });
    }
  }

  /**
   * Clear all scheduled token refreshes
   */
  clearAllTimers(): void {
    for (const [accountId, timer] of this.refreshTimers.entries()) {
      clearTimeout(timer);
      logger.debug("Token refresh timer cleared", { accountId });
    }
    this.refreshTimers.clear();
  }

  /**
   * Update OAuth2 configuration
   */
  updateConfig(newConfig: Partial<OAuth2Config>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info("OAuth2 configuration updated", {
      enabled: this.config.enabled,
      hasClientId: !!this.config.clientId,
      hasTokenEndpoint: !!this.config.tokenEndpoint,
      refreshThreshold: this.config.refreshThreshold,
      maxRetries: this.config.maxRetries,
    });
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<OAuth2Config, "clientSecret"> {
    // eslint-disable-next-line sonarjs/no-unused-vars
    const { clientSecret: _clientSecret, ...safeConfig } = this.config;
    return safeConfig;
  }

  /**
   * Check if OAuth2 is enabled and properly configured
   */
  isConfigured(): boolean {
    return this.config.enabled && !!this.config.tokenEndpoint && !!this.config.clientId && !!this.config.clientSecret;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearAllTimers();
    logger.debug("OAuth2Manager destroyed");
  }
}

/**
 * Create OAuth2Manager with default configuration
 */
export const createOAuth2Manager = (config: Partial<OAuth2Config> = {}): OAuth2Manager => {
  const defaultConfig: OAuth2Config = {
    enabled: false,
    refreshThreshold: 300, // 5 minutes before expiry
    maxRetries: 3,
    ...config,
  };

  return new OAuth2Manager(defaultConfig);
};
