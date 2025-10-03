import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};
const mockCreateLogger = jest.fn(() => mockLogger);

jest.mock("../logging", () => ({
  createLogger: mockCreateLogger,
}));

// Import TokenManager AFTER setting up mocks
import { TokenManager } from "./tokenManager";

describe("TokenManager", () => {
  let tokenManager: TokenManager;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      findAccountByAccountId: jest.fn(),
      getAllAccounts: jest.fn(),
      updateAccount: jest.fn(),
    };

    // Clear all mock calls and create fresh instance
    mockLogger.error.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.debug.mockClear();
    mockCreateLogger.mockClear();

    tokenManager = new TokenManager(mockDb);
  });

  describe("getAccessToken", () => {
    it("should return the access token if it is valid", async () => {
      const accountId = "test-account";
      const validAccessToken = "valid-token";
      const futureDate = new Date(Date.now() + 10000);

      mockDb.findAccountByAccountId.mockReturnValue({
        accountId,
        accessToken: validAccessToken,
        accessTokenExpiresAt: futureDate,
        refreshToken: "refresh-token",
        userId: "user-1",
        updatedAt: new Date(),
      });

      const token = await tokenManager.getAccessToken(accountId);

      expect(token).toBe(validAccessToken);
      expect(mockDb.findAccountByAccountId).toHaveBeenCalledWith(accountId);
    });

    it("should refresh the token if the access token is expired", async () => {
      const accountId = "test-account";
      const expiredDate = new Date(Date.now() - 10000);

      mockDb.findAccountByAccountId.mockReturnValue({
        accountId,
        accessToken: "expired-token",
        accessTokenExpiresAt: expiredDate,
        refreshToken: "valid-refresh-token",
        userId: "user-1",
        updatedAt: new Date(),
      });

      jest.spyOn(tokenManager as any, "refreshAccessToken").mockResolvedValue("new-access-token");

      const token = await tokenManager.getAccessToken(accountId);

      expect(token).toBe("new-access-token");
      expect(mockDb.findAccountByAccountId).toHaveBeenCalledWith(accountId);
    });

    it("should return null if no account is found", async () => {
      const accountId = "non-existent-account";

      mockDb.findAccountByAccountId.mockReturnValue(null);

      const token = await tokenManager.getAccessToken(accountId);

      expect(token).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("resolveAccountId", () => {
    it("returns provided account ID when it exists", async () => {
      mockDb.findAccountByAccountId.mockReturnValue({ accountId: "custom", userId: "user-1" });

      const result = await tokenManager.resolveAccountId("custom");

      expect(result).toBe("custom");
      expect(mockDb.findAccountByAccountId).toHaveBeenCalledWith("custom");
    });

    it("falls back to sole stored account when none specified", async () => {
      mockDb.findAccountByAccountId.mockReturnValue(null); // no default
      mockDb.getAllAccounts.mockReturnValue([
        {
          accountId: "only-account",
          userId: "user-1",
          updatedAt: new Date("2025-01-01T00:00:00Z"),
          accessToken: "token",
          refreshToken: "refresh",
        },
      ]);

      const result = await tokenManager.resolveAccountId();

      expect(result).toBe("only-account");
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Auto-selected sole stored account"));
    });

    it("returns null when multiple accounts exist without a default", async () => {
      mockDb.findAccountByAccountId.mockReturnValue(null);
      mockDb.getAllAccounts.mockReturnValue([
        {
          accountId: "acc-1",
          userId: "user-1",
          updatedAt: new Date("2025-01-01T00:00:00Z"),
          accessToken: "token-1",
          refreshToken: "refresh-1",
        },
        {
          accountId: "acc-2",
          userId: "user-2",
          updatedAt: new Date("2025-01-02T00:00:00Z"),
          accessToken: "token-2",
          refreshToken: "refresh-2",
        },
      ]);

      const result = await tokenManager.resolveAccountId();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Multiple accounts found"));
    });

    it("auto-selects the most recent account when duplicates share the same user", async () => {
      mockDb.findAccountByAccountId.mockReturnValue(null);
      mockDb.getAllAccounts.mockReturnValue([
        {
          accountId: "acc-older",
          userId: "user-1",
          updatedAt: new Date("2025-01-01T00:00:00Z"),
          accessToken: "token-old",
          refreshToken: "refresh-old",
        },
        {
          accountId: "acc-newer",
          userId: "user-1",
          updatedAt: new Date("2025-01-03T00:00:00Z"),
          accessToken: "token-new",
          refreshToken: "refresh-new",
        },
      ]);

      const result = await tokenManager.resolveAccountId();

      expect(result).toBe("acc-newer");
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Auto-selected most recent account"));
    });
  });

  describe("refreshAccessToken", () => {
    it("should log an error if no refresh token is available", async () => {
      const accountId = "test-account";

      mockDb.findAccountByAccountId.mockReturnValue({
        accountId,
        refreshToken: null,
        userId: "user-1",
      });

      const token = await (tokenManager as any).refreshAccessToken(accountId);

      expect(token).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Refresh token missing"));
    });

    it("should log warning when refresh not implemented", async () => {
      const accountId = "test-account";

      mockDb.findAccountByAccountId.mockReturnValue({
        accountId,
        refreshToken: "refresh-token",
        userId: "user-1",
      });

      const token = await (tokenManager as any).refreshAccessToken(accountId);

      expect(token).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("not yet implemented"));
    });

    it("should handle errors during refresh", async () => {
      const accountId = "test-account";

      mockDb.findAccountByAccountId.mockImplementation(() => {
        throw new Error("Database error");
      });

      const token = await (tokenManager as any).refreshAccessToken(accountId);

      expect(token).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Failed to refresh access token"));
    });
  });

  describe("getValidToken", () => {
    it("should return valid token when account ID is provided", async () => {
      const accountId = "test-account";
      const validToken = "valid-token";
      const futureDate = new Date(Date.now() + 10000);

      mockDb.findAccountByAccountId.mockReturnValue({
        accountId,
        accessToken: validToken,
        accessTokenExpiresAt: futureDate,
        refreshToken: "refresh-token",
        userId: "user-1",
        updatedAt: new Date(),
      });

      const token = await tokenManager.getValidToken(accountId);

      expect(token).toBe(validToken);
    });

    it("should return null when account resolution fails", async () => {
      mockDb.findAccountByAccountId.mockReturnValue(null);
      mockDb.getAllAccounts.mockReturnValue([]);

      const token = await tokenManager.getValidToken();

      expect(token).toBeNull();
    });

    it("should auto-resolve account ID when not provided", async () => {
      const validToken = "valid-token";
      const futureDate = new Date(Date.now() + 10000);

      const accountData = {
        accountId: "only-account",
        userId: "user-1",
        updatedAt: new Date(),
        accessToken: validToken,
        accessTokenExpiresAt: futureDate,
        refreshToken: "refresh",
      };

      mockDb.findAccountByAccountId.mockImplementation((id: string) => {
        if (id === "default") return null;
        if (id === "only-account") return accountData;
        return null;
      });
      mockDb.getAllAccounts.mockReturnValue([accountData]);

      const token = await tokenManager.getValidToken();

      expect(token).toBe(validToken);
    });
  });

  describe("getAccessToken error cases", () => {
    it("should return null when access token is missing", async () => {
      const accountId = "test-account";

      mockDb.findAccountByAccountId.mockReturnValue({
        accountId,
        accessToken: null,
        accessTokenExpiresAt: new Date(Date.now() + 10000),
        userId: "user-1",
      });

      const token = await tokenManager.getAccessToken(accountId);

      expect(token).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Access token or expiration missing"));
    });

    it("should return null when expiration date is missing", async () => {
      const accountId = "test-account";

      mockDb.findAccountByAccountId.mockReturnValue({
        accountId,
        accessToken: "valid-token",
        accessTokenExpiresAt: null,
        userId: "user-1",
      });

      const token = await tokenManager.getAccessToken(accountId);

      expect(token).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Access token or expiration missing"));
    });

    it("should handle errors during token retrieval", async () => {
      const accountId = "test-account";

      mockDb.findAccountByAccountId.mockImplementation(() => {
        throw new Error("Database error");
      });

      const token = await tokenManager.getAccessToken(accountId);

      expect(token).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Failed to get access token"));
    });
  });

  describe("resolveAccountId error cases", () => {
    it("should return null when no accounts exist", async () => {
      mockDb.findAccountByAccountId.mockReturnValue(null);
      mockDb.getAllAccounts.mockReturnValue([]);

      const result = await tokenManager.resolveAccountId();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("No stored accounts found"));
    });

    it("should handle errors during account resolution", async () => {
      mockDb.findAccountByAccountId.mockImplementation(() => {
        throw new Error("Database error");
      });

      const result = await tokenManager.resolveAccountId();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Failed to resolve account ID"));
    });

    it("should filter accounts without tokens and select sole candidate", async () => {
      mockDb.findAccountByAccountId.mockReturnValue(null);
      mockDb.getAllAccounts.mockReturnValue([
        {
          accountId: "account-with-tokens",
          userId: "user-1",
          updatedAt: new Date(),
          accessToken: "token",
          refreshToken: "refresh",
        },
        {
          accountId: "account-without-tokens",
          userId: "user-2",
          updatedAt: new Date(),
          accessToken: null,
          refreshToken: null,
        },
      ]);

      const result = await tokenManager.resolveAccountId();

      expect(result).toBe("account-with-tokens");
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Auto-selected sole stored account"));
    });

    it("should select default account when it exists", async () => {
      mockDb.findAccountByAccountId.mockImplementation((id: string) => {
        if (id === "default") {
          return {
            accountId: "default",
            userId: "user-1",
            updatedAt: new Date(),
            accessToken: "token",
            refreshToken: "refresh",
          };
        }
        return null;
      });

      const result = await tokenManager.resolveAccountId();

      expect(result).toBe("default");
    });

    it("should handle non-existent specified account ID", async () => {
      mockDb.findAccountByAccountId.mockReturnValue(null);

      const result = await tokenManager.resolveAccountId("non-existent");

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Account with ID non-existent not found"));
    });
  });
});
