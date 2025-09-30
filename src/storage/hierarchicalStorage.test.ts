import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import { HierarchicalStorageManager, type GitLabArea } from "./hierarchicalStorage";

const TEST_DIR = path.join(__dirname, "__test_hierarchical_output__");

const config = {
  rootDir: TEST_DIR,
  fileNaming: "kebab-case" as const,
  hierarchical: true,
  compression: "none" as const,
  prettyPrint: false,
};

const area: GitLabArea = {
  id: "g1",
  fullPath: "group1/subgroup1/project1",
  type: "project",
};

describe("HierarchicalStorageManager", () => {
  let manager: HierarchicalStorageManager;

  beforeAll(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    manager = new HierarchicalStorageManager(config);
  });

  it("should create hierarchical path", () => {
    const dirPath = manager.createHierarchicalPath(area);
    expect(dirPath.startsWith(TEST_DIR)).toBe(true);
    expect(dirPath.includes("group1")).toBe(true);
    expect(dirPath.includes("subgroup1")).toBe(true);
    expect(dirPath.includes("project1")).toBe(true);
  });

  it("should write JSONL to hierarchy", async () => {
    const data = [
      { id: 1, name: "A" },
      { id: 2, name: "B" },
    ];
    await manager.writeJSONLToHierarchy(area, "users", data);

    const filePath = manager.getResourceFilePath(area, "users");
    expect(fs.existsSync(filePath)).toBe(true);

    const lines = fs.readFileSync(filePath, "utf8").trim().split("\n");
    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[0]!).name).toBe("A");
    expect(JSON.parse(lines[1]!).name).toBe("B");
  });

  it("should update config", () => {
    manager.updateConfig({ prettyPrint: true });
    expect(manager.getConfig().prettyPrint).toBe(true);
  });

  it("should create area index", async () => {
    const meta = { foo: "bar" };
    await manager.createAreaIndex(area, meta);

    const dirPath = manager.createHierarchicalPath(area);
    const indexPath = path.join(dirPath, "index.json");
    expect(fs.existsSync(indexPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    expect(content.area.id).toBe(area.id);
    expect(content.metadata.foo).toBe("bar");
  });

  it("should validate config", () => {
    expect(manager.validateConfig()).toBe(true);
    const badManager = new HierarchicalStorageManager({ ...config, rootDir: "" });
    expect(badManager.validateConfig()).toBe(false);
  });

  it("should create area from group/project", () => {
    const group = { id: 1, fullPath: "g1", type: "group" };
    const project = { id: 2, fullPath: "p1", type: "project" };
    expect(HierarchicalStorageManager.createAreaFromGroup(group as any).type).toBe("group");
    expect(HierarchicalStorageManager.createAreaFromProject(project as any).type).toBe("project");
  });
});
