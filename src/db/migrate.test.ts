// src/db/migrate.test.ts

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { existsSync, rmSync } from "fs";
import { join } from "path";
import { closeDatabase } from "./connection";
import * as migrate from "./migrate";

const TEST_DIR = join(__dirname, "../../test-tmp");
const TEST_FILE = join(TEST_DIR, "test-migrate.yaml");

describe("db/migrate", () => {
  beforeEach(() => {
    // Clean up test file if it exists
    if (existsSync(TEST_FILE)) {
      rmSync(TEST_FILE);
    }
    // Reset global state
    delete (globalThis as any).__copimaDatabaseInitialized;
    delete (globalThis as any).__copimaDatabasePath;
  });

  afterEach(() => {
    closeDatabase();
    if (existsSync(TEST_FILE)) {
      rmSync(TEST_FILE);
    }
  });

  it("should export expected functions", () => {
    expect(typeof migrate).toBe("object");
    expect(typeof migrate.runMigrations).toBe("function");
    expect(typeof migrate.initializeDatabase).toBe("function");
  });

  it("should skip migrations for YAML storage", () => {
    // YAML doesn't need migrations, so this should not throw
    expect(() => migrate.runMigrations({ path: TEST_FILE })).not.toThrow();
  });

  it("should initialize database without errors", () => {
    expect(() => migrate.initializeDatabase({ path: TEST_FILE })).not.toThrow();
    expect(existsSync(TEST_FILE)).toBe(true);
  });

  it("should skip redundant initialization for the same database path", () => {
    migrate.initializeDatabase({ path: TEST_FILE });
    const firstInit = existsSync(TEST_FILE);

    // Second initialization should not throw
    expect(() => migrate.initializeDatabase({ path: TEST_FILE })).not.toThrow();
    expect(existsSync(TEST_FILE)).toBe(firstInit);
  });

  it("should initialize different database paths by closing first", () => {
    const testFile2 = join(TEST_DIR, "test-migrate-2.yaml");

    // Initialize first database
    migrate.initializeDatabase({ path: TEST_FILE });
    expect(existsSync(TEST_FILE)).toBe(true);

    // Close first database before initializing a different one
    closeDatabase();

    // Initialize second database
    migrate.initializeDatabase({ path: testFile2 });
    expect(existsSync(testFile2)).toBe(true);

    // Cleanup
    if (existsSync(testFile2)) {
      rmSync(testFile2);
    }
  });
});
