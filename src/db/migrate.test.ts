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
jest.mock("../logging", () => {
  const loggerMock = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  return {
    __esModule: true,
    default: {},
    createLogger: jest.fn(() => loggerMock),
    __loggerMock: loggerMock,
  };
});

// Mock drizzle migrator
jest.mock("drizzle-orm/better-sqlite3/migrator", () => ({
  __esModule: true,
  default: {},
  migrate: jest.fn(),
}));

import * as migrate from "./migrate";

const connection = jest.requireMock("./connection") as { initDatabase: jest.Mock };
const logging = jest.requireMock("../logging") as { createLogger: jest.Mock; __loggerMock: Record<string, jest.Mock> };

describe("db/migrate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(logging.__loggerMock).forEach((mockFn) => mockFn.mockClear());
    delete (globalThis as any).__copimaDatabaseInitialized;
    delete (globalThis as any).__copimaDatabasePath;
  });

  it("should export expected functions", () => {
    expect(typeof migrate).toBe("object");
    expect(typeof migrate.runMigrations).toBe("function");
    expect(typeof migrate.initializeDatabase).toBe("function");
  });

  it("should handle migration errors gracefully", () => {
    // Test that the function exists and can handle invalid configurations
    expect(() => migrate.runMigrations({ path: ":memory:" })).toThrow();
  });

  it("skips redundant initialization for the same database path", () => {
    const runMigrationsSpy = jest.spyOn(migrate, "runMigrations").mockImplementation(() => undefined);

    migrate.initializeDatabase({ path: "./test.db" });

    expect(logging.__loggerMock["info"]).toHaveBeenCalledWith("Initializing database with migrations");
    expect(connection.initDatabase).toHaveBeenCalledTimes(1);

    Object.values(logging.__loggerMock).forEach((mockFn) => mockFn.mockClear());
    connection.initDatabase.mockClear();

    migrate.initializeDatabase({ path: "./test.db" });

    expect(logging.__loggerMock["info"]).not.toHaveBeenCalledWith("Initializing database with migrations");
    expect(connection.initDatabase).toHaveBeenCalledTimes(1);

    runMigrationsSpy.mockRestore();
  });
});
