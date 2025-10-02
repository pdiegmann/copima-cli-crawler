import { beforeEach, describe, expect, it } from "@jest/globals";
import { EnvironmentConfigLoader } from "./environmentLoader";

describe("EnvironmentConfigLoader", () => {
  let loader: EnvironmentConfigLoader;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    loader = new EnvironmentConfigLoader();
    originalEnv = { ...process.env };
    // Clear all env vars
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("GITLAB_") || key.startsWith("DATABASE_") || key.startsWith("OUTPUT_") || key.startsWith("LOG_") || key.startsWith("PROGRESS_") || key.startsWith("RESUME_") || key.startsWith("CALLBACK_") || key.startsWith("COPIMA_")) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("loadFromEnvironment", () => {
    it("returns empty config when no env vars are set", () => {
      const config = loader.loadFromEnvironment();
      expect(config).toEqual({});
    });

    it("loads GitLab configuration from env vars", () => {
      process.env["GITLAB_HOST"] = "https://gitlab.example.com";
      process.env["GITLAB_ACCESS_TOKEN"] = "test-token";
      process.env["GITLAB_REFRESH_TOKEN"] = "refresh-token";
      process.env["GITLAB_TIMEOUT"] = "30000";
      process.env["GITLAB_MAX_CONCURRENCY"] = "5";
      process.env["GITLAB_RATE_LIMIT"] = "100";

      const config = loader.loadFromEnvironment();

      expect(config.gitlab).toEqual({
        host: "https://gitlab.example.com",
        accessToken: "test-token",
        refreshToken: "refresh-token",
        timeout: 30000,
        maxConcurrency: 5,
        rateLimit: 100,
      });
    });

    it("loads database configuration from env vars", () => {
      process.env["DATABASE_PATH"] = "./test.db";
      process.env["DATABASE_WAL_MODE"] = "true";
      process.env["DATABASE_TIMEOUT"] = "5000";

      const config = loader.loadFromEnvironment();

      expect(config.database).toEqual({
        path: "./test.db",
        walMode: true,
        timeout: 5000,
      });
    });

    it("loads output configuration from env vars", () => {
      process.env["OUTPUT_ROOT_DIR"] = "./output";
      process.env["OUTPUT_FILE_NAMING"] = "kebab-case";
      process.env["OUTPUT_PRETTY_PRINT"] = "true";
      process.env["OUTPUT_COMPRESSION"] = "gzip";

      const config = loader.loadFromEnvironment();

      expect(config.output).toEqual({
        rootDir: "./output",
        fileNaming: "kebab-case",
        prettyPrint: true,
        compression: "gzip",
      });
    });

    it("loads logging configuration from env vars", () => {
      process.env["LOG_LEVEL"] = "debug";
      process.env["LOG_FORMAT"] = "json";
      process.env["LOG_FILE"] = "./app.log";
      process.env["LOG_CONSOLE"] = "true";
      process.env["LOG_COLORS"] = "false";

      const config = loader.loadFromEnvironment();

      expect(config.logging).toEqual({
        level: "debug",
        format: "json",
        file: "./app.log",
        console: true,
        colors: false,
      });
    });

    it("loads progress configuration from env vars", () => {
      process.env["PROGRESS_ENABLED"] = "true";
      process.env["PROGRESS_FILE"] = "./progress.yaml";
      process.env["PROGRESS_INTERVAL"] = "1000";
      process.env["PROGRESS_DETAILED"] = "true";

      const config = loader.loadFromEnvironment();

      expect(config.progress).toEqual({
        enabled: true,
        file: "./progress.yaml",
        interval: 1000,
        detailed: true,
      });
    });

    it("loads resume configuration from env vars", () => {
      process.env["RESUME_ENABLED"] = "true";
      process.env["RESUME_STATE_FILE"] = "./resume.json";
      process.env["RESUME_AUTO_SAVE_INTERVAL"] = "5000";

      const config = loader.loadFromEnvironment();

      expect(config.resume).toEqual({
        enabled: true,
        stateFile: "./resume.json",
        autoSaveInterval: 5000,
      });
    });

    it("loads callback configuration from env vars", () => {
      process.env["CALLBACK_ENABLED"] = "true";
      process.env["CALLBACK_MODULE_PATH"] = "./callbacks.js";

      const config = loader.loadFromEnvironment();

      expect(config.callbacks).toEqual({
        enabled: true,
        modulePath: "./callbacks.js",
      });
    });

    it("handles invalid integer values", () => {
      process.env["GITLAB_TIMEOUT"] = "invalid";
      process.env["GITLAB_MAX_CONCURRENCY"] = "not-a-number";

      const config = loader.loadFromEnvironment();

      expect(config.gitlab).toBeUndefined();
    });

    it("handles invalid boolean values", () => {
      process.env["DATABASE_WAL_MODE"] = "invalid";

      const config = loader.loadFromEnvironment();

      // Invalid boolean values are treated as false
      expect(config.database).toEqual({
        walMode: false,
      });
    });

    it("handles invalid enum values", () => {
      process.env["OUTPUT_FILE_NAMING"] = "invalid-format";
      process.env["OUTPUT_COMPRESSION"] = "invalid-compression";

      const config = loader.loadFromEnvironment();

      expect(config.output).toBeUndefined();
    });

    it("parses boolean values case-insensitively", () => {
      process.env["LOG_CONSOLE"] = "TRUE";
      process.env["LOG_COLORS"] = "False";

      const config = loader.loadFromEnvironment();

      expect(config.logging).toEqual({
        console: true,
        colors: false,
      });
    });

    it("loads multiple sections simultaneously", () => {
      process.env["GITLAB_HOST"] = "https://gitlab.example.com";
      process.env["DATABASE_PATH"] = "./test.db";
      process.env["LOG_LEVEL"] = "info";

      const config = loader.loadFromEnvironment();

      expect(config.gitlab).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.logging).toBeDefined();
    });
  });

  describe("getConfigPaths", () => {
    it("returns empty array when no config paths are set", () => {
      const paths = loader.getConfigPaths();
      expect(paths).toEqual([]);
    });

    it("returns single config path from COPIMA_CONFIG_PATH", () => {
      process.env["COPIMA_CONFIG_PATH"] = "/path/to/config.yaml";

      const paths = loader.getConfigPaths();

      expect(paths).toEqual(["/path/to/config.yaml"]);
    });

    it("returns multiple config paths from COPIMA_CONFIG_PATHS", () => {
      process.env["COPIMA_CONFIG_PATHS"] = "/path/to/config1.yaml:/path/to/config2.yaml";

      const paths = loader.getConfigPaths();

      expect(paths).toEqual(["/path/to/config1.yaml", "/path/to/config2.yaml"]);
    });

    it("combines both COPIMA_CONFIG_PATH and COPIMA_CONFIG_PATHS", () => {
      process.env["COPIMA_CONFIG_PATH"] = "/path/to/config.yaml";
      process.env["COPIMA_CONFIG_PATHS"] = "/path/to/config1.yaml:/path/to/config2.yaml";

      const paths = loader.getConfigPaths();

      expect(paths).toEqual(["/path/to/config.yaml", "/path/to/config1.yaml", "/path/to/config2.yaml"]);
    });
  });
});
