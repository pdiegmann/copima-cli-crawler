import { existsSync, mkdirSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { createDeduplicationRegistry } from "../../storage/deduplicationRegistry";
import { StorageManager } from "../../storage/storageManager";

describe("Deduplication Integration Tests", () => {
  const testDir = "/tmp/copima-dedup-integration-test";
  const outputDir = join(testDir, "output");

  beforeEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(outputDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("No False Positives", () => {
    it("should never skip data that has not been written yet", () => {
      const registry = createDeduplicationRegistry(outputDir, true);
      const storageManager = new StorageManager(
        {
          rootDir: outputDir,
          fileNaming: "lowercase",
          prettyPrint: false,
          compression: "none",
        },
        registry
      );

      const users = [
        { id: "user-1", name: "Alice" },
        { id: "user-2", name: "Bob" },
        { id: "user-3", name: "Charlie" },
      ];

      // Check that none are marked as written before actual write
      expect(registry.isWritten("user", "user-1")).toBe(false);
      expect(registry.isWritten("user", "user-2")).toBe(false);
      expect(registry.isWritten("user", "user-3")).toBe(false);

      // Write users with deduplication
      const filePath = storageManager.createHierarchicalPath("users", []);
      const writtenCount = storageManager.writeJsonlFile(filePath, users, false, "user", "id");

      // All should be written on first pass
      expect(writtenCount).toBe(3);

      // Verify file contains all 3 users
      const fileContent = readFileSync(filePath, "utf-8");
      const lines = fileContent.trim().split("\n");
      expect(lines).toHaveLength(3);

      // Now they should be marked as written
      expect(registry.isWritten("user", "user-1")).toBe(true);
      expect(registry.isWritten("user", "user-2")).toBe(true);
      expect(registry.isWritten("user", "user-3")).toBe(true);
    });

    it("should handle partial writes correctly - only mark successfully written items", () => {
      const registry = createDeduplicationRegistry(outputDir, true);
      const storageManager = new StorageManager(
        {
          rootDir: outputDir,
          fileNaming: "lowercase",
          prettyPrint: false,
          compression: "none",
        },
        registry
      );

      const batch1 = [
        { id: "user-1", name: "Alice" },
        { id: "user-2", name: "Bob" },
      ];

      const filePath = storageManager.createHierarchicalPath("users", []);

      // Write first batch
      storageManager.writeJsonlFile(filePath, batch1, false, "user", "id");

      expect(registry.isWritten("user", "user-1")).toBe(true);
      expect(registry.isWritten("user", "user-2")).toBe(true);
      expect(registry.isWritten("user", "user-3")).toBe(false);

      // Second batch with overlap
      const batch2 = [
        { id: "user-2", name: "Bob" }, // duplicate
        { id: "user-3", name: "Charlie" }, // new
      ];

      const writtenCount = storageManager.writeJsonlFile(filePath, batch2, true, "user", "id");

      // Only user-3 should be written (user-2 is duplicate)
      expect(writtenCount).toBe(1);
      expect(registry.isWritten("user", "user-3")).toBe(true);
    });

    it("should not skip data if registry is cleared between writes", () => {
      const registry = createDeduplicationRegistry(outputDir, true);
      const storageManager = new StorageManager(
        {
          rootDir: outputDir,
          fileNaming: "lowercase",
          prettyPrint: false,
          compression: "none",
        },
        registry
      );

      const users = [{ id: "user-1", name: "Alice" }];

      const filePath = storageManager.createHierarchicalPath("users", []);

      // Write users
      storageManager.writeJsonlFile(filePath, users, false, "user", "id");
      expect(registry.isWritten("user", "user-1")).toBe(true);

      // Clear registry
      registry.clearAll();
      expect(registry.isWritten("user", "user-1")).toBe(false);

      // Write again - should write because registry was cleared
      const writtenCount = storageManager.writeJsonlFile(filePath, users, true, "user", "id");
      expect(writtenCount).toBe(1);
    });

    it("should handle registry persistence correctly", () => {
      // First session
      const registry1 = createDeduplicationRegistry(outputDir, true);
      const storageManager1 = new StorageManager(
        {
          rootDir: outputDir,
          fileNaming: "lowercase",
          prettyPrint: false,
          compression: "none",
        },
        registry1
      );

      const users = [{ id: "user-1", name: "Alice" }];
      const filePath = storageManager1.createHierarchicalPath("users", []);
      storageManager1.writeJsonlFile(filePath, users, false, "user", "id");
      registry1.save();

      // Second session (new registry instance)
      const registry2 = createDeduplicationRegistry(outputDir, true);
      const storageManager2 = new StorageManager(
        {
          rootDir: outputDir,
          fileNaming: "lowercase",
          prettyPrint: false,
          compression: "none",
        },
        registry2
      );

      // Should recognize user-1 as already written from loaded registry
      expect(registry2.isWritten("user", "user-1")).toBe(true);

      // Attempt to write again
      const writtenCount = storageManager2.writeJsonlFile(filePath, users, true, "user", "id");

      // Should not write duplicate
      expect(writtenCount).toBe(0);
    });
  });

  describe("Deduplication Effectiveness", () => {
    it("should deduplicate users across multiple member lists", () => {
      const registry = createDeduplicationRegistry(outputDir, true);
      const storageManager = new StorageManager(
        {
          rootDir: outputDir,
          fileNaming: "lowercase",
          prettyPrint: false,
          compression: "none",
        },
        registry
      );

      // Simulate member lists from different groups that share users
      const group1Members = [
        { id: "user-1", name: "Alice", role: "Developer" },
        { id: "user-2", name: "Bob", role: "Maintainer" },
      ];

      const group2Members = [
        { id: "user-2", name: "Bob", role: "Developer" }, // duplicate
        { id: "user-3", name: "Charlie", role: "Developer" },
      ];

      // Write group1 members
      const path1 = storageManager.createHierarchicalPath("members", ["group1"]);
      const written1 = storageManager.writeJsonlFile(path1, group1Members, false, "member", "id");
      expect(written1).toBe(2);

      // Write group2 members - user-2 should be skipped
      const path2 = storageManager.createHierarchicalPath("members", ["group2"]);
      const written2 = storageManager.writeJsonlFile(path2, group2Members, false, "member", "id");
      expect(written2).toBe(1); // Only user-3 should be written

      // Verify deduplication stats
      const stats = registry.getStats();
      expect(stats["member"]).toBe(3); // Total unique members
    });

    it("should handle large datasets efficiently", () => {
      const registry = createDeduplicationRegistry(outputDir, true);
      const storageManager = new StorageManager(
        {
          rootDir: outputDir,
          fileNaming: "lowercase",
          prettyPrint: false,
          compression: "none",
        },
        registry
      );

      // Create a large dataset with some duplicates
      const batch1: any[] = [];
      const batch2: any[] = [];

      for (let i = 0; i < 1000; i++) {
        batch1.push({ id: `user-${i}`, name: `User ${i}` });
      }

      // Batch 2 has 500 duplicates and 500 new entries
      for (let i = 500; i < 1500; i++) {
        batch2.push({ id: `user-${i}`, name: `User ${i}` });
      }

      const filePath = storageManager.createHierarchicalPath("users", []);

      // Write first batch
      const written1 = storageManager.writeJsonlFile(filePath, batch1, false, "user", "id");
      expect(written1).toBe(1000);

      // Write second batch - should only write 500 new users
      const written2 = storageManager.writeJsonlFile(filePath, batch2, true, "user", "id");
      expect(written2).toBe(500);

      // Verify total unique users
      const stats = registry.getStats();
      expect(stats["user"]).toBe(1500);
    });
  });

  describe("Edge Cases", () => {
    it("should handle items without IDs gracefully", () => {
      const registry = createDeduplicationRegistry(outputDir, true);
      const storageManager = new StorageManager(
        {
          rootDir: outputDir,
          fileNaming: "lowercase",
          prettyPrint: false,
          compression: "none",
        },
        registry
      );

      const items = [
        { id: "item-1", name: "Valid" },
        { name: "No ID" }, // Missing ID
        { id: "item-2", name: "Valid" },
      ];

      const filePath = storageManager.createHierarchicalPath("items", []);
      const writtenCount = storageManager.writeJsonlFile(filePath, items, false, "item", "id");

      // All 3 should be written (items without ID are not deduplicated)
      expect(writtenCount).toBe(3);

      // Only items with IDs are tracked
      expect(registry.isWritten("item", "item-1")).toBe(true);
      expect(registry.isWritten("item", "item-2")).toBe(true);
    });

    it("should handle empty arrays", () => {
      const registry = createDeduplicationRegistry(outputDir, true);
      const storageManager = new StorageManager(
        {
          rootDir: outputDir,
          fileNaming: "lowercase",
          prettyPrint: false,
          compression: "none",
        },
        registry
      );

      const filePath = storageManager.createHierarchicalPath("users", []);
      const writtenCount = storageManager.writeJsonlFile(filePath, [], false, "user", "id");

      expect(writtenCount).toBe(0);
      expect(existsSync(filePath)).toBe(false);
    });

    it("should handle null/undefined items", () => {
      const registry = createDeduplicationRegistry(outputDir, true);
      const storageManager = new StorageManager(
        {
          rootDir: outputDir,
          fileNaming: "lowercase",
          prettyPrint: false,
          compression: "none",
        },
        registry
      );

      const items = [{ id: "user-1", name: "Alice" }, null, undefined, { id: "user-2", name: "Bob" }];

      const filePath = storageManager.createHierarchicalPath("users", []);
      const writtenCount = storageManager.writeJsonlFile(filePath, items as any, false, "user", "id");

      // Only valid items should be written
      expect(writtenCount).toBe(2);
    });
  });
});
