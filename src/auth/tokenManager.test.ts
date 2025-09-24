const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};
const mockCreateLogger = jest.fn(() => mockLogger);

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TokenManager } from "./tokenManager";

jest.mock("../db/connection");
jest.mock("../utils/logger", () => ({
  createLogger: mockCreateLogger,
}));

describe("TokenManager", () => {
  let tokenManager: TokenManager;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      account: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    tokenManager = new TokenManager(mockDb);
  });

  describe("getAccessToken", () => {
    it("should return the access token if it is valid", async () => {
      const accountId = "test-account";
      const validAccessToken = "valid-token";
      const futureDate = new Date(Date.now() + 10000);

      mockDb.account.findUnique.mockResolvedValue({
        accessToken: validAccessToken,
        accessTokenExpiresAt: futureDate,
      });

      const token = await tokenManager.getAccessToken(accountId);

      expect(token).toBe(validAccessToken);
      expect(mockDb.account.findUnique).toHaveBeenCalledWith({
        where: { accountId },
      });
    });

    it("should refresh the token if the access token is expired", async () => {
      const accountId = "test-account";
      const expiredDate = new Date(Date.now() - 10000);

      mockDb.account.findUnique.mockResolvedValue({
        accessToken: "expired-token",
        accessTokenExpiresAt: expiredDate,
        refreshToken: "valid-refresh-token",
      });

      jest.spyOn(tokenManager as any, "refreshAccessToken").mockResolvedValue("new-access-token");

      const token = await tokenManager.getAccessToken(accountId);

      expect(token).toBe("new-access-token");
      expect(mockDb.account.findUnique).toHaveBeenCalledWith({
        where: { accountId },
      });
    });

    it("should return null if no account is found", async () => {
      const accountId = "non-existent-account";

      mockDb.account.findUnique.mockResolvedValue(null);

      const token = await tokenManager.getAccessToken(accountId);

      expect(token).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(`Account with ID ${accountId} not found.`);
    });
  });

  describe("refreshAccessToken", () => {
    it("should log an error if no refresh token is available", async () => {
      const accountId = "test-account";

      mockDb.account.findUnique.mockResolvedValue({
        refreshToken: null,
      });

      const token = await (tokenManager as any).refreshAccessToken(accountId);

      expect(token).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(`Cannot refresh token for account ${accountId}. Refresh token missing.`);
    });
  });
});
