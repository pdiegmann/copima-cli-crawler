import crypto from "node:crypto";
import type { AuthCommandFlags } from "../../types/commands.js";
import { executeAuthFlow } from "./impl.js";

// Mock dependencies
jest.mock("open", () => jest.fn());
jest.mock("node:crypto", () => ({
  randomBytes: jest.fn(() => Buffer.from("mock-random-bytes")),
}));

// Mock OAuth2Server
jest.mock("../../auth/oauth2Server.js", () => ({
  OAuth2Server: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    getCallbackUrl: jest.fn(() => "http://localhost:3001/callback"),
    waitForCallback: jest.fn(),
  })),
}));

// Mock OAuth2 providers
jest.mock("../../auth/oauth2Providers.js", () => ({
  getProviderConfig: jest.fn(),
  validateProviderConfig: jest.fn(() => true),
  buildOAuth2Config: jest.fn(),
}));

// Mock OAuth2Manager
jest.mock("../../auth/oauth2Manager.js", () => ({
  OAuth2Manager: jest.fn().mockImplementation(() => ({
    scheduleTokenRefresh: jest.fn(),
  })),
}));

// Mock logger
jest.mock("../../logging/logger.js", () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock picocolors
jest.mock("picocolors", () => ({
  blue: (text: string) => text,
  green: (text: string) => text,
  yellow: (text: string) => text,
  red: (text: string) => text,
  dim: (text: string) => text,
  bold: (text: string) => text,
  underline: (text: string) => text,
}));

// Mock process.exit
const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {
  throw new Error("process.exit called");
});

describe("Auth Command Implementation", () => {
  const mockFetch = jest.fn() as any;
  const mockOpen = require("open") as jest.Mock;
  const mockCrypto = crypto as jest.Mocked<typeof crypto>;

  // Import mocked modules
  const { OAuth2Server } = require("../../auth/oauth2Server.js");
  const { getProviderConfig, buildOAuth2Config, validateProviderConfig } = require("../../auth/oauth2Providers.js");
  const { OAuth2Manager } = require("../../auth/oauth2Manager.js");

  let mockServer: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockExit.mockClear();

    // Setup global fetch mock
    global.fetch = mockFetch;

    // Setup server mock
    mockServer = {
      start: jest.fn(),
      stop: jest.fn(),
      getCallbackUrl: jest.fn(() => "http://localhost:3001/callback"),
      waitForCallback: jest.fn(),
    };
    OAuth2Server.mockImplementation(() => mockServer);

    // Setup provider config mock
    getProviderConfig.mockReturnValue({
      name: "GitLab",
      authorizationUrl: "https://gitlab.com/oauth/authorize",
      tokenUrl: "https://gitlab.com/oauth/token",
      defaultScopes: ["api", "read_user"],
    });

    buildOAuth2Config.mockReturnValue({
      clientId: "test_client_id",
      clientSecret: "test_client_secret",
      authorizationUrl: "https://gitlab.com/oauth/authorize",
      tokenUrl: "https://gitlab.com/oauth/token",
      scopes: "api,read_user",
      redirectUri: "http://localhost:3001/callback",
    });

    // Setup crypto mock
    mockCrypto.randomBytes.mockImplementation(() => Buffer.from("mock-random-bytes"));
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  describe("Successful OAuth2 Flow", () => {
    it("should complete full OAuth2 flow successfully", async () => {
      const flags: AuthCommandFlags = {
        provider: "gitlab",
        "client-id": "test_client_id",
        "client-secret": "test_client_secret",
        port: 3001,
        timeout: 300,
      };

      // Mock successful callback
      mockServer.waitForCallback.mockResolvedValue({
        code: "test_authorization_code",
        state: "6d6f636b2d72616e646f6d2d6279746573", // hex of "mock-random-bytes"
      });

      // Mock successful token exchange
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "test_access_token",
            token_type: "Bearer",
            expires_in: 3600,
            refresh_token: "test_refresh_token",
            scope: "api read_user",
          }),
      });

      await executeAuthFlow(flags);

      // Verify server lifecycle
      expect(mockServer.start).toHaveBeenCalled();
      expect(mockServer.stop).toHaveBeenCalled();

      // Verify browser opening
      expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining("gitlab.com/oauth/authorize"));

      // Verify token exchange
      expect(mockFetch).toHaveBeenCalledWith(
        "https://gitlab.com/oauth/token",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
          }),
        })
      );
    });

    it("should handle custom scopes", async () => {
      const flags: AuthCommandFlags = {
        provider: "gitlab",
        "client-id": "test_client_id",
        "client-secret": "test_client_secret",
        scopes: "read_user,read_repository",
      };

      mockServer.waitForCallback.mockResolvedValue({
        code: "test_code",
        state: "6d6f636b2d72616e646f6d2d6279746573",
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "test_token",
            token_type: "Bearer",
          }),
      });

      await executeAuthFlow(flags);

      expect(buildOAuth2Config).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          scopes: "read_user,read_repository",
        })
      );
    });

    it("should use environment variables when flags not provided", async () => {
      process.env["OAUTH2_CLIENT_ID"] = "env_client_id";
      process.env["OAUTH2_CLIENT_SECRET"] = "env_client_secret";

      const flags: AuthCommandFlags = {
        provider: "gitlab",
      };

      mockServer.waitForCallback.mockResolvedValue({
        code: "test_code",
        state: "6d6f636b2d72616e646f6d2d6279746573",
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "test_token",
            token_type: "Bearer",
          }),
      });

      await executeAuthFlow(flags);

      expect(buildOAuth2Config).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          clientId: "env_client_id",
          clientSecret: "env_client_secret",
        })
      );

      // Cleanup
      delete process.env["OAUTH2_CLIENT_ID"];
      delete process.env["OAUTH2_CLIENT_SECRET"];
    });
  });

  describe("Error Handling", () => {
    it("should handle unsupported provider", async () => {
      getProviderConfig.mockReturnValue(null);

      const flags: AuthCommandFlags = {
        provider: "unsupported",
        "client-id": "test_id",
        "client-secret": "test_secret",
      };

      await expect(async () => {
        await executeAuthFlow(flags);
      }).rejects.toThrow("process.exit called");

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should handle missing client credentials", async () => {
      const flags: AuthCommandFlags = {
        provider: "gitlab",
      };

      await expect(async () => {
        await executeAuthFlow(flags);
      }).rejects.toThrow("process.exit called");

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should handle server startup failure", async () => {
      mockServer.start.mockRejectedValue(new Error("Port in use"));

      const flags: AuthCommandFlags = {
        provider: "gitlab",
        "client-id": "test_id",
        "client-secret": "test_secret",
      };

      await expect(async () => {
        await executeAuthFlow(flags);
      }).rejects.toThrow("process.exit called");

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should handle authorization callback error", async () => {
      mockServer.waitForCallback.mockResolvedValue({
        error: "access_denied",
        error_description: "User denied access",
      });

      const flags: AuthCommandFlags = {
        provider: "gitlab",
        "client-id": "test_id",
        "client-secret": "test_secret",
      };

      await expect(async () => {
        await executeAuthFlow(flags);
      }).rejects.toThrow("process.exit called");

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockServer.stop).toHaveBeenCalled();
    });

    it("should handle missing authorization code", async () => {
      mockServer.waitForCallback.mockResolvedValue({
        state: "6d6f636b2d72616e646f6d2d6279746573",
        // No code property
      });

      const flags: AuthCommandFlags = {
        provider: "gitlab",
        "client-id": "test_id",
        "client-secret": "test_secret",
      };

      await expect(async () => {
        await executeAuthFlow(flags);
      }).rejects.toThrow("process.exit called");

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockServer.stop).toHaveBeenCalled();
    });

    it("should handle state parameter mismatch", async () => {
      mockServer.waitForCallback.mockResolvedValue({
        code: "test_code",
        state: "invalid_state", // Different from generated state
      });

      const flags: AuthCommandFlags = {
        provider: "gitlab",
        "client-id": "test_id",
        "client-secret": "test_secret",
      };

      await expect(async () => {
        await executeAuthFlow(flags);
      }).rejects.toThrow("process.exit called");

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockServer.stop).toHaveBeenCalled();
    });

    it("should handle token exchange failure", async () => {
      mockServer.waitForCallback.mockResolvedValue({
        code: "test_code",
        state: "6d6f636b2d72616e646f6d2d6279746573",
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: () => Promise.resolve("invalid_grant"),
      });

      const flags: AuthCommandFlags = {
        provider: "gitlab",
        "client-id": "test_id",
        "client-secret": "test_secret",
      };

      await expect(async () => {
        await executeAuthFlow(flags);
      }).rejects.toThrow("process.exit called");

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockServer.stop).toHaveBeenCalled();
    });

    it("should handle token exchange network error", async () => {
      mockServer.waitForCallback.mockResolvedValue({
        code: "test_code",
        state: "6d6f636b2d72616e646f6d2d6279746573",
      });

      mockFetch.mockRejectedValue(new Error("Network error"));

      const flags: AuthCommandFlags = {
        provider: "gitlab",
        "client-id": "test_id",
        "client-secret": "test_secret",
      };

      await expect(async () => {
        await executeAuthFlow(flags);
      }).rejects.toThrow("process.exit called");

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockServer.stop).toHaveBeenCalled();
    });

    it("should handle missing access token in response", async () => {
      mockServer.waitForCallback.mockResolvedValue({
        code: "test_code",
        state: "6d6f636b2d72616e646f6d2d6279746573",
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            token_type: "Bearer",
            // Missing access_token
          }),
      });

      const flags: AuthCommandFlags = {
        provider: "gitlab",
        "client-id": "test_id",
        "client-secret": "test_secret",
      };

      await expect(async () => {
        await executeAuthFlow(flags);
      }).rejects.toThrow("process.exit called");

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should always stop server even on errors", async () => {
      mockServer.waitForCallback.mockRejectedValue(new Error("Timeout"));

      const flags: AuthCommandFlags = {
        provider: "gitlab",
        "client-id": "test_id",
        "client-secret": "test_secret",
      };

      await expect(async () => {
        await executeAuthFlow(flags);
      }).rejects.toThrow("process.exit called");

      expect(mockServer.stop).toHaveBeenCalled();
    });
  });

  describe("Browser Integration", () => {
    it("should handle browser opening failure gracefully", async () => {
      mockOpen.mockRejectedValue(new Error("No browser available"));

      mockServer.waitForCallback.mockResolvedValue({
        code: "test_code",
        state: "6d6f636b2d72616e646f6d2d6279746573",
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "test_token",
            token_type: "Bearer",
          }),
      });

      const flags: AuthCommandFlags = {
        provider: "gitlab",
        "client-id": "test_id",
        "client-secret": "test_secret",
      };

      // Should not throw, should continue with flow
      await executeAuthFlow(flags);

      expect(mockOpen).toHaveBeenCalled();
      expect(mockServer.waitForCallback).toHaveBeenCalled();
    });
  });

  describe("Token Refresh Integration", () => {
    it("should schedule token refresh for tokens with refresh capability", async () => {
      const mockOAuth2Manager = {
        scheduleTokenRefresh: jest.fn(),
      };
      OAuth2Manager.mockImplementation(() => mockOAuth2Manager);

      mockServer.waitForCallback.mockResolvedValue({
        code: "test_code",
        state: "6d6f636b2d72616e646f6d2d6279746573",
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "test_access_token",
            token_type: "Bearer",
            expires_in: 3600,
            refresh_token: "test_refresh_token",
            scope: "api read_user",
          }),
      });

      const flags: AuthCommandFlags = {
        provider: "gitlab",
        "client-id": "test_id",
        "client-secret": "test_secret",
      };

      await executeAuthFlow(flags);

      expect(mockOAuth2Manager.scheduleTokenRefresh).toHaveBeenCalledWith(
        expect.any(String), // account ID
        expect.objectContaining({
          access_token: "test_access_token",
          refresh_token: "test_refresh_token",
          expires_in: 3600,
        }),
        expect.any(Function) // callback
      );
    });

    it("should not schedule refresh for tokens without refresh capability", async () => {
      const mockOAuth2Manager = {
        scheduleTokenRefresh: jest.fn(),
      };
      OAuth2Manager.mockImplementation(() => mockOAuth2Manager);

      mockServer.waitForCallback.mockResolvedValue({
        code: "test_code",
        state: "6d6f636b2d72616e646f6d2d6279746573",
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "test_access_token",
            token_type: "Bearer",
            // No expires_in or refresh_token
          }),
      });

      const flags: AuthCommandFlags = {
        provider: "gitlab",
        "client-id": "test_id",
        "client-secret": "test_secret",
      };

      await executeAuthFlow(flags);

      expect(mockOAuth2Manager.scheduleTokenRefresh).not.toHaveBeenCalled();
    });
  });

  describe("State Parameter Generation", () => {
    it("should generate secure random state parameter", async () => {
      mockServer.waitForCallback.mockResolvedValue({
        code: "test_code",
        state: "6d6f636b2d72616e646f6d2d6279746573", // hex of mocked bytes
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "test_token",
            token_type: "Bearer",
          }),
      });

      const flags: AuthCommandFlags = {
        provider: "gitlab",
        "client-id": "test_id",
        "client-secret": "test_secret",
      };

      await executeAuthFlow(flags);

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining("state=6d6f636b2d72616e646f6d2d6279746573"));
    });
  });

  describe("URL Generation", () => {
    it("should generate correct authorization URL with all parameters", async () => {
      mockServer.waitForCallback.mockResolvedValue({
        code: "test_code",
        state: "6d6f636b2d72616e646f6d2d6279746573",
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: "test_token",
            token_type: "Bearer",
          }),
      });

      const flags: AuthCommandFlags = {
        provider: "gitlab",
        "client-id": "test_client_id",
        "client-secret": "test_client_secret",
        scopes: "read_user,api",
      };

      await executeAuthFlow(flags);

      const expectedUrl = expect.stringContaining("https://gitlab.com/oauth/authorize");
      expect(mockOpen).toHaveBeenCalledWith(expect.stringMatching(/client_id=test_client_id/));
      expect(mockOpen).toHaveBeenCalledWith(expect.stringMatching(/response_type=code/));
      expect(mockOpen).toHaveBeenCalledWith(expect.stringMatching(/state=6d6f636b2d72616e646f6d2d6279746573/));
    });
  });
});
