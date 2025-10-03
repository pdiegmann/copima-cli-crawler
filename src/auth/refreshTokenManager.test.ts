import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { YamlStorage } from "../account/yamlStorage";
import type { OAuth2TokenResponse } from "../types/api";
import { RefreshTokenManager } from "./refreshTokenManager";

describe("RefreshTokenManager", () => {
  let mockYamlStorage: jest.Mocked<YamlStorage>;
  let refreshTokenManager: RefreshTokenManager;

  beforeEach(() => {
    // Mock YamlStorage
    mockYamlStorage = {
      updateAccount: jest.fn(),
      findAccountByAccountId: jest.fn(),
      getAllAccounts: jest.fn(),
      getAllUsers: jest.fn(),
      getAccountsWithUsers: jest.fn(),
      createAccount: jest.fn(),
      createUser: jest.fn(),
      deleteAccount: jest.fn(),
      deleteUser: jest.fn(),
    } as any;

    refreshTokenManager = new RefreshTokenManager(mockYamlStorage);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("updateRefreshToken", () => {
    it("should update refresh token with expiration", async () => {
      const accountId = "test-account";
      const tokenResponse: OAuth2TokenResponse = {
        access_token: "access_token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "new_refresh_token",
        refresh_expires_in: 7200,
      };

      await refreshTokenManager.updateRefreshToken(accountId, tokenResponse);

      expect(mockYamlStorage.updateAccount).toHaveBeenCalledWith(
        accountId,
        expect.objectContaining({
          refreshToken: "new_refresh_token",
          refreshTokenExpiresAt: expect.any(Date),
        }),
      );
    });

    it("should update refresh token without expiration", async () => {
      const accountId = "test-account";
      const tokenResponse: OAuth2TokenResponse = {
        access_token: "access_token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "new_refresh_token",
      };

      await refreshTokenManager.updateRefreshToken(accountId, tokenResponse);

      expect(mockYamlStorage.updateAccount).toHaveBeenCalledWith(
        accountId,
        expect.objectContaining({
          refreshToken: "new_refresh_token",
          refreshTokenExpiresAt: null,
        }),
      );
    });

    it("should handle token response with no refresh token", async () => {
      const accountId = "test-account";
      const tokenResponse = {
        access_token: "access_token",
        token_type: "Bearer",
        expires_in: 3600,
      } as OAuth2TokenResponse;

      await refreshTokenManager.updateRefreshToken(accountId, tokenResponse);

      expect(mockYamlStorage.updateAccount).toHaveBeenCalledWith(
        accountId,
        expect.objectContaining({
          refreshToken: undefined,
          refreshTokenExpiresAt: null,
        }),
      );
    });
  });

  describe("invalidateRefreshToken", () => {
    it("should invalidate refresh token", async () => {
      const accountId = "test-account";

      await refreshTokenManager.invalidateRefreshToken(accountId);

      expect(mockYamlStorage.updateAccount).toHaveBeenCalledWith(accountId, {
        refreshToken: null,
        refreshTokenExpiresAt: null,
      });
    });

    it("should handle multiple invalidation calls", async () => {
      const accountId = "test-account";

      await refreshTokenManager.invalidateRefreshToken(accountId);
      await refreshTokenManager.invalidateRefreshToken(accountId);

      expect(mockYamlStorage.updateAccount).toHaveBeenCalledTimes(2);
      expect(mockYamlStorage.updateAccount).toHaveBeenCalledWith(accountId, {
        refreshToken: null,
        refreshTokenExpiresAt: null,
      });
    });
  });

  describe("validateRefreshToken", () => {
    it("should return true for valid refresh token", async () => {
      const accountId = "test-account";
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now

      mockYamlStorage.findAccountByAccountId.mockReturnValue({
        accountId,
        refreshToken: "valid_token",
        refreshTokenExpiresAt: futureDate,
      } as any);

      const result = await refreshTokenManager.validateRefreshToken(accountId);

      expect(result).toBe(true);
      expect(mockYamlStorage.findAccountByAccountId).toHaveBeenCalledWith(accountId);
    });

    it("should return false when account not found", async () => {
      const accountId = "nonexistent-account";

      mockYamlStorage.findAccountByAccountId.mockReturnValue(null);

      const result = await refreshTokenManager.validateRefreshToken(accountId);

      expect(result).toBe(false);
    });

    it("should return false when refresh token is missing", async () => {
      const accountId = "test-account";

      mockYamlStorage.findAccountByAccountId.mockReturnValue({
        accountId,
        refreshToken: null,
        refreshTokenExpiresAt: new Date(Date.now() + 3600000),
      } as any);

      const result = await refreshTokenManager.validateRefreshToken(accountId);

      expect(result).toBe(false);
    });

    it("should return false when expiration is missing", async () => {
      const accountId = "test-account";

      mockYamlStorage.findAccountByAccountId.mockReturnValue({
        accountId,
        refreshToken: "valid_token",
        refreshTokenExpiresAt: null,
      } as any);

      const result = await refreshTokenManager.validateRefreshToken(accountId);

      expect(result).toBe(false);
    });

    it("should return false when token is expired", async () => {
      const accountId = "test-account";
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago

      mockYamlStorage.findAccountByAccountId.mockReturnValue({
        accountId,
        refreshToken: "expired_token",
        refreshTokenExpiresAt: pastDate,
      } as any);

      const result = await refreshTokenManager.validateRefreshToken(accountId);

      expect(result).toBe(false);
    });

    it("should handle string date format", async () => {
      const accountId = "test-account";
      const futureDate = new Date(Date.now() + 3600000).toISOString();

      mockYamlStorage.findAccountByAccountId.mockReturnValue({
        accountId,
        refreshToken: "valid_token",
        refreshTokenExpiresAt: futureDate,
      } as any);

      const result = await refreshTokenManager.validateRefreshToken(accountId);

      expect(result).toBe(true);
    });

    it("should handle number timestamp format", async () => {
      const accountId = "test-account";
      const futureDate = Date.now() + 3600000;

      mockYamlStorage.findAccountByAccountId.mockReturnValue({
        accountId,
        refreshToken: "valid_token",
        refreshTokenExpiresAt: futureDate,
      } as any);

      const result = await refreshTokenManager.validateRefreshToken(accountId);

      expect(result).toBe(true);
    });

    it("should return false for invalid expiration format", async () => {
      const accountId = "test-account";

      mockYamlStorage.findAccountByAccountId.mockReturnValue({
        accountId,
        refreshToken: "valid_token",
        refreshTokenExpiresAt: {} as any,
      } as any);

      const result = await refreshTokenManager.validateRefreshToken(accountId);

      expect(result).toBe(false);
    });
  });
});
