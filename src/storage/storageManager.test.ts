import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import { StorageManager } from "./storageManager";

const TEST_DIR = path.join(__dirname, "__test_output__");

const config = {
  rootDir: TEST_DIR,
  fileNaming: "lowercase" as const,
  prettyPrint: false,
  compression: "none" as const,
};

describe("StorageManager", () => {
  let manager: StorageManager;

  beforeAll(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test output directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    manager = new StorageManager(config);
  });

  it("should create hierarchical path and write/read JSONL file", () => {
    const resourceType = "users";
    const hierarchy = ["group1", "project1"];
    const filePath = manager.createHierarchicalPath(resourceType, hierarchy);

    expect(filePath.endsWith("users.jsonl")).toBe(true);
    expect(fs.existsSync(path.dirname(filePath))).toBe(true);

    const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
    const written = manager.writeJsonlFile(filePath, data, false);
    expect(written).toBe(2);

    const fileContent = fs.readFileSync(filePath, "utf8").trim().split("\n");
    expect(fileContent.length).toBe(2);
    expect(JSON.parse(fileContent[0]!).name).toBe("Alice");
    expect(JSON.parse(fileContent[1]!).name).toBe("Bob");
  });

  it("should append to JSONL file", () => {
    const resourceType = "users";
    const hierarchy = ["group2"];
    const filePath = manager.createHierarchicalPath(resourceType, hierarchy);

    manager.writeJsonlFile(filePath, { id: 1, name: "Charlie" }, false);
    manager.writeJsonlFile(filePath, { id: 2, name: "Dana" }, true);

    const fileContent = fs.readFileSync(filePath, "utf8").trim().split("\n");
    expect(fileContent.length).toBe(2);
    expect(JSON.parse(fileContent[0]!).name).toBe("Charlie");
    expect(JSON.parse(fileContent[1]!).name).toBe("Dana");
  });

  it("should handle empty data gracefully", () => {
    const resourceType = "empty";
    const filePath = manager.createHierarchicalPath(resourceType);

    const written = manager.writeJsonlFile(filePath, [], false);
    expect(written).toBe(0);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("should update config", () => {
    manager.updateConfig({ ...config, prettyPrint: true });
    expect((manager as any).prettyPrint).toBe(true);
  });

  it("should get root dir", () => {
    expect(manager.getRootDir()).toBe(TEST_DIR);
  });
});
