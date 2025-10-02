import { beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { FileConfigLoader } from "./fileLoader";

describe("FileConfigLoader", () => {
  let loader: FileConfigLoader;
  let testDir: string;

  beforeEach(() => {
    loader = new FileConfigLoader();
    testDir = mkdtempSync(join(tmpdir(), "fileloader-test-"));
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("loadYamlFile", () => {
    it("loads valid YAML config file", async () => {
      const yamlContent = `
gitlab:
  host: https://gitlab.example.com
  accessToken: test-token
database:
  path: ./test.db
`;
      const filePath = join(testDir, "config.yaml");
      writeFileSync(filePath, yamlContent);

      const config = await loader.loadYamlFile(filePath);

      expect(config.gitlab).toEqual({
        host: "https://gitlab.example.com",
        accessToken: "test-token",
      });
      expect(config.database).toEqual({
        path: "./test.db",
      });
    });

    it("returns empty config when YAML file doesn't exist", async () => {
      const filePath = join(testDir, "nonexistent.yaml");

      const config = await loader.loadYamlFile(filePath);

      expect(config).toEqual({});
    });

    it("throws error for invalid YAML structure (array)", async () => {
      const yamlContent = `
- item1
- item2
`;
      const filePath = join(testDir, "invalid.yaml");
      writeFileSync(filePath, yamlContent);

      await expect(loader.loadYamlFile(filePath)).rejects.toThrow("Invalid YAML structure");
    });

    it("throws error for invalid YAML structure (string)", async () => {
      const yamlContent = "just a string";
      const filePath = join(testDir, "invalid.yaml");
      writeFileSync(filePath, yamlContent);

      await expect(loader.loadYamlFile(filePath)).rejects.toThrow("Invalid YAML structure");
    });

    it("throws error for malformed YAML", async () => {
      const yamlContent = `
gitlab:
  host: https://gitlab.example.com
  - invalid structure
`;
      const filePath = join(testDir, "malformed.yaml");
      writeFileSync(filePath, yamlContent);

      await expect(loader.loadYamlFile(filePath)).rejects.toThrow("Failed to load config");
    });
  });

  describe("loadJsonFile", () => {
    it("loads valid JSON config file", async () => {
      const jsonContent = {
        gitlab: {
          host: "https://gitlab.example.com",
          accessToken: "test-token",
        },
        database: {
          path: "./test.db",
        },
      };
      const filePath = join(testDir, "config.json");
      writeFileSync(filePath, JSON.stringify(jsonContent));

      const config = await loader.loadJsonFile(filePath);

      expect(config.gitlab).toEqual({
        host: "https://gitlab.example.com",
        accessToken: "test-token",
      });
      expect(config.database).toEqual({
        path: "./test.db",
      });
    });

    it("returns empty config when JSON file doesn't exist", async () => {
      const filePath = join(testDir, "nonexistent.json");

      const config = await loader.loadJsonFile(filePath);

      expect(config).toEqual({});
    });

    it("throws error for invalid JSON syntax", async () => {
      const jsonContent = '{ "invalid": json }';
      const filePath = join(testDir, "invalid.json");
      writeFileSync(filePath, jsonContent);

      await expect(loader.loadJsonFile(filePath)).rejects.toThrow("Invalid JSON syntax");
    });

    it("throws error for invalid JSON structure (array)", async () => {
      const jsonContent = '["item1", "item2"]';
      const filePath = join(testDir, "invalid.json");
      writeFileSync(filePath, jsonContent);

      await expect(loader.loadJsonFile(filePath)).rejects.toThrow("Invalid JSON structure");
    });

    it("throws error for invalid JSON structure (string)", async () => {
      const jsonContent = '"just a string"';
      const filePath = join(testDir, "invalid.json");
      writeFileSync(filePath, jsonContent);

      await expect(loader.loadJsonFile(filePath)).rejects.toThrow("Invalid JSON structure");
    });

    it("throws error for invalid JSON structure (null)", async () => {
      const jsonContent = "null";
      const filePath = join(testDir, "invalid.json");
      writeFileSync(filePath, jsonContent);

      await expect(loader.loadJsonFile(filePath)).rejects.toThrow("Invalid JSON structure");
    });
  });

  describe("loadEnvFile", () => {
    it("loads valid .env file", async () => {
      const envContent = `
COPIMA_GITLAB_HOST=https://gitlab.example.com
COPIMA_GITLAB_ACCESSTOKEN=test-token
COPIMA_DATABASE_PATH=./test.db
`;
      const filePath = join(testDir, ".env");
      writeFileSync(filePath, envContent);

      const config = await loader.loadEnvFile(filePath);

      expect(config.gitlab).toEqual({
        host: "https://gitlab.example.com",
        accesstoken: "test-token",
      });
      expect(config.database).toEqual({
        path: "./test.db",
      });
    });

    it("returns empty config when .env file doesn't exist", async () => {
      const filePath = join(testDir, "nonexistent.env");

      const config = await loader.loadEnvFile(filePath);

      expect(config).toEqual({});
    });

    it("ignores comments in .env file", async () => {
      const envContent = `
# This is a comment
COPIMA_GITLAB_HOST=https://gitlab.example.com
# Another comment
COPIMA_DATABASE_PATH=./test.db
`;
      const filePath = join(testDir, ".env");
      writeFileSync(filePath, envContent);

      const config = await loader.loadEnvFile(filePath);

      expect(config.gitlab).toEqual({
        host: "https://gitlab.example.com",
      });
      expect(config.database).toEqual({
        path: "./test.db",
      });
    });

    it("ignores empty lines in .env file", async () => {
      const envContent = `
COPIMA_GITLAB_HOST=https://gitlab.example.com

COPIMA_DATABASE_PATH=./test.db

`;
      const filePath = join(testDir, ".env");
      writeFileSync(filePath, envContent);

      const config = await loader.loadEnvFile(filePath);

      expect(config.gitlab).toEqual({
        host: "https://gitlab.example.com",
      });
      expect(config.database).toEqual({
        path: "./test.db",
      });
    });

    it("handles values with equals signs", async () => {
      const envContent = `COPIMA_GITLAB_ACCESSTOKEN=token=with=equals`;
      const filePath = join(testDir, ".env");
      writeFileSync(filePath, envContent);

      const config = await loader.loadEnvFile(filePath);

      expect(config.gitlab).toEqual({
        accesstoken: "token=with=equals",
      });
    });

    it("parses boolean values", async () => {
      const envContent = `
COPIMA_LOGGING_CONSOLE=true
COPIMA_LOGGING_COLORS=false
`;
      const filePath = join(testDir, ".env");
      writeFileSync(filePath, envContent);

      const config = await loader.loadEnvFile(filePath);

      expect(config.logging).toEqual({
        console: true,
        colors: false,
      });
    });

    it("parses integer values", async () => {
      const envContent = `
COPIMA_GITLAB_TIMEOUT=30000
COPIMA_GITLAB_MAXCONCURRENCY=5
`;
      const filePath = join(testDir, ".env");
      writeFileSync(filePath, envContent);

      const config = await loader.loadEnvFile(filePath);

      expect(config.gitlab).toEqual({
        timeout: 30000,
        maxconcurrency: 5,
      });
    });

    it("parses float values", async () => {
      const envContent = `COPIMA_GITLAB_TIMEOUT=3.14`;
      const filePath = join(testDir, ".env");
      writeFileSync(filePath, envContent);

      const config = await loader.loadEnvFile(filePath);

      expect(config.gitlab).toEqual({
        timeout: 3.14,
      });
    });

    it("ignores non-COPIMA env vars", async () => {
      const envContent = `
OTHER_VAR=should-be-ignored
COPIMA_GITLAB_HOST=https://gitlab.example.com
`;
      const filePath = join(testDir, ".env");
      writeFileSync(filePath, envContent);

      const config = await loader.loadEnvFile(filePath);

      expect(config).not.toHaveProperty("other");
      expect(config.gitlab).toEqual({
        host: "https://gitlab.example.com",
      });
    });

    it("handles nested config values", async () => {
      const envContent = `COPIMA_GITLAB_OAUTH_CLIENTID=test-client-id`;
      const filePath = join(testDir, ".env");
      writeFileSync(filePath, envContent);

      const config = await loader.loadEnvFile(filePath);

      expect(config.gitlab).toEqual({
        oauth: {
          clientid: "test-client-id",
        },
      });
    });
  });
});
