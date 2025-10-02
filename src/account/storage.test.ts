// src/account/storage.test.ts

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { existsSync, rmSync } from "fs";
import { join } from "path";
import * as storage from "./storage";

const TEST_DIR = join(__dirname, "../../test-tmp");
const TEST_FILE = join(TEST_DIR, "test-storage.yaml");

describe("account/storage", () => {
  beforeEach(() => {
    // Clean up test file if it exists
    if (existsSync(TEST_FILE)) {
      rmSync(TEST_FILE);
    }
  });

  afterEach(() => {
    storage.closeStorage();
    if (existsSync(TEST_FILE)) {
      rmSync(TEST_FILE);
    }
  });

  it("should export expected functions", () => {
    expect(typeof storage.initStorage).toBe("function");
    expect(typeof storage.getStorage).toBe("function");
    expect(typeof storage.closeStorage).toBe("function");
  });

  it("should initialize storage with YAML", () => {
    const store = storage.initStorage({ path: TEST_FILE });
    expect(store).toBeDefined();
    expect(store.getAllAccounts).toBeDefined();
  });

  it("should convert .sqlite extension to .yaml for backward compatibility", () => {
    const sqlitePath = join(TEST_DIR, "test.sqlite");
    const store = storage.initStorage({ path: sqlitePath });
    expect(store).toBeDefined();
    // Verify the YAML file was created, not SQLite
    expect(existsSync(join(TEST_DIR, "test.yaml"))).toBe(true);
    expect(existsSync(sqlitePath)).toBe(false);
  });

  it("should return existing instance on subsequent calls", () => {
    const store1 = storage.initStorage({ path: TEST_FILE });
    const store2 = storage.initStorage({ path: TEST_FILE });
    expect(store1).toBe(store2);
  });

  it("should throw error when accessing storage before initialization", () => {
    storage.closeStorage();
    expect(() => storage.getStorage()).toThrow("Account storage not initialized");
  });

  it("should handle closeStorage gracefully when not initialized", () => {
    storage.closeStorage();
    expect(() => storage.closeStorage()).not.toThrow();
  });

  describe("backward compatibility", () => {
    it("should provide initDatabase alias", () => {
      expect(storage.initDatabase).toBe(storage.initStorage);
    });

    it("should provide getDatabase alias", () => {
      expect(storage.getDatabase).toBe(storage.getStorage);
    });

    it("should provide closeDatabase alias", () => {
      expect(storage.closeDatabase).toBe(storage.closeStorage);
    });
  });
});
