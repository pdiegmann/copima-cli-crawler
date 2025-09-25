// src/commands/account/impl.test.ts

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Mock database connection completely to prevent Jest from loading the actual module
jest.mock("../../db/index", () => ({
  __esModule: true,
  default: {},
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

import * as impl from "./impl";

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
});
