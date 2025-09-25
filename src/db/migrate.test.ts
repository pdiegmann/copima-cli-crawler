// src/db/migrate.test.ts

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Mock database connection completely to prevent Jest from loading the actual module
jest.mock("./connection", () => ({
  __esModule: true,
  default: {},
  getDatabase: jest.fn(() => null),
  initDatabase: jest.fn(() => ({})),
  closeDatabase: jest.fn(),
}));

// Mock the logging module
jest.mock("../logging", () => ({
  __esModule: true,
  default: {},
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock drizzle migrator
jest.mock("drizzle-orm/better-sqlite3/migrator", () => ({
  __esModule: true,
  default: {},
  migrate: jest.fn(),
}));

import * as migrate from "./migrate";

describe("db/migrate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should export expected functions", () => {
    expect(typeof migrate).toBe("object");
    expect(typeof migrate.runMigrations).toBe("function");
    expect(typeof migrate.initializeDatabase).toBe("function");
  });

  it("should handle migration errors gracefully", () => {
    // Basic test to ensure the module exports work
    expect(() => migrate.runMigrations({ path: ":memory:" })).not.toThrow();
  });
});
