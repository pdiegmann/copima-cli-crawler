// src/commands/account/impl.test.ts

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Mock account storage completely to prevent Jest from loading the actual module
jest.mock("../../account/index", () => ({
  __esModule: true,
  default: {},
  getDatabase: jest.fn(() => ({
    insert: jest.fn(() => ({ values: jest.fn() })),
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        innerJoin: jest.fn(() => ({
          where: jest.fn(() => ({ limit: jest.fn(() => []) })),
        })),
      })),
    })),
    delete: jest.fn(() => ({ where: jest.fn() })),
  })),
  db: jest.fn(() => ({
    insert: jest.fn(() => ({ values: jest.fn() })),
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        innerJoin: jest.fn(() => ({
          where: jest.fn(() => ({ limit: jest.fn(() => []) })),
        })),
      })),
    })),
    delete: jest.fn(() => ({ where: jest.fn() })),
  })),
  initDatabase: jest.fn(),
  closeDatabase: jest.fn(),
  account: { accountId: "test", userId: "test" },
  user: { id: "test", name: "test", email: "test" },
}));

// Mock the logging module
jest.mock("../../logging", () => ({
  __esModule: true,
  default: {},
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock external dependencies
jest.mock("picocolors", () => ({
  __esModule: true,
  default: {
    red: jest.fn((str) => str),
    green: jest.fn((str) => str),
    cyan: jest.fn((str) => str),
    yellow: jest.fn((str) => str),
    bold: jest.fn((str) => str),
  },
}));

jest.mock("treeify", () => ({
  __esModule: true,
  default: {
    asTree: jest.fn(() => "mocked tree"),
  },
}));

import treeify from "treeify";
import { getDatabase } from "../../account/index";
import * as impl from "./impl";

const treeifyMock = treeify as unknown as { asTree: jest.Mock };

describe("account/impl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should export expected functions", () => {
    expect(typeof impl).toBe("object");
    expect(typeof impl.addAccount).toBe("function");
    expect(typeof impl.listAccounts).toBe("function");
    expect(typeof impl.removeAccount).toBe("function");
    expect(typeof impl.refreshToken).toBe("function");
  });

  it("should handle missing input gracefully", () => {
    // Test addAccount with missing required fields
    expect(impl.addAccount({})).resolves.toBeInstanceOf(Error);
  });

  describe("addAccount", () => {
    it("should successfully add account with valid inputs", async () => {
      const mockDatabase = {
        upsertUser: jest.fn(),
        insertAccount: jest.fn(),
      };
      (getDatabase as jest.Mock).mockReturnValue(mockDatabase);

      const result = await impl.addAccount({
        host: "https://gitlab.example.com",
        "access-token": "glpat-test123",
        name: "Test User",
        email: "test@example.com",
      });

      expect(result).toBeUndefined();
      expect(mockDatabase.upsertUser).toHaveBeenCalled();
      expect(mockDatabase.insertAccount).toHaveBeenCalled();
    });

    it("should return error when host is missing", async () => {
      const result = await impl.addAccount({
        "access-token": "token",
        name: "Test",
        email: "test@example.com",
      });

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe("Missing required parameters");
    });

    it("should return error when access-token is missing", async () => {
      const result = await impl.addAccount({
        host: "https://gitlab.example.com",
        name: "Test",
        email: "test@example.com",
      });

      expect(result).toBeInstanceOf(Error);
    });

    it("should handle database errors gracefully", async () => {
      const mockDatabase = {
        upsertUser: jest.fn(() => {
          throw new Error("Database error");
        }),
      };
      (getDatabase as jest.Mock).mockReturnValue(mockDatabase);

      const result = await impl.addAccount({
        host: "https://gitlab.example.com",
        "access-token": "token",
        name: "Test",
        email: "test@example.com",
      });

      expect(result).toBeInstanceOf(Error);
    });
  });

  describe("listAccounts", () => {
    it("lists every stored account even when multiple share the same user", async () => {
      const mockAccounts = [
        {
          accountId: "acc-1",
          accessToken: "token-1",
          refreshToken: "refresh-1",
          createdAt: new Date("2025-10-02T08:46:11Z"),
          updatedAt: new Date("2025-10-02T08:46:11Z"),
          user: {
            name: "Phil",
            email: "phl@hnnl.eu",
          },
        },
        {
          accountId: "acc-2",
          accessToken: "token-2",
          refreshToken: "refresh-2",
          createdAt: new Date("2025-10-02T09:00:00Z"),
          updatedAt: new Date("2025-10-02T09:00:00Z"),
          user: {
            name: "Phil",
            email: "phl@hnnl.eu",
          },
        },
      ];

      const mockDatabase = {
        getAccountsWithUsers: jest.fn(() => mockAccounts),
      };

      (getDatabase as jest.Mock).mockReturnValueOnce(mockDatabase);

      treeifyMock.asTree.mockClear();

      await impl.listAccounts({});

      expect(treeifyMock.asTree).toHaveBeenCalledTimes(1);
      const treeArgument = treeifyMock.asTree.mock.calls[0]![0] as Record<string, Record<string, any>>;
      const userNode = treeArgument["Phil (phl@hnnl.eu)"];
      expect(userNode).toBeDefined();
      expect(Object.keys(userNode!)).toEqual(expect.arrayContaining(["Account acc-1", "Account acc-2"]));
    });

    it("should handle empty account list", async () => {
      const mockDatabase = {
        getAccountsWithUsers: jest.fn(() => []),
      };
      (getDatabase as jest.Mock).mockReturnValue(mockDatabase);

      const result = await impl.listAccounts({});

      expect(result).toBeUndefined();
    });

    it("should output JSON format when requested", async () => {
      const mockAccounts = [{
        accountId: "acc-1",
        accessToken: "token-1",
        refreshToken: "refresh-1",
        createdAt: new Date("2025-10-02T08:46:11Z"),
        updatedAt: new Date("2025-10-02T08:46:11Z"),
        user: { name: "Test", email: "test@example.com" },
      }];

      const mockDatabase = {
        getAccountsWithUsers: jest.fn(() => mockAccounts),
      };
      (getDatabase as jest.Mock).mockReturnValue(mockDatabase);

      const result = await impl.listAccounts({ format: "json" });

      expect(result).toBeUndefined();
    });

    it("should output YAML format when requested", async () => {
      const mockAccounts = [{
        accountId: "acc-1",
        accessToken: "token-1",
        refreshToken: "refresh-1",
        createdAt: new Date("2025-10-02T08:46:11Z"),
        updatedAt: new Date("2025-10-02T08:46:11Z"),
        user: { name: "Test", email: "test@example.com" },
      }];

      const mockDatabase = {
        getAccountsWithUsers: jest.fn(() => mockAccounts),
      };
      (getDatabase as jest.Mock).mockReturnValue(mockDatabase);

      const result = await impl.listAccounts({ format: "yaml" });

      expect(result).toBeUndefined();
    });

    it("should show tokens when flag is set", async () => {
      const mockAccounts = [{
        accountId: "acc-1",
        accessToken: "token-1-very-long-token",
        refreshToken: "refresh-1-very-long",
        createdAt: new Date("2025-10-02T08:46:11Z"),
        updatedAt: new Date("2025-10-02T08:46:11Z"),
        user: { name: "Test", email: "test@example.com" },
      }];

      const mockDatabase = {
        getAccountsWithUsers: jest.fn(() => mockAccounts),
      };
      (getDatabase as jest.Mock).mockReturnValue(mockDatabase);

      const result = await impl.listAccounts({ "show-tokens": true });

      expect(result).toBeUndefined();
    });

    it("should handle database errors", async () => {
      const mockDatabase = {
        getAccountsWithUsers: jest.fn(() => {
          throw new Error("Database error");
        }),
      };
      (getDatabase as jest.Mock).mockReturnValue(mockDatabase);

      const result = await impl.listAccounts({});

      expect(result).toBeInstanceOf(Error);
    });
  });

  describe("removeAccount", () => {
    it("should return error when neither host nor account-id provided", async () => {
      const result = await impl.removeAccount({});

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe("Either host or account-id must be provided");
    });

    it("should return error when account not found", async () => {
      const mockDatabase = {
        findAccountByAccountId: jest.fn(() => null),
      };
      (getDatabase as jest.Mock).mockReturnValue(mockDatabase);

      const result = await impl.removeAccount({ "account-id": "nonexistent" });

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe("Account not found");
    });

    it("should require force flag for removal", async () => {
      const mockDatabase = {
        findAccountByAccountId: jest.fn(() => ({ userId: "user-1", accountId: "acc-1" })),
        findUserById: jest.fn(() => ({ name: "Test", email: "test@example.com" })),
      };
      (getDatabase as jest.Mock).mockReturnValue(mockDatabase);

      const result = await impl.removeAccount({ "account-id": "acc-1" });

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe("Use --force to confirm account removal");
    });

    it("should successfully remove account with force flag", async () => {
      const mockDatabase = {
        findAccountByAccountId: jest.fn(() => ({ userId: "user-1", accountId: "acc-1" })),
        findUserById: jest.fn(() => ({ name: "Test", email: "test@example.com" })),
        deleteUser: jest.fn(),
      };
      (getDatabase as jest.Mock).mockReturnValue(mockDatabase);

      const result = await impl.removeAccount({ "account-id": "acc-1", force: true });

      expect(result).toBeUndefined();
      expect(mockDatabase.deleteUser).toHaveBeenCalledWith("user-1");
    });

    it("should find account by host", async () => {
      const mockDatabase = {
        findUserByEmail: jest.fn(() => ({ id: "user-1" })),
        findAccountsByUserId: jest.fn(() => [{ userId: "user-1", accountId: "acc-1" }]),
        findUserById: jest.fn(() => ({ name: "Test", email: "test@example.com" })),
        deleteUser: jest.fn(),
      };
      (getDatabase as jest.Mock).mockReturnValue(mockDatabase);

      const result = await impl.removeAccount({ host: "test@example.com", force: true });

      expect(result).toBeUndefined();
    });

    it("should handle database errors", async () => {
      const mockDatabase = {
        findAccountByAccountId: jest.fn(() => {
          throw new Error("Database error");
        }),
      };
      (getDatabase as jest.Mock).mockReturnValue(mockDatabase);

      const result = await impl.removeAccount({ "account-id": "acc-1", force: true });

      expect(result).toBeInstanceOf(Error);
    });
  });

  describe("refreshToken", () => {
    it("should return error when neither host nor account-id provided", async () => {
      const result = await impl.refreshToken({});

      expect(result).toBeInstanceOf(Error);
    });

    it("should return error when client credentials missing", async () => {
      const result = await impl.refreshToken({ "account-id": "acc-1" });

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe("OAuth2 client-id and client-secret are required");
    });

    it("should return error when account not found", async () => {
      const mockDatabase = {
        findAccountByAccountId: jest.fn(() => null),
      };
      (getDatabase as jest.Mock).mockReturnValue(mockDatabase);

      const result = await impl.refreshToken({
        "account-id": "nonexistent",
        "client-id": "client",
        "client-secret": "secret",
      });

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe("Account not found");
    });

    it("should return error when no refresh token available", async () => {
      const mockDatabase = {
        findAccountByAccountId: jest.fn(() => ({ accountId: "acc-1", userId: "user-1" })),
      };
      (getDatabase as jest.Mock).mockReturnValue(mockDatabase);

      const result = await impl.refreshToken({
        "account-id": "acc-1",
        "client-id": "client",
        "client-secret": "secret",
      });

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe("No refresh token available for this account");
    });
  });
});
