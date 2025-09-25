import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import { FileLocker } from "./fileLocker";

// Mock the logging module
jest.mock("../logging", () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

const TEST_FILE = path.join(__dirname, `__test_lockfile_${process.pid}_${Date.now()}__`);

describe("FileLocker", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Clean up any existing files before each test
    try {
      if (fs.existsSync(TEST_FILE + ".lock")) {
        await fs.promises.unlink(TEST_FILE + ".lock");
      }
      if (fs.existsSync(TEST_FILE)) {
        await fs.promises.unlink(TEST_FILE);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterEach(async () => {
    // Clean up lock files and restore original values
    try {
      if (fs.existsSync(TEST_FILE + ".lock")) {
        await fs.promises.unlink(TEST_FILE + ".lock");
      }
      if (fs.existsSync(TEST_FILE)) {
        await fs.promises.unlink(TEST_FILE);
      }
      // Reset FileLocker static properties to defaults
      (FileLocker as any).LOCK_TIMEOUT = 30000;
      (FileLocker as any).RETRY_DELAY = 100;
      (FileLocker as any).MAX_RETRIES = 50;
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it("should acquire and release a lock", async () => {
    const lock = await FileLocker.acquireLock(TEST_FILE);
    expect(lock.acquired).toBe(true);
    expect(lock.lockFilePath).toBe(TEST_FILE + ".lock");
    expect(fs.existsSync(lock.lockFilePath)).toBe(true);

    await FileLocker.releaseLock(lock);
    expect(fs.existsSync(lock.lockFilePath)).toBe(false);
  });

  it("should not release a lock if not acquired", async () => {
    const lock = { lockFilePath: TEST_FILE + ".lock", lockId: "fake", acquired: false };
    await expect(FileLocker.releaseLock(lock)).resolves.toBeUndefined();
  });

  it("should handle stale lock", async () => {
    // Create a stale lock file (older than 30 seconds)
    const staleLock = {
      lockId: "stale",
      pid: 999999, // unlikely to exist
      timestamp: Date.now() - 60000, // 60 seconds ago
      filePath: TEST_FILE,
    };
    await fs.promises.writeFile(TEST_FILE + ".lock", JSON.stringify(staleLock));

    // Should acquire lock after removing stale
    const lock = await FileLocker.acquireLock(TEST_FILE);
    expect(lock.acquired).toBe(true);
    await FileLocker.releaseLock(lock);
  }, 10000);

  it("should run withLock and release", async () => {
    let ran = false;
    await FileLocker.withLock(TEST_FILE, async () => {
      ran = true;
      expect(fs.existsSync(TEST_FILE + ".lock")).toBe(true);
    });
    expect(ran).toBe(true);
    expect(fs.existsSync(TEST_FILE + ".lock")).toBe(false);
  });

  it("should throw after max retries", async () => {
    // Create a lock file that is not stale (current timestamp, current process)
    const lockData = {
      lockId: "active",
      pid: process.pid,
      timestamp: Date.now(),
      filePath: TEST_FILE,
    };
    await fs.promises.writeFile(TEST_FILE + ".lock", JSON.stringify(lockData));

    // Mock MAX_RETRIES to be much smaller for faster testing
    const originalMaxRetries = (FileLocker as any).MAX_RETRIES;
    const originalRetryDelay = (FileLocker as any).RETRY_DELAY;

    (FileLocker as any).MAX_RETRIES = 3;
    (FileLocker as any).RETRY_DELAY = 10;

    try {
      await expect(FileLocker.acquireLock(TEST_FILE)).rejects.toThrow("Failed to acquire lock");
    } finally {
      // Restore original values
      (FileLocker as any).MAX_RETRIES = originalMaxRetries;
      (FileLocker as any).RETRY_DELAY = originalRetryDelay;

      // Clean up
      if (fs.existsSync(TEST_FILE + ".lock")) {
        await fs.promises.unlink(TEST_FILE + ".lock");
      }
    }
  }, 5000);
});
