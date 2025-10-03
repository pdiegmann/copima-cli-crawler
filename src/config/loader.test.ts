/**
 * Test suite for configuration loader
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { promises as fs } from "fs";
import { ConfigurationValidationError } from "./errors.js";
import { loadConfig } from "./loader.js";
import type { SetupWizardResult } from "./setupWizard";

// Mock fs
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  stat: jest.fn(),
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    stat: jest.fn(),
  },
}));
// Mock os
jest.mock("os", () => ({
  homedir: jest.fn(() => "/home/user"),
}));

// Mock path
jest.mock("path", () => ({
  join: jest.fn((...args: string[]) => args.join("/")),
  basename: jest.fn((p: string) => p.split("/").pop() || ""),
  dirname: jest.fn((p: string) => p.split("/").slice(0, -1).join("/") || "/"),
  resolve: jest.fn((...args: string[]) => args.join("/")),
  extname: jest.fn((p: string) => {
    const parts = p.split(".");
    return parts.length > 1 ? "." + parts.pop() : "";
  }),
}));

// Mock yaml
jest.mock("yaml", () => ({
  parse: jest.fn((content: string) => JSON.parse(content)),
}));

// Create mock instances
const mockFileLoaderInstance = {
  loadYamlFile: jest.fn() as jest.MockedFunction<any>,
  loadJsonFile: jest.fn() as jest.MockedFunction<any>,
  loadEnvFile: jest.fn() as jest.MockedFunction<any>,
};

const mockEnvironmentLoaderInstance = {
  loadFromEnvironment: jest.fn() as jest.MockedFunction<any>,
};

const mockConfigMergerInstance = {
  merge: jest.fn() as jest.MockedFunction<any>,
};

const mockConfigValidatorInstance = {
  validate: jest.fn().mockReturnValue({ isValid: true, errors: [], warnings: [] }),
};

const runSetupWizardMock = jest.fn<(options: unknown) => Promise<SetupWizardResult>>();

// Mock file loader
jest.mock("./loaders/fileLoader", () => ({
  FileConfigLoader: jest.fn().mockImplementation(() => mockFileLoaderInstance),
}));

// Mock environment loader
jest.mock("./loaders/environmentLoader", () => ({
  EnvironmentConfigLoader: jest.fn().mockImplementation(() => mockEnvironmentLoaderInstance),
}));

// Mock config merger
jest.mock("./merging/configMerger", () => ({
  ConfigMerger: jest.fn().mockImplementation(() => mockConfigMergerInstance),
}));

// Mock defaults
jest.mock("./defaults", () => ({
  defaultConfig: {
    gitlab: { host: "https://gitlab.com", accessToken: "default-token", timeout: 5000 },
    output: { rootDir: "./output" },
    database: { path: "./database.yaml" },
    logging: { level: "info", console: true },
    progress: { enabled: true, file: "./progress.yaml" },
    resume: { enabled: true, stateFile: "./resume.json" },
    callbacks: { enabled: false },
  },
}));

// Mock template utils
jest.mock("./utils/templateUtils", () => ({
  TemplateUtils: {
    getDefaultVariables: jest.fn(() => ({})),
    interpolateDeep: jest.fn((config) => config),
  },
}));

// Mock validator
jest.mock("./validation/validator", () => ({
  ConfigValidator: jest.fn().mockImplementation(() => mockConfigValidatorInstance),
}));

jest.mock("./setupWizard.js", () => ({
  runSetupWizard: runSetupWizardMock,
}));

describe("Configuration Loader", () => {
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigValidatorInstance.validate.mockReset();
    mockConfigValidatorInstance.validate.mockReturnValue({ isValid: true, errors: [], warnings: [] });
    runSetupWizardMock.mockReset();
    process.env = {}; // Reset environment
  });

  describe("loadConfig", () => {
    it("should load configuration with default values", async () => {
      // Mock file doesn't exist
      mockFs.access.mockRejectedValueOnce(new Error("File not found"));

      // Mock environment config
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({
        gitlab: { accessToken: "env-token" },
      });

      // Mock merger
      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "env-token",
          timeout: 5000,
        },
        output: { rootDir: "./output" },
      });

      const result = await loadConfig({});

      expect(result.gitlab?.host).toBe("https://gitlab.com");
      expect(result.gitlab?.accessToken).toBe("env-token");
    });

    it("should load configuration from specified file", async () => {
      const configPath = "./test-config.yaml";

      // Mock file config
      mockFileLoaderInstance.loadYamlFile.mockResolvedValueOnce({
        gitlab: { host: "https://custom.gitlab.com", accessToken: "file-token" },
      });

      // Mock environment config
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({
        output: { rootDir: "./output" },
      });

      // Mock merger
      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: {
          host: "https://custom.gitlab.com",
          accessToken: "file-token",
          timeout: 5000,
        },
        output: { rootDir: "./output" },
      });

      const result = await loadConfig({ config: configPath });

      expect(mockFileLoaderInstance.loadYamlFile).toHaveBeenCalledWith(configPath);
      expect(result.gitlab?.host).toBe("https://custom.gitlab.com");
      expect(result.output?.rootDir).toBe("./output");
    });

    it("should handle file loading errors gracefully", async () => {
      const configPath = "./invalid-config.yaml";

      // Mock file access check passes but loading fails
      mockFs.access.mockResolvedValueOnce(undefined);
      mockFileLoaderInstance.loadYamlFile.mockRejectedValueOnce(new Error("Invalid YAML syntax"));

      // Should still work with environment and defaults
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});
      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "default-token", timeout: 5000 },
        output: { rootDir: "./output" },
      });

      const result = await loadConfig({ config: configPath });

      expect(result).toBeDefined();
      expect(result.gitlab?.host).toBe("https://gitlab.com");
    });

    it("should prioritize CLI arguments over environment variables", async () => {
      // No config file
      mockFs.access.mockRejectedValueOnce(new Error("File not found"));

      // Mock environment with token
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({
        gitlab: { accessToken: "env-token", host: "https://env.gitlab.com" },
      });

      // Mock merger that prioritizes CLI args
      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: {
          host: "https://cli.gitlab.com", // CLI arg wins
          accessToken: "env-token", // From environment
          timeout: 5000, // From defaults
        },
        output: { rootDir: "./output" },
      });

      const result = await loadConfig({
        host: "https://cli.gitlab.com",
      });

      expect(result.gitlab?.host).toBe("https://cli.gitlab.com");
      expect(result.gitlab?.accessToken).toBe("env-token");
    });

    it("should auto-discover config files", async () => {
      // No explicit config specified
      // Mock first few files don't exist, but one does
      mockFs.access.mockRejectedValueOnce(new Error("Not found")).mockRejectedValueOnce(new Error("Not found")).mockResolvedValueOnce(undefined); // Found one

      mockFileLoaderInstance.loadYamlFile.mockResolvedValueOnce({
        gitlab: { host: "https://auto.gitlab.com", accessToken: "auto-token" },
      });

      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});

      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: {
          host: "https://auto.gitlab.com",
          accessToken: "auto-token",
          timeout: 5000,
        },
        output: { rootDir: "./output" },
      });

      const result = await loadConfig({});

      expect(result.gitlab?.host).toBe("https://auto.gitlab.com");
    });

    it("should handle missing configuration gracefully", async () => {
      // All config file checks fail
      mockFs.access.mockRejectedValue(new Error("Not found"));

      // Empty environment
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});

      // Just defaults
      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "default-token", timeout: 5000 },
        output: { rootDir: "./output" },
      });

      const result = await loadConfig({});

      expect(result).toBeDefined();
      expect(result.gitlab?.host).toBe("https://gitlab.com");
    });

    it("should resolve relative paths correctly", async () => {
      const relativePath = "../config/test.yaml";

      mockFs.access.mockResolvedValueOnce(undefined);

      mockFileLoaderInstance.loadYamlFile.mockResolvedValueOnce({
        gitlab: { accessToken: "path-token" },
        output: { rootDir: "../data" },
      });

      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});

      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "path-token", timeout: 5000 },
        output: { rootDir: "../data" },
      });

      const result = await loadConfig({ config: relativePath });

      expect(result.output?.rootDir).toBe("../data");
    });

    it("should handle environment variable overrides", async () => {
      // Set up environment variables
      process.env["GITLAB_ACCESS_TOKEN"] = "env-secret-token";
      process.env["GITLAB_HOST"] = "https://env.gitlab.example.com";

      mockFs.access.mockRejectedValueOnce(new Error("No config file"));

      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({
        gitlab: {
          accessToken: "env-secret-token",
          host: "https://env.gitlab.example.com",
        },
      });

      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: {
          host: "https://env.gitlab.example.com",
          accessToken: "env-secret-token",
          timeout: 5000,
        },
        output: { rootDir: "./output" },
      });

      const result = await loadConfig({});

      expect(result.gitlab?.accessToken).toBe("env-secret-token");
      expect(result.gitlab?.host).toBe("https://env.gitlab.example.com");
    });
  });

  describe("error handling", () => {
    it("should handle invalid config file gracefully", async () => {
      mockFs.access.mockResolvedValueOnce(undefined);

      // File exists but is invalid
      mockFileLoaderInstance.loadYamlFile.mockRejectedValueOnce(new Error("YAML parsing failed"));

      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});

      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "default-token", timeout: 5000 },
        output: { rootDir: "./output" },
      });

      // Should not throw, but log the error and continue
      const result = await loadConfig({ config: "./bad-config.yaml" });

      expect(result).toBeDefined();
    });

    it("should handle environment loading errors", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("No config file"));

      mockEnvironmentLoaderInstance.loadFromEnvironment.mockImplementationOnce(() => {
        throw new Error("Environment loading failed");
      });

      // This test expects the environment loading to fail, so we should expect the entire config loading to fail
      await expect(loadConfig({})).rejects.toThrow("Configuration loading failed: Environment loading failed");
    });

    it("should handle merger errors", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("No config file"));

      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});

      mockConfigMergerInstance.merge.mockImplementationOnce(() => {
        throw new Error("Config merging failed");
      });

      // Should fallback to some basic config
      await expect(loadConfig({})).rejects.toThrow();
    });
  });

  describe("validation", () => {
    it("should validate numeric fields and throw on invalid values", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("No config"));
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});
      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "token", timeout: -1 },
        output: { rootDir: "./output" },
      });

      mockConfigValidatorInstance.validate.mockReturnValueOnce({
        isValid: false,
        errors: [{ field: "gitlab.timeout", message: "must be positive", severity: "error" }],
        warnings: [],
      });

      await expect(loadConfig({}, { autoSetup: false })).rejects.toThrow(ConfigurationValidationError);
    });

    it("should validate maxConcurrency field", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("No config"));
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});
      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "token", maxConcurrency: 0 },
        output: { rootDir: "./output" },
      });

      mockConfigValidatorInstance.validate.mockReturnValueOnce({ isValid: true, errors: [], warnings: [] });

      await expect(loadConfig({}, { autoSetup: false })).rejects.toThrow(ConfigurationValidationError);
    });

    it("should validate rateLimit field", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("No config"));
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});
      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "token", rateLimit: -5 },
        output: { rootDir: "./output" },
      });

      mockConfigValidatorInstance.validate.mockReturnValueOnce({ isValid: true, errors: [], warnings: [] });

      await expect(loadConfig({}, { autoSetup: false })).rejects.toThrow(ConfigurationValidationError);
    });

    it("should validate database timeout field", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("No config"));
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});
      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "token" },
        database: { path: "./db.yaml", timeout: 0 },
        output: { rootDir: "./output" },
      });

      mockConfigValidatorInstance.validate.mockReturnValueOnce({ isValid: true, errors: [], warnings: [] });

      await expect(loadConfig({}, { autoSetup: false })).rejects.toThrow(ConfigurationValidationError);
    });

    it("should validate progress interval field", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("No config"));
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});
      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "token" },
        progress: { enabled: true, interval: -10 },
        output: { rootDir: "./output" },
      });

      mockConfigValidatorInstance.validate.mockReturnValueOnce({ isValid: true, errors: [], warnings: [] });

      await expect(loadConfig({}, { autoSetup: false })).rejects.toThrow(ConfigurationValidationError);
    });

    it("should validate resume autoSaveInterval field", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("No config"));
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});
      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "token" },
        resume: { enabled: true, autoSaveInterval: 0 },
        output: { rootDir: "./output" },
      });

      mockConfigValidatorInstance.validate.mockReturnValueOnce({ isValid: true, errors: [], warnings: [] });

      await expect(loadConfig({}, { autoSetup: false })).rejects.toThrow(ConfigurationValidationError);
    });

    it("should log warnings when validation has warnings but no errors", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("No config"));
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});
      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "token" },
        output: { rootDir: "./output" },
      });

      mockConfigValidatorInstance.validate.mockReturnValueOnce({
        isValid: true,
        errors: [],
        warnings: ["Warning 1", "Warning 2"],
      });

      const result = await loadConfig({});
      expect(result).toBeDefined();
    });
  });

  describe("CLI arguments conversion", () => {
    it("should convert all gitlab CLI args to config", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("No config"));
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});

      const argsConfig = {
        gitlab: {
          host: "https://cli.gitlab.com",
          accessToken: "cli-token",
          refreshToken: "cli-refresh",
          timeout: 10000,
          maxConcurrency: 5,
          rateLimit: 100,
        },
        output: { rootDir: "./output" },
      };

      mockConfigMergerInstance.merge.mockReturnValueOnce(argsConfig);

      const result = await loadConfig({
        host: "https://cli.gitlab.com",
        accessToken: "cli-token",
        refreshToken: "cli-refresh",
        timeout: 10000,
        maxConcurrency: 5,
        rateLimit: 100,
      });

      expect(result.gitlab?.host).toBe("https://cli.gitlab.com");
      expect(result.gitlab?.timeout).toBe(10000);
    });

    it("should convert database CLI args to config", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("No config"));
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});

      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "token" },
        database: { path: "./custom-db.yaml", walMode: true, timeout: 5000 },
        output: { rootDir: "./output" },
      });

      const result = await loadConfig({
        databasePath: "./custom-db.yaml",
        walMode: true,
        databaseTimeout: 5000,
      });

      expect(result.database?.path).toBe("./custom-db.yaml");
    });

    it("should convert output CLI args to config", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("No config"));
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});

      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "token" },
        output: {
          rootDir: "./data",
          fileNaming: "kebab-case",
          prettyPrint: true,
          compression: "gzip",
        },
      });

      const result = await loadConfig({
        outputDir: "./data",
        fileNaming: "kebab-case",
        prettyPrint: true,
        compression: "gzip",
      });

      expect(result.output?.rootDir).toBe("./data");
      expect(result.output?.fileNaming).toBe("kebab-case");
    });

    it("should convert logging CLI args to config", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("No config"));
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});

      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "token" },
        output: { rootDir: "./output" },
        logging: {
          level: "debug",
          format: "json",
          file: "./app.log",
          console: true,
          colors: false,
        },
      });

      const result = await loadConfig({
        logLevel: "debug",
        logFormat: "json",
        logFile: "./app.log",
        console: true,
        colors: false,
      });

      expect(result.logging?.level).toBe("debug");
      expect(result.logging?.format).toBe("json");
    });

    it("should convert progress CLI args to config", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("No config"));
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});

      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "token" },
        output: { rootDir: "./output" },
        progress: {
          enabled: true,
          file: "./progress.yaml",
          interval: 1000,
          detailed: true,
        },
      });

      const result = await loadConfig({
        progressEnabled: true,
        progressFile: "./progress.yaml",
        progressInterval: 1000,
        progressDetailed: true,
      });

      expect(result.progress?.enabled).toBe(true);
      expect(result.progress?.interval).toBe(1000);
    });

    it("should convert resume CLI args to config", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("No config"));
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});

      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "token" },
        output: { rootDir: "./output" },
        resume: {
          enabled: true,
          stateFile: "./state.json",
          autoSaveInterval: 5000,
        },
      });

      const result = await loadConfig({
        resumeEnabled: true,
        resumeStateFile: "./state.json",
        resumeAutoSaveInterval: 5000,
      });

      expect(result.resume?.enabled).toBe(true);
      expect(result.resume?.autoSaveInterval).toBe(5000);
    });

    it("should convert callback CLI args to config", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("No config"));
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});

      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "token" },
        output: { rootDir: "./output" },
        callbacks: {
          enabled: true,
          modulePath: "./callbacks.js",
        },
      });

      const result = await loadConfig({
        callbackEnabled: true,
        callbackModulePath: "./callbacks.js",
      });

      expect(result.callbacks?.enabled).toBe(true);
      expect(result.callbacks?.modulePath).toBe("./callbacks.js");
    });
  });

  describe("JSON config file loading", () => {
    it("should load JSON config file when specified", async () => {
      const configPath = "./test-config.json";

      mockFileLoaderInstance.loadJsonFile.mockResolvedValueOnce({
        gitlab: { host: "https://json.gitlab.com", accessToken: "json-token" },
      });

      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});

      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: {
          host: "https://json.gitlab.com",
          accessToken: "json-token",
          timeout: 5000,
        },
        output: { rootDir: "./output" },
      });

      const result = await loadConfig({ config: configPath });

      expect(mockFileLoaderInstance.loadJsonFile).toHaveBeenCalledWith(configPath);
      expect(result.gitlab?.host).toBe("https://json.gitlab.com");
    });

    it("should auto-discover JSON config files", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("Not found")).mockRejectedValueOnce(new Error("Not found")).mockRejectedValueOnce(new Error("Not found")).mockResolvedValueOnce(undefined);

      mockFileLoaderInstance.loadJsonFile.mockResolvedValueOnce({
        gitlab: { host: "https://auto-json.gitlab.com", accessToken: "auto-json-token" },
      });

      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});

      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: {
          host: "https://auto-json.gitlab.com",
          accessToken: "auto-json-token",
          timeout: 5000,
        },
        output: { rootDir: "./output" },
      });

      const result = await loadConfig({});

      expect(result.gitlab?.host).toBe("https://auto-json.gitlab.com");
    });
  });

  describe("template interpolation errors", () => {
    it("should handle template interpolation errors", async () => {
      const { TemplateUtils } = await import("./utils/templateUtils");
      const interpolateDeepMock = TemplateUtils.interpolateDeep as jest.MockedFunction<any>;

      mockFs.access.mockRejectedValueOnce(new Error("No config"));
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValueOnce({});
      mockConfigMergerInstance.merge.mockReturnValueOnce({
        gitlab: { host: "https://gitlab.com", accessToken: "token" },
        output: { rootDir: "./output" },
      });

      // Make interpolation throw an error
      interpolateDeepMock.mockImplementationOnce(() => {
        throw new Error("Template interpolation failed");
      });

      await expect(loadConfig({})).rejects.toThrow("Configuration loading failed: Template interpolation failed");
    });
  });

  describe("auto setup wizard", () => {
    const baseConfig = {
      gitlab: { host: "", accessToken: "", timeout: 5000 },
      output: { rootDir: "./output" },
      database: { path: "./database.sqlite" },
      logging: { level: "info", console: true },
      progress: { enabled: true, file: "./progress.yaml" },
      resume: { enabled: true, stateFile: "./resume.json" },
      callbacks: { enabled: false },
    };

    let originalStdoutIsTTY: boolean | undefined;
    let originalStdinIsTTY: boolean | undefined;

    beforeEach(() => {
      originalStdoutIsTTY = (process.stdout as any).isTTY;
      originalStdinIsTTY = (process.stdin as any).isTTY;
      (process.stdout as any).isTTY = true;
      (process.stdin as any).isTTY = true;
    });

    afterEach(() => {
      (process.stdout as any).isTTY = originalStdoutIsTTY;
      (process.stdin as any).isTTY = originalStdinIsTTY;
    });

    it("should skip wizard when autoSetup is false", async () => {
      mockConfigMergerInstance.merge.mockReturnValue(baseConfig);
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValue({});
      mockConfigValidatorInstance.validate.mockImplementationOnce(() => ({
        isValid: false,
        errors: [{ field: "gitlab.host", message: "required", severity: "error" }],
        warnings: [],
      }));

      await expect(loadConfig({}, { autoSetup: false })).rejects.toBeInstanceOf(ConfigurationValidationError);
      expect(runSetupWizardMock).not.toHaveBeenCalled();
    });

    it("launches setup wizard when validation fails interactively", async () => {
      const invalidConfig = { ...baseConfig };
      const validConfig = {
        ...baseConfig,
        gitlab: {
          ...baseConfig.gitlab,
          host: "https://gitlab.com",
        },
        oauth2: {
          providers: {
            gitlab: {
              clientId: "client-id",
              clientSecret: "client-secret",
              authorizationUrl: "https://gitlab.com/oauth/authorize",
              tokenUrl: "https://gitlab.com/oauth/token",
              redirectUri: "http://localhost:3000/callback",
              scopes: ["api", "read_user"],
            },
          },
        },
      };

      mockConfigMergerInstance.merge.mockReturnValueOnce(invalidConfig).mockReturnValueOnce(validConfig);
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValue({});
      mockConfigValidatorInstance.validate
        .mockImplementationOnce(() => ({
          isValid: false,
          errors: [
            { field: "gitlab.host", message: "required", severity: "error" },
            { field: "gitlab.accessToken", message: "required", severity: "error" },
          ],
          warnings: [],
        }))
        .mockImplementationOnce(() => ({ isValid: true, errors: [], warnings: [] }));

      runSetupWizardMock.mockResolvedValueOnce({ status: "completed", configPath: "/tmp/copima.yaml" });

      const result = await loadConfig({});

      expect(runSetupWizardMock).toHaveBeenCalledTimes(1);
      const wizardArgs = runSetupWizardMock.mock.calls[0]?.[0] as unknown as { issues?: Array<{ field: string }> };
      expect(wizardArgs?.issues).toEqual(expect.arrayContaining([expect.objectContaining({ field: "gitlab.host" }), expect.objectContaining({ field: "gitlab.accessToken" })]));
      expect(result.gitlab?.host).toBe("https://gitlab.com");
      expect(result.gitlab?.accessToken).toBe("");
      expect(result.oauth2?.providers?.["gitlab"]).toEqual(expect.objectContaining({ clientId: "client-id", clientSecret: "client-secret" }));
    });

    it("rethrows validation error when wizard is aborted", async () => {
      mockConfigMergerInstance.merge.mockReturnValue(baseConfig);
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValue({});
      mockConfigValidatorInstance.validate.mockImplementationOnce(() => ({
        isValid: false,
        errors: [{ field: "gitlab.host", message: "required", severity: "error" }],
        warnings: [],
      }));

      runSetupWizardMock.mockResolvedValueOnce({ status: "aborted" });

      await expect(loadConfig({})).rejects.toBeInstanceOf(ConfigurationValidationError);
      expect(runSetupWizardMock).toHaveBeenCalledTimes(1);
    });

    it("does not invoke wizard when session is non-interactive", async () => {
      (process.stdout as any).isTTY = false;
      (process.stdin as any).isTTY = false;

      mockConfigMergerInstance.merge.mockReturnValue(baseConfig);
      mockEnvironmentLoaderInstance.loadFromEnvironment.mockReturnValue({});
      mockConfigValidatorInstance.validate.mockImplementationOnce(() => ({
        isValid: false,
        errors: [{ field: "gitlab.host", message: "required", severity: "error" }],
        warnings: [],
      }));

      await expect(loadConfig({})).rejects.toBeInstanceOf(ConfigurationValidationError);
      expect(runSetupWizardMock).not.toHaveBeenCalled();
    });
  });
});
