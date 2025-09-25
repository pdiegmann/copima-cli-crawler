import { existsSync } from "fs";
import { readFile, unlink, writeFile } from "fs/promises";
import { createLogger } from "../logging";

const logger = createLogger("FileLocker");

export type FileLock = {
  lockFilePath: string;
  lockId: string;
  acquired: boolean;
};

export class FileLocker {
  private static LOCK_TIMEOUT = 30000; // 30 seconds
  private static RETRY_DELAY = 100; // 100ms
  private static MAX_RETRIES = 50; // 5 seconds total

  /**
   * Acquire a file lock
   */
  static async acquireLock(filePath: string): Promise<FileLock> {
    const lockFilePath = `${filePath}.lock`;
    const lockId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;

    let retries = 0;

    while (retries < this.MAX_RETRIES) {
      try {
        if (!existsSync(lockFilePath)) {
          // Try to create lock file
          await writeFile(
            lockFilePath,
            JSON.stringify({
              lockId,
              pid: process.pid,
              timestamp: Date.now(),
              filePath,
            }),
            { flag: "wx" }
          ); // wx = create exclusively, fail if exists

          logger.debug("File lock acquired", { filePath, lockId });

          return {
            lockFilePath,
            lockId,
            acquired: true,
          };
        } else {
          // Check if existing lock is stale
          const isStale = await this.isLockStale(lockFilePath);

          if (isStale) {
            logger.debug("Removing stale lock", { lockFilePath });
            await this.forceReleaseLock(lockFilePath);
            continue; // Try again
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
          retries++;
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") {
          // Lock file was created between our check and write attempt
          await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
          retries++;
          continue;
        }

        logger.error("Failed to acquire file lock", {
          filePath,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    throw new Error(`Failed to acquire lock for ${filePath} after ${retries} retries`);
  }

  /**
   * Release a file lock
   */
  static async releaseLock(lock: FileLock): Promise<void> {
    if (!lock.acquired) {
      logger.debug("Lock was not acquired, nothing to release", { lockId: lock.lockId });
      return;
    }

    try {
      // Verify we still own the lock
      if (existsSync(lock.lockFilePath)) {
        const lockData = JSON.parse(await readFile(lock.lockFilePath, "utf8"));

        if (lockData.lockId === lock.lockId) {
          await unlink(lock.lockFilePath);
          logger.debug("File lock released", { lockId: lock.lockId });
        } else {
          logger.warn("Lock file was overwritten by another process", {
            expectedLockId: lock.lockId,
            actualLockId: lockData.lockId,
          });
        }
      }
    } catch (error) {
      logger.error("Failed to release file lock", {
        lockId: lock.lockId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if a lock file is stale (older than timeout or process is dead)
   */
  private static async isLockStale(lockFilePath: string): Promise<boolean> {
    try {
      const lockData = JSON.parse(await readFile(lockFilePath, "utf8"));
      const now = Date.now();

      // Check if lock is too old
      if (now - lockData.timestamp > this.LOCK_TIMEOUT) {
        logger.debug("Lock is stale (timeout)", {
          lockFilePath,
          age: now - lockData.timestamp,
          timeout: this.LOCK_TIMEOUT,
        });
        return true;
      }

      // Check if process is still alive (Unix-like systems)
      if (process.platform !== "win32" && lockData.pid) {
        try {
          process.kill(lockData.pid, 0); // Signal 0 checks if process exists
          return false; // Process is alive
        } catch {
          // Process is dead
          logger.debug("Lock is stale (process dead)", {
            lockFilePath,
            pid: lockData.pid,
          });
          return true;
        }
      }

      return false;
    } catch (error) {
      // Can't read lock file, consider it stale
      logger.debug("Lock file unreadable, considering stale", {
        lockFilePath,
        error: error instanceof Error ? error.message : String(error),
      });
      return true;
    }
  }

  /**
   * Force release a lock file (use with caution)
   */
  private static async forceReleaseLock(lockFilePath: string): Promise<void> {
    try {
      if (existsSync(lockFilePath)) {
        await unlink(lockFilePath);
        logger.debug("Lock file force removed", { lockFilePath });
      }
    } catch (error) {
      // Ignore ENOENT errors - file already doesn't exist
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        logger.debug("Lock file already removed", { lockFilePath });
        return;
      }
      logger.error("Failed to force release lock", {
        lockFilePath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute a function with file locking
   */
  static async withLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
    const lock = await this.acquireLock(filePath);

    try {
      return await fn();
    } finally {
      await this.releaseLock(lock);
    }
  }
}
