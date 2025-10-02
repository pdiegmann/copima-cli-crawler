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
  });
});
