import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { DeduplicationRegistry, createDeduplicationRegistry } from "./deduplicationRegistry";

describe("DeduplicationRegistry", () => {
  const testDir = "/tmp/copima-test-dedup-registry";
  const registryPath = join(testDir, ".copima-registry.json");

  beforeEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("constructor", () => {
    it("should create a registry with enabled flag", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      expect(registry.isEnabled()).toBe(true);
    });

    it("should create a registry with disabled flag", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: false,
      });

      expect(registry.isEnabled()).toBe(false);
    });

    it("should load existing registry from disk", () => {
      // Create a registry file
      const existingData = {
        users: {
          "user-1": {
            id: "user-1",
            resourceType: "users",
            filePath: "/output/users.jsonl",
            writtenAt: "2024-01-01T00:00:00.000Z",
          },
        },
      };
      writeFileSync(registryPath, JSON.stringify(existingData), "utf-8");

      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      expect(registry.isWritten("users", "user-1")).toBe(true);
      expect(registry.isWritten("users", "user-2")).toBe(false);
    });

    it("should handle corrupted registry file gracefully", () => {
      // Create a corrupted registry file
      writeFileSync(registryPath, "{ invalid json", "utf-8");

      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      // Should start with empty registry
      expect(registry.isWritten("users", "user-1")).toBe(false);
    });
  });

  describe("isWritten", () => {
    it("should return false for never-written resource", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      expect(registry.isWritten("users", "user-1")).toBe(false);
    });

    it("should return true for written resource", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.markWritten("users", "user-1", "/output/users.jsonl");

      expect(registry.isWritten("users", "user-1")).toBe(true);
    });

    it("should return false when registry is disabled", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: false,
      });

      registry.markWritten("users", "user-1", "/output/users.jsonl");

      expect(registry.isWritten("users", "user-1")).toBe(false);
    });

    it("should distinguish between different resource types", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.markWritten("users", "id-1", "/output/users.jsonl");

      expect(registry.isWritten("users", "id-1")).toBe(true);
      expect(registry.isWritten("projects", "id-1")).toBe(false);
    });

    it("should handle different IDs for same resource type", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.markWritten("users", "user-1", "/output/users.jsonl");
      registry.markWritten("users", "user-2", "/output/users.jsonl");

      expect(registry.isWritten("users", "user-1")).toBe(true);
      expect(registry.isWritten("users", "user-2")).toBe(true);
      expect(registry.isWritten("users", "user-3")).toBe(false);
    });
  });

  describe("markWritten", () => {
    it("should mark a resource as written", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.markWritten("users", "user-1", "/output/users.jsonl");

      expect(registry.isWritten("users", "user-1")).toBe(true);
    });

    it("should store optional checksum", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.markWritten("users", "user-1", "/output/users.jsonl", "abc123");

      const entries = registry.getEntriesForType("users");
      expect(entries).toHaveLength(1);
      expect(entries[0].checksumOrSize).toBe("abc123");
    });

    it("should update existing entry if marked again", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.markWritten("users", "user-1", "/output/users-old.jsonl");
      registry.markWritten("users", "user-1", "/output/users-new.jsonl");

      const entries = registry.getEntriesForType("users");
      expect(entries).toHaveLength(1);
      expect(entries[0].filePath).toBe("/output/users-new.jsonl");
    });

    it("should do nothing when registry is disabled", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: false,
      });

      registry.markWritten("users", "user-1", "/output/users.jsonl");

      const stats = registry.getStats();
      expect(Object.keys(stats)).toHaveLength(0);
    });
  });

  describe("markBatchWritten", () => {
    it("should mark multiple resources as written", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      const ids = ["user-1", "user-2", "user-3"];
      registry.markBatchWritten("users", ids, "/output/users.jsonl");

      expect(registry.isWritten("users", "user-1")).toBe(true);
      expect(registry.isWritten("users", "user-2")).toBe(true);
      expect(registry.isWritten("users", "user-3")).toBe(true);
    });

    it("should handle empty array", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.markBatchWritten("users", [], "/output/users.jsonl");

      const stats = registry.getStats();
      expect(stats.users).toBeUndefined();
    });
  });

  describe("getStats", () => {
    it("should return empty stats for new registry", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      const stats = registry.getStats();
      expect(Object.keys(stats)).toHaveLength(0);
    });

    it("should return counts per resource type", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.markWritten("users", "user-1", "/output/users.jsonl");
      registry.markWritten("users", "user-2", "/output/users.jsonl");
      registry.markWritten("projects", "project-1", "/output/projects.jsonl");

      const stats = registry.getStats();
      expect(stats.users).toBe(2);
      expect(stats.projects).toBe(1);
    });

    it("should handle multiple resource types", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.markBatchWritten("users", ["u1", "u2", "u3"], "/output/users.jsonl");
      registry.markBatchWritten("projects", ["p1", "p2"], "/output/projects.jsonl");
      registry.markBatchWritten("groups", ["g1"], "/output/groups.jsonl");

      const stats = registry.getStats();
      expect(stats.users).toBe(3);
      expect(stats.projects).toBe(2);
      expect(stats.groups).toBe(1);
    });
  });

  describe("clearResourceType", () => {
    it("should clear all entries for a resource type", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.markWritten("users", "user-1", "/output/users.jsonl");
      registry.markWritten("users", "user-2", "/output/users.jsonl");
      registry.markWritten("projects", "project-1", "/output/projects.jsonl");

      registry.clearResourceType("users");

      expect(registry.isWritten("users", "user-1")).toBe(false);
      expect(registry.isWritten("users", "user-2")).toBe(false);
      expect(registry.isWritten("projects", "project-1")).toBe(true);
    });

    it("should handle clearing non-existent resource type", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.clearResourceType("nonexistent");

      const stats = registry.getStats();
      expect(Object.keys(stats)).toHaveLength(0);
    });
  });

  describe("clearAll", () => {
    it("should clear all entries from registry", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.markWritten("users", "user-1", "/output/users.jsonl");
      registry.markWritten("projects", "project-1", "/output/projects.jsonl");
      registry.markWritten("groups", "group-1", "/output/groups.jsonl");

      registry.clearAll();

      expect(registry.isWritten("users", "user-1")).toBe(false);
      expect(registry.isWritten("projects", "project-1")).toBe(false);
      expect(registry.isWritten("groups", "group-1")).toBe(false);

      const stats = registry.getStats();
      expect(Object.keys(stats)).toHaveLength(0);
    });
  });

  describe("save and load", () => {
    it("should persist registry to disk and reload it", () => {
      const registry1 = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry1.markWritten("users", "user-1", "/output/users.jsonl", "checksum-1");
      registry1.markWritten("projects", "project-1", "/output/projects.jsonl");
      registry1.save();

      // Create new registry instance to load from disk
      const registry2 = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      expect(registry2.isWritten("users", "user-1")).toBe(true);
      expect(registry2.isWritten("projects", "project-1")).toBe(true);

      const entries = registry2.getEntriesForType("users");
      expect(entries[0].checksumOrSize).toBe("checksum-1");
    });

    it("should not save when registry is disabled", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: false,
      });

      registry.markWritten("users", "user-1", "/output/users.jsonl");
      registry.save();

      expect(existsSync(registryPath)).toBe(false);
    });

    it("should not save when no changes have been made", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.save();

      expect(existsSync(registryPath)).toBe(false);
    });

    it("should save only when changes have been made", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.markWritten("users", "user-1", "/output/users.jsonl");
      registry.save();

      expect(existsSync(registryPath)).toBe(true);
    });

    it("should create directory if it does not exist", () => {
      const deepPath = join(testDir, "deep", "nested", "path", ".copima-registry.json");
      const registry = new DeduplicationRegistry({
        registryPath: deepPath,
        enabled: true,
      });

      registry.markWritten("users", "user-1", "/output/users.jsonl");
      registry.save();

      expect(existsSync(deepPath)).toBe(true);
    });
  });

  describe("getEntriesForType", () => {
    it("should return empty array for non-existent resource type", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      const entries = registry.getEntriesForType("users");
      expect(entries).toEqual([]);
    });

    it("should return all entries for a resource type", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.markWritten("users", "user-1", "/output/users.jsonl");
      registry.markWritten("users", "user-2", "/output/users.jsonl");

      const entries = registry.getEntriesForType("users");
      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.id)).toContain("user-1");
      expect(entries.map((e) => e.id)).toContain("user-2");
    });
  });

  describe("createDeduplicationRegistry", () => {
    it("should create registry with correct path", () => {
      const registry = createDeduplicationRegistry(testDir, true);

      registry.markWritten("users", "user-1", "/output/users.jsonl");
      registry.save();

      expect(existsSync(join(testDir, ".copima-registry.json"))).toBe(true);
    });

    it("should create enabled registry by default", () => {
      const registry = createDeduplicationRegistry(testDir);

      expect(registry.isEnabled()).toBe(true);
    });

    it("should create disabled registry when specified", () => {
      const registry = createDeduplicationRegistry(testDir, false);

      expect(registry.isEnabled()).toBe(false);
    });
  });

  describe("no false positives", () => {
    it("should never report as written before actual write", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      // Check multiple times before marking
      expect(registry.isWritten("users", "user-1")).toBe(false);
      expect(registry.isWritten("users", "user-1")).toBe(false);
      expect(registry.isWritten("users", "user-1")).toBe(false);

      // Now mark as written
      registry.markWritten("users", "user-1", "/output/users.jsonl");

      // Now it should be true
      expect(registry.isWritten("users", "user-1")).toBe(true);
    });

    it("should distinguish between similar IDs", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.markWritten("users", "user-1", "/output/users.jsonl");

      expect(registry.isWritten("users", "user-1")).toBe(true);
      expect(registry.isWritten("users", "user-10")).toBe(false);
      expect(registry.isWritten("users", "user-11")).toBe(false);
      expect(registry.isWritten("users", "user-2")).toBe(false);
    });

    it("should handle resource type boundaries correctly", () => {
      const registry = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry.markWritten("user", "id-1", "/output/user.jsonl");

      expect(registry.isWritten("user", "id-1")).toBe(true);
      expect(registry.isWritten("users", "id-1")).toBe(false);
      expect(registry.isWritten("user-profile", "id-1")).toBe(false);
    });

    it("should handle registry reload without false positives", () => {
      const registry1 = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      registry1.markWritten("users", "user-1", "/output/users.jsonl");
      registry1.save();

      // Create new instance
      const registry2 = new DeduplicationRegistry({
        registryPath,
        enabled: true,
      });

      // Should report correctly after reload
      expect(registry2.isWritten("users", "user-1")).toBe(true);
      expect(registry2.isWritten("users", "user-2")).toBe(false);
    });
  });
});
