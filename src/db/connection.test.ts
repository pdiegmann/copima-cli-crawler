// src/db/connection.test.ts

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { existsSync, rmSync } from "fs";
import { join } from "path";
import * as connection from "./connection";

const TEST_DIR = join(__dirname, "../../test-tmp");
const TEST_FILE = join(TEST_DIR, "test-connection.yaml");

describe("db/connection", () => {
  beforeEach(() => {
    // Clean up test file if it exists
    if (existsSync(TEST_FILE)) {
      rmSync(TEST_FILE);
    }
  });

  afterEach(() => {
    connection.closeDatabase();
    if (existsSync(TEST_FILE)) {
      rmSync(TEST_FILE);
    }
  });

  it("should export expected functions", () => {
    expect(typeof connection.initDatabase).toBe("function");
    expect(typeof connection.getDatabase).toBe("function");
    expect(typeof connection.closeDatabase).toBe("function");
  });

  it("should initialize database with YAML storage", () => {
    const db = connection.initDatabase({ path: TEST_FILE });
    expect(db).toBeDefined();
    expect(db.getAllAccounts).toBeDefined();
  });

  it("should convert .sqlite extension to .yaml", () => {
    const sqlitePath = join(TEST_DIR, "test.sqlite");
    const db = connection.initDatabase({ path: sqlitePath });
    expect(db).toBeDefined();
    // Verify the YAML file was created, not SQLite
    expect(existsSync(join(TEST_DIR, "test.yaml"))).toBe(true);
    expect(existsSync(sqlitePath)).toBe(false);
  });

  it("should return existing instance on subsequent calls", () => {
    const db1 = connection.initDatabase({ path: TEST_FILE });
    const db2 = connection.initDatabase({ path: TEST_FILE });
    expect(db1).toBe(db2);
  });

  it("should throw error when accessing database before initialization", () => {
    connection.closeDatabase();
    expect(() => connection.getDatabase()).toThrow("Database not initialized");
  });

  it("should handle closeDatabase gracefully when not initialized", () => {
    connection.closeDatabase();
    expect(() => connection.closeDatabase()).not.toThrow();
  });
});
