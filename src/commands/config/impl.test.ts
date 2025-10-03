import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import * as yaml from "js-yaml";
import type { Config } from "../../config/types";
import { setConfig, setupConfig, showConfig, unsetConfig, validateConfig } from "./impl";

// Mock dependencies
jest.mock("fs");
jest.mock("js-yaml");
jest.mock("../../config/loader", () => ({
  loadConfig: jest.fn<() => Promise<Config>>(),
  ConfigLoader: jest.fn().mockImplementation(() => ({
    load: jest.fn<(args?: any) => Promise<Config>>(),
    validate: jest.fn(),
    getCurrentConfig: jest.fn<() => Config>(),
  })),
}));
jest.mock("../../config/setupWizard", () => ({
  runSetupWizard: jest.fn<() => Promise<{ status: string }>>(),
}));
jest.mock("../../logging", () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));
jest.mock("picocolors", () => ({
  cyan: (text: string) => text,
  green: (text: string) => text,
  yellow: (text: string) => text,
  red: (text: string) => text,
  bold: (text: string) => text,
  dim: (text: string) => text,
  default: {
    cyan: (text: string) => text,
    green: (text: string) => text,
    yellow: (text: string) => text,
    red: (text: string) => text,
    bold: (text: string) => text,
    dim: (text: string) => text,
  },
}));
jest.mock("treeify", () => ({
  asTree: jest.fn(() => "mocked tree output"),
}));

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockMkdirSync = mkdirSync as jest.MockedFunction<typeof mkdirSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockYamlLoad = yaml.load as jest.MockedFunction<typeof yaml.load>;
const mockYamlDump = yaml.dump as jest.MockedFunction<typeof yaml.dump>;

const { loadConfig } = require("../../config/loader");
const { runSetupWizard } = require("../../config/setupWizard");

describe("config/impl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("showConfig", () => {
    it("should display config in table format by default", async () => {
      const mockConfig = {
        gitlab: { host: "https://gitlab.com", accessToken: "token123" },
        database: { path: "./db.yaml" },
      };
      loadConfig.mockResolvedValue(mockConfig);

      await showConfig({});

      expect(loadConfig).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalled();
    });

    it("should display config in JSON format", async () => {
      const mockConfig = { gitlab: { host: "https://gitlab.com" } };
      loadConfig.mockResolvedValue(mockConfig);

      await showConfig({ format: "json" });

      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify(mockConfig, null, 2)
      );
    });

    it("should display config in YAML format", async () => {
      const mockConfig = { gitlab: { host: "https://gitlab.com" } };
      loadConfig.mockResolvedValue(mockConfig);
      mockYamlDump.mockReturnValue("gitlab:\n  host: https://gitlab.com\n");

      await showConfig({ format: "yaml" });

      expect(mockYamlDump).toHaveBeenCalledWith(mockConfig, { indent: 2 });
      expect(console.log).toHaveBeenCalledWith("gitlab:\n  host: https://gitlab.com\n");
    });

    it("should display only specified section", async () => {
      const mockConfig = {
        gitlab: { host: "https://gitlab.com" },
        database: { path: "./db.yaml" },
      };
      loadConfig.mockResolvedValue(mockConfig);

      await showConfig({ section: "gitlab", format: "json" });

      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify({ gitlab: mockConfig.gitlab }, null, 2)
      );
    });

    it("should show configuration sources when source flag is set", async () => {
      const mockConfig = { gitlab: { host: "https://gitlab.com" } };
      loadConfig.mockResolvedValue(mockConfig);

      await showConfig({ source: true });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Configuration Sources"));
    });

    it("should handle configuration load errors", async () => {
      loadConfig.mockRejectedValue(new Error("Config load failed"));

      const result = await showConfig({});

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe("Config load failed");
    });
  });

  describe("setConfig", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(false);
      mockYamlLoad.mockReturnValue({});
      mockYamlDump.mockReturnValue("key: value\n");
    });

    it("should set config value in local config", async () => {
      await setConfig({ key: "gitlab.host", value: "https://gitlab.example.com" });

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("copima.yaml"),
        expect.any(String),
        "utf8"
      );
    });

    it("should set config value in global config", async () => {
      await setConfig({
        key: "gitlab.host",
        value: "https://gitlab.example.com",
        global: true,
      });

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining(".config/copima/config.yaml"),
        expect.any(String),
        "utf8"
      );
    });

    it("should parse number type correctly", async () => {
      await setConfig({
        key: "database.port",
        value: "5432",
        type: "number",
      });

      expect(mockYamlDump).toHaveBeenCalledWith(
        expect.objectContaining({
          database: { port: 5432 },
        }),
        { indent: 2 }
      );
    });

    it("should parse boolean type correctly", async () => {
      await setConfig({
        key: "logging.enabled",
        value: "true",
        type: "boolean",
      });

      expect(mockYamlDump).toHaveBeenCalledWith(
        expect.objectContaining({
          logging: { enabled: true },
        }),
        { indent: 2 }
      );
    });

    it("should handle invalid number values", async () => {
      const result = await setConfig({
        key: "database.port",
        value: "invalid",
        type: "number",
      });

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain("Invalid number value");
    });

    it("should create config directory if it doesn't exist", async () => {
      mockExistsSync.mockReturnValue(false);

      await setConfig({
        key: "test.key",
        value: "test",
        global: true,
      });

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });

    it("should merge with existing config", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("gitlab:\n  host: https://gitlab.com\n");
      mockYamlLoad.mockReturnValue({ gitlab: { host: "https://gitlab.com" } });

      await setConfig({ key: "gitlab.accessToken", value: "token123" });

      expect(mockYamlDump).toHaveBeenCalledWith(
        expect.objectContaining({
          gitlab: {
            host: "https://gitlab.com",
            accessToken: "token123",
          },
        }),
        { indent: 2 }
      );
    });

    it("should handle nested keys correctly", async () => {
      await setConfig({
        key: "gitlab.oauth2.clientId",
        value: "client123",
      });

      expect(mockYamlDump).toHaveBeenCalledWith(
        expect.objectContaining({
          gitlab: {
            oauth2: {
              clientId: "client123",
            },
          },
        }),
        { indent: 2 }
      );
    });

    it("should return error when key is missing", async () => {
      const result = await setConfig({ key: "", value: "test" });

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe("Key and value are required");
    });

    it("should return error when value is missing", async () => {
      const result = await setConfig({ key: "test.key", value: "" });

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe("Key and value are required");
    });
  });

  describe("unsetConfig", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("gitlab:\n  host: https://gitlab.com\n  accessToken: token123\n");
      mockYamlLoad.mockReturnValue({
        gitlab: { host: "https://gitlab.com", accessToken: "token123" },
      });
      mockYamlDump.mockReturnValue("gitlab:\n  host: https://gitlab.com\n");
    });

    it("should remove config key from local config", async () => {
      await unsetConfig({ key: "gitlab.accessToken" });

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("copima.yaml"),
        expect.any(String),
        "utf8"
      );
    });

    it("should remove config key from global config", async () => {
      await unsetConfig({ key: "gitlab.accessToken", global: true });

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining(".config/copima/config.yaml"),
        expect.any(String),
        "utf8"
      );
    });

    it("should handle non-existent config file", async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await unsetConfig({ key: "gitlab.host" });

      expect(result).toBeUndefined();
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it("should handle non-existent key", async () => {
      mockYamlLoad.mockReturnValue({ gitlab: { host: "https://gitlab.com" } });

      const result = await unsetConfig({ key: "nonexistent.key" });

      expect(result).toBeUndefined();
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it("should return error when key is missing", async () => {
      const result = await unsetConfig({ key: "" });

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe("Key is required");
    });

    it("should handle nested key removal", async () => {
      mockYamlLoad.mockReturnValue({
        gitlab: {
          oauth2: {
            clientId: "client123",
            clientSecret: "secret456",
          },
        },
      });

      await unsetConfig({ key: "gitlab.oauth2.clientId" });

      expect(mockYamlDump).toHaveBeenCalledWith(
        expect.objectContaining({
          gitlab: {
            oauth2: {
              clientSecret: "secret456",
            },
          },
        }),
        { indent: 2 }
      );
    });
  });

  describe("validateConfig", () => {
    it("should validate configuration successfully", async () => {
      loadConfig.mockResolvedValue({
        gitlab: { host: "https://gitlab.com", accessToken: "token12345678901234567890" },
        database: { path: "./db.yaml" },
        output: { directory: "./output", format: "json" },
        logging: { level: "info" },
      });

      const result = await validateConfig({});

      expect(result).toBeUndefined();
    });

    it("should detect invalid GitLab host", async () => {
      loadConfig.mockResolvedValue({
        gitlab: { host: "invalid-url", accessToken: "token123" },
      });

      const result = await validateConfig({});

      expect(result).toBeInstanceOf(Error);
    });

    it("should warn about short access token", async () => {
      loadConfig.mockResolvedValue({
        gitlab: { host: "https://gitlab.com", accessToken: "short" },
      });

      const result = await validateConfig({});

      expect(result).toBeUndefined(); // Warnings don't cause failure by default
    });

    it("should detect invalid logging level", async () => {
      loadConfig.mockResolvedValue({
        logging: { level: "invalid" },
      });

      const result = await validateConfig({});

      expect(result).toBeInstanceOf(Error);
    });

    it("should treat warnings as errors in strict mode", async () => {
      loadConfig.mockResolvedValue({
        gitlab: { host: "https://gitlab.com", accessToken: "short" },
      });

      const result = await validateConfig({ strict: true });

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain("strict mode");
    });

    it("should warn about auto-fix not implemented", async () => {
      loadConfig.mockResolvedValue({
        gitlab: { host: "https://gitlab.com", accessToken: "token12345678901234567890" },
      });

      const result = await validateConfig({ fix: true });

      expect(result).toBeUndefined();
    });

    it("should validate database path extension", async () => {
      loadConfig.mockResolvedValue({
        database: { path: "./database.json" },
      });

      const result = await validateConfig({});

      expect(result).toBeUndefined(); // Warning only
    });

    it("should validate output format", async () => {
      loadConfig.mockResolvedValue({
        output: { format: "xml" },
      });

      const result = await validateConfig({});

      expect(result).toBeUndefined(); // Warning only
    });
  });

  describe("setupConfig", () => {
    it("should run setup wizard successfully", async () => {
      const mockConfig = {
        gitlab: { host: "https://gitlab.com" },
      } as Config;

      const mockLoader = {
        load: jest.fn<(args?: any) => Promise<Config>>().mockResolvedValue(mockConfig),
        validate: jest.fn(),
        getCurrentConfig: jest.fn<() => Config>().mockReturnValue(mockConfig),
      };

      require("../../config/loader").ConfigLoader.mockImplementation(() => mockLoader);
      runSetupWizard.mockResolvedValue({ status: "completed" });
      loadConfig.mockResolvedValue(mockConfig);

      const result = await setupConfig({});

      expect(result).toBeUndefined();
      expect(runSetupWizard).toHaveBeenCalled();
    });

    it("should handle setup wizard abort", async () => {
      const mockConfig = { gitlab: { host: "https://gitlab.com" } } as Config;
      const mockLoader = {
        load: jest.fn<(args?: any) => Promise<Config>>().mockResolvedValue(mockConfig),
        validate: jest.fn(),
        getCurrentConfig: jest.fn<() => Config>().mockReturnValue(mockConfig),
      };

      require("../../config/loader").ConfigLoader.mockImplementation(() => mockLoader);
      runSetupWizard.mockResolvedValue({ status: "aborted" });

      const result = await setupConfig({});

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain("aborted");
    });

    it("should handle setup wizard skip", async () => {
      const mockConfig = { gitlab: { host: "https://gitlab.com" } } as Config;
      const mockLoader = {
        load: jest.fn<(args?: any) => Promise<Config>>().mockResolvedValue(mockConfig),
        validate: jest.fn(),
        getCurrentConfig: jest.fn<() => Config>().mockReturnValue(mockConfig),
      };

      require("../../config/loader").ConfigLoader.mockImplementation(() => mockLoader);
      runSetupWizard.mockResolvedValue({ status: "skipped" });

      const result = await setupConfig({});

      expect(result).toBeUndefined();
    });

    it("should use custom config path", async () => {
      const mockConfig = { gitlab: { host: "https://gitlab.com" } } as Config;
      const mockLoader = {
        load: jest.fn<(args?: any) => Promise<Config>>().mockResolvedValue(mockConfig),
        validate: jest.fn(),
        getCurrentConfig: jest.fn<() => Config>().mockReturnValue(mockConfig),
      };

      require("../../config/loader").ConfigLoader.mockImplementation(() => mockLoader);
      runSetupWizard.mockResolvedValue({ status: "completed" });
      loadConfig.mockResolvedValue(mockConfig);

      await setupConfig({ config: "./custom-config.yaml" });

      expect(mockLoader.load).toHaveBeenCalledWith({ config: "./custom-config.yaml" });
    });

    it("should handle full setup mode", async () => {
      const mockConfig = { gitlab: { host: "https://gitlab.com" } } as Config;
      const mockLoader = {
        load: jest.fn<(args?: any) => Promise<Config>>().mockResolvedValue(mockConfig),
        validate: jest.fn(),
        getCurrentConfig: jest.fn<() => Config>().mockReturnValue(mockConfig),
      };

      require("../../config/loader").ConfigLoader.mockImplementation(() => mockLoader);
      runSetupWizard.mockResolvedValue({ status: "completed" });
      loadConfig.mockResolvedValue(mockConfig);

      await setupConfig({ full: true });

      expect(runSetupWizard).toHaveBeenCalledWith(
        expect.objectContaining({
          alwaysPromptCoreFields: true,
        })
      );
    });

    it("should handle validation errors during setup", async () => {
      const mockLoader = {
        load: jest.fn<(args?: any) => Promise<Config>>().mockRejectedValue(new Error("Load failed")),
        validate: jest.fn(),
        getCurrentConfig: jest.fn<() => Config>().mockReturnValue({} as Config),
      };

      require("../../config/loader").ConfigLoader.mockImplementation(() => mockLoader);

      const result = await setupConfig({});

      expect(result).toBeInstanceOf(Error);
    });

    it("should handle post-setup validation failure", async () => {
      const mockConfig = { gitlab: { host: "https://gitlab.com" } } as Config;
      const mockLoader = {
        load: jest.fn<(args?: any) => Promise<Config>>().mockResolvedValue(mockConfig),
        validate: jest.fn(),
        getCurrentConfig: jest.fn<() => Config>().mockReturnValue(mockConfig),
      };

      require("../../config/loader").ConfigLoader.mockImplementation(() => mockLoader);
      runSetupWizard.mockResolvedValue({ status: "completed" });
      loadConfig.mockRejectedValue(new Error("Validation failed"));

      const result = await setupConfig({});

      expect(result).toBeInstanceOf(Error);
    });
  });
});
