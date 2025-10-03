import type { OAuth2RefreshRequest, OAuth2RefreshResponse, OAuth2TokenResponse } from "../types/api";
import { OAuth2Manager, createOAuth2Manager, type OAuth2Config } from "./oauth2Manager";

// Mock fetch globally
global.fetch = jest.fn() as any;

describe("OAuth2Manager", () => {
  let manager: OAuth2Manager;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  const defaultConfig: OAuth2Config = {
    enabled: true,
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    tokenEndpoint: "https://example.com/oauth/token",
    refreshThreshold: 300,
    maxRetries: 3,
  };

  beforeEach(() => {
    manager = new OAuth2Manager(defaultConfig);
    jest.clearAllMocks();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe("refreshAccessToken", () => {
    const mockRefreshRequest: OAuth2RefreshRequest = {
      refreshToken: "test-refresh-token",
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
    };

    const mockRefreshResponse: OAuth2RefreshResponse = {
      access_token: "new-access-token",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "new-refresh-token",
      scope: "api read_user",
    };

    it("should successfully refresh access token", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRefreshResponse,
      } as Response);

      const result = await manager.refreshAccessToken(mockRefreshRequest);

      expect(result).toEqual(mockRefreshResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        defaultConfig.tokenEndpoint,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        })
      );
    });

    it("should throw error when OAuth2 is not enabled", async () => {
      const disabledManager = new OAuth2Manager({ ...defaultConfig, enabled: false });

      await expect(disabledManager.refreshAccessToken(mockRefreshRequest)).rejects.toThrow(
        "OAuth2 is not enabled"
      );
    });

    it("should throw error when token endpoint not configured", async () => {
      const noEndpointManager = new OAuth2Manager({
        ...defaultConfig,
        tokenEndpoint: undefined,
      });

      await expect(noEndpointManager.refreshAccessToken(mockRefreshRequest)).rejects.toThrow(
        "Token endpoint not configured"
      );
    });

    it("should include scope in request when provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRefreshResponse,
      } as Response);

      await manager.refreshAccessToken({
        ...mockRefreshRequest,
        scope: "custom-scope",
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = callArgs?.[1]?.body as string;
      expect(body).toContain("scope=custom-scope");
    });

    it("should use config clientId/clientSecret when not provided in request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockRefreshResponse,
      } as Response);

      await manager.refreshAccessToken({
        refreshToken: "test-refresh-token",
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = callArgs?.[1]?.body as string;
      expect(body).toContain(`client_id=${defaultConfig.clientId}`);
      expect(body).toContain(`client_secret=${defaultConfig.clientSecret}`);
    });

    it("should handle fetch errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(manager.refreshAccessToken(mockRefreshRequest)).rejects.toThrow();
    });
  });

  describe("isTokenExpired", () => {
    it("should return false when token has no expiry info", () => {
      const token = {
        access_token: "test-token",
        token_type: "Bearer",
      } as OAuth2TokenResponse;

      expect(manager.isTokenExpired(token)).toBe(false);
    });

    it("should return true when token is expired", () => {
      const pastTime = new Date(Date.now() - 10000).toISOString();
      const token = {
        access_token: pastTime,
        token_type: "Bearer",
        expires_in: 1, // 1 second
      } as OAuth2TokenResponse;

      expect(manager.isTokenExpired(token)).toBe(true);
    });

    it("should return true when token expires within threshold", () => {
      const nowTime = new Date().toISOString();
      const token = {
        access_token: nowTime,
        token_type: "Bearer",
        expires_in: 200, // 200 seconds (less than default 300 threshold)
      } as OAuth2TokenResponse;

      expect(manager.isTokenExpired(token)).toBe(true);
    });

    it("should use custom threshold when provided", () => {
      const nowTime = new Date().toISOString();
      const token = {
        access_token: nowTime,
        token_type: "Bearer",
        expires_in: 250,
      } as OAuth2TokenResponse;

      expect(manager.isTokenExpired(token, 100)).toBe(false);
      expect(manager.isTokenExpired(token, 400)).toBe(true);
    });
  });

  describe("clearTokenRefreshTimer", () => {
    it("should do nothing when timer does not exist", () => {
      expect(() => manager.clearTokenRefreshTimer("nonexistent")).not.toThrow();
    });
  });

  describe("clearAllTimers", () => {
    it("should not throw when clearing with no timers", () => {
      expect(() => manager.clearAllTimers()).not.toThrow();
    });
  });

  describe("updateConfig", () => {
    it("should update configuration", () => {
      manager.updateConfig({
        refreshThreshold: 600,
        maxRetries: 5,
      });

      const config = manager.getConfig();
      expect(config.refreshThreshold).toBe(600);
      expect(config.maxRetries).toBe(5);
    });

    it("should preserve existing config values", () => {
      manager.updateConfig({ refreshThreshold: 600 });

      const config = manager.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.clientId).toBe("test-client-id");
    });
  });

  describe("getConfig", () => {
    it("should return config without client secret", () => {
      const config = manager.getConfig();

      expect(config).toHaveProperty("enabled");
      expect(config).toHaveProperty("clientId");
      expect(config).toHaveProperty("tokenEndpoint");
      expect(config).toHaveProperty("refreshThreshold");
      expect(config).toHaveProperty("maxRetries");
      expect(config).not.toHaveProperty("clientSecret");
    });
  });

  describe("isConfigured", () => {
    it("should return true when fully configured", () => {
      expect(manager.isConfigured()).toBe(true);
    });

    it("should return false when OAuth2 is disabled", () => {
      manager.updateConfig({ enabled: false });
      expect(manager.isConfigured()).toBe(false);
    });

    it("should return false when token endpoint is missing", () => {
      const noEndpointManager = new OAuth2Manager({
        ...defaultConfig,
        tokenEndpoint: undefined,
      });
      expect(noEndpointManager.isConfigured()).toBe(false);
    });

    it("should return false when client ID is missing", () => {
      const noClientIdManager = new OAuth2Manager({
        ...defaultConfig,
        clientId: undefined,
      });
      expect(noClientIdManager.isConfigured()).toBe(false);
    });

    it("should return false when client secret is missing", () => {
      const noClientSecretManager = new OAuth2Manager({
        ...defaultConfig,
        clientSecret: undefined,
      });
      expect(noClientSecretManager.isConfigured()).toBe(false);
    });
  });

  describe("destroy", () => {
    it("should not throw when destroying", () => {
      expect(() => manager.destroy()).not.toThrow();
    });
  });
});

describe("createOAuth2Manager", () => {
  it("should create manager with default configuration", () => {
    const manager = createOAuth2Manager();

    const config = manager.getConfig();
    expect(config.enabled).toBe(false);
    expect(config.refreshThreshold).toBe(300);
    expect(config.maxRetries).toBe(3);
  });

  it("should create manager with custom configuration", () => {
    const manager = createOAuth2Manager({
      enabled: true,
      clientId: "custom-client-id",
      tokenEndpoint: "https://custom.com/token",
      refreshThreshold: 600,
      maxRetries: 5,
    });

    const config = manager.getConfig();
    expect(config.enabled).toBe(true);
    expect(config.clientId).toBe("custom-client-id");
    expect(config.tokenEndpoint).toBe("https://custom.com/token");
    expect(config.refreshThreshold).toBe(600);
    expect(config.maxRetries).toBe(5);
  });

  it("should merge custom config with defaults", () => {
    const manager = createOAuth2Manager({
      enabled: true,
      clientId: "test-id",
    });

    const config = manager.getConfig();
    expect(config.enabled).toBe(true);
    expect(config.clientId).toBe("test-id");
    expect(config.refreshThreshold).toBe(300); // Default
    expect(config.maxRetries).toBe(3); // Default
  });
});
