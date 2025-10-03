import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { existsSync } from "fs";

// Mock dependencies before importing the implementation
jest.mock("fs");
jest.mock("../../logging/index.js");
jest.mock("../../testing/testRunner.js");

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockCreateLogger = jest.fn();
const mockCreateTestRunner = jest.fn();

// Import after mocking
import { testImpl } from "./impl.js";

describe("test/impl", () => {
  let mockLogger: any;
  let mockTestRunner: any;
  let mockProcessExit: jest.SpiedFunction<typeof process.exit>;
  let processExitCalls: number[];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    processExitCalls = [];

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    // Mock test runner
    mockTestRunner = {
      loadTestConfig: jest.fn(),
      loadTestSuite: jest.fn(),
      runTest: jest.fn(),
      runTestSuite: jest.fn(),
      cleanupProcesses: jest.fn(),
    };

    // Setup module mocks
    const loggingModule = jest.requireMock("../../logging/index.js") as any;
    loggingModule.createLogger = mockCreateLogger;
    mockCreateLogger.mockReturnValue(mockLogger);

    const testRunnerModule = jest.requireMock("../../testing/testRunner.js") as any;
    testRunnerModule.createTestRunner = mockCreateTestRunner;
    mockCreateTestRunner.mockReturnValue(mockTestRunner);

    // Mock process.exit to prevent actual exit
    mockProcessExit = jest.spyOn(process, "exit").mockImplementation((code?: string | number | null | undefined) => {
      processExitCalls.push(typeof code === "number" ? code : 0);
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    mockProcessExit.mockRestore();
  });

  describe("listExampleConfigurations", () => {
    it("lists example configurations when --list-examples flag is set", async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(
        testImpl({ "list-examples": true }, "test.yaml")
      ).resolves.toBeUndefined();

      expect(mockLogger.info).toHaveBeenCalledWith("Available example test configurations:");
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("examples/test-configs/basic-test.yaml"));
    });
  });

  describe("validateInputs", () => {
    it("exits with error when config path is missing", async () => {
      await expect(testImpl({}, "")).rejects.toThrow("process.exit(1)");

      expect(mockLogger.error).toHaveBeenCalledWith("Test configuration file path is required");
      expect(processExitCalls).toContain(1);
    });

    it("exits with error when config file does not exist", async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(testImpl({}, "nonexistent.yaml")).rejects.toThrow("process.exit(1)");

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Test configuration file not found"));
      expect(processExitCalls).toContain(1);
    });
  });

  describe("runSingleTest", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
    });

    it("runs a single test successfully", async () => {
      const mockConfig = { metadata: { name: "test-1" } };
      const mockResult = {
        success: true,
        config: mockConfig,
        executionTime: 1000,
        crawlerResult: { exitCode: 0 },
        warnings: [],
        validationResults: {
          files: [],
          logs: { valid: true, errors: [] },
        },
      };

      mockTestRunner.loadTestConfig.mockReturnValue(mockConfig);
      mockTestRunner.runTest.mockResolvedValue(mockResult);

      await testImpl({}, "test.yaml");

      expect(mockTestRunner.loadTestConfig).toHaveBeenCalledWith("test.yaml");
      expect(mockTestRunner.runTest).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Test execution completed successfully"));
    });

    it("reports test failure and exits", async () => {
      const mockConfig = { metadata: { name: "test-1" } };
      const mockResult = {
        success: false,
        config: mockConfig,
        executionTime: 1000,
        crawlerResult: { exitCode: 1 },
        warnings: [],
        error: "Test failed",
        validationResults: {
          files: [],
          logs: { valid: true, errors: [] },
        },
      };

      mockTestRunner.loadTestConfig.mockReturnValue(mockConfig);
      mockTestRunner.runTest.mockResolvedValue(mockResult);

      await expect(testImpl({}, "test.yaml")).rejects.toThrow("process.exit(1)");

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Error:"));
      expect(processExitCalls).toContain(1);
    });

    it("reports warnings", async () => {
      const mockConfig = { metadata: { name: "test-1" } };
      const mockResult = {
        success: true,
        config: mockConfig,
        executionTime: 1000,
        crawlerResult: { exitCode: 0 },
        warnings: ["Warning 1", "Warning 2"],
        validationResults: {
          files: [],
          logs: { valid: true, errors: [] },
        },
      };

      mockTestRunner.loadTestConfig.mockReturnValue(mockConfig);
      mockTestRunner.runTest.mockResolvedValue(mockResult);

      await testImpl({}, "test.yaml");

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Warning 1, Warning 2"));
    });

    it("reports file validation results", async () => {
      const mockConfig = { metadata: { name: "test-1" } };
      const mockResult = {
        success: true,
        config: mockConfig,
        executionTime: 1000,
        crawlerResult: { exitCode: 0 },
        warnings: [],
        validationResults: {
          files: [
            { path: "file1.jsonl", valid: true, recordCount: 10, errors: [] },
            { path: "file2.jsonl", valid: false, errors: ["Invalid format"] },
          ],
          logs: { valid: true, errors: [] },
        },
      };

      mockTestRunner.loadTestConfig.mockReturnValue(mockConfig);
      mockTestRunner.runTest.mockResolvedValue(mockResult);

      await testImpl({}, "test.yaml");

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("File Validation:"));
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Invalid format"));
    });

    it("reports log validation errors", async () => {
      const mockConfig = { metadata: { name: "test-1" } };
      const mockResult = {
        success: true,
        config: mockConfig,
        executionTime: 1000,
        crawlerResult: { exitCode: 0 },
        warnings: [],
        validationResults: {
          files: [],
          logs: { valid: false, errors: ["Log error 1", "Log error 2"] },
        },
      };

      mockTestRunner.loadTestConfig.mockReturnValue(mockConfig);
      mockTestRunner.runTest.mockResolvedValue(mockResult);

      await testImpl({}, "test.yaml");

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Log Validation:"));
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Log validation failed"));
    });
  });

  describe("runTestSuite", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
    });

    it("runs a test suite successfully", async () => {
      const mockSuite = {
        metadata: { name: "test-suite" },
        settings: {},
      };
      const mockResult = {
        success: true,
        suite: mockSuite,
        summary: { total: 3, passed: 3, failed: 0, warnings: 0 },
        totalExecutionTime: 5000,
        results: [],
      };

      mockTestRunner.loadTestSuite.mockReturnValue(mockSuite);
      mockTestRunner.runTestSuite.mockResolvedValue(mockResult);

      await testImpl({ suite: true }, "suite.yaml");

      expect(mockTestRunner.loadTestSuite).toHaveBeenCalledWith("suite.yaml");
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Test Suite Results:"));
    });

    it("applies suite settings from flags", async () => {
      const mockSuite: any = {
        metadata: { name: "test-suite" },
        settings: {},
      };
      const mockResult = {
        success: true,
        suite: mockSuite,
        summary: { total: 1, passed: 1, failed: 0, warnings: 0 },
        totalExecutionTime: 1000,
        results: [],
      };

      mockTestRunner.loadTestSuite.mockReturnValue(mockSuite);
      mockTestRunner.runTestSuite.mockResolvedValue(mockResult);

      await testImpl(
        {
          suite: true,
          parallel: true,
          "max-parallel": "5",
          "stop-on-failure": true,
          "generate-report": true,
          "report-format": "html",
        },
        "suite.yaml"
      );

      expect(mockSuite.settings.parallel).toBe(true);
      expect(mockSuite.settings.maxParallel).toBe(5);
      expect(mockSuite.settings.stopOnFailure).toBe(true);
      expect(mockSuite.settings.generateReport).toBe(true);
      expect(mockSuite.settings.reportFormat).toBe("html");
    });

    it("reports suite failures and exits", async () => {
      const mockSuite = {
        metadata: { name: "test-suite" },
        settings: {},
      };
      const mockResult = {
        success: false,
        suite: mockSuite,
        summary: { total: 3, passed: 2, failed: 1, warnings: 0 },
        totalExecutionTime: 5000,
        results: [
          { success: true, config: { metadata: { name: "test-1" } } },
          { success: true, config: { metadata: { name: "test-2" } } },
          { success: false, config: { metadata: { name: "test-3" } }, error: "Test failed" },
        ],
      };

      mockTestRunner.loadTestSuite.mockReturnValue(mockSuite);
      mockTestRunner.runTestSuite.mockResolvedValue(mockResult);

      await expect(testImpl({ suite: true }, "suite.yaml")).rejects.toThrow("process.exit(1)");

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Failed Tests:"));
      expect(processExitCalls).toContain(1);
    });
  });

  describe("buildExecutionOptions", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
      const mockConfig = { metadata: { name: "test-1" } };
      const mockResult = {
        success: true,
        config: mockConfig,
        executionTime: 1000,
        crawlerResult: { exitCode: 0 },
        warnings: [],
        validationResults: { files: [], logs: { valid: true, errors: [] } },
      };
      mockTestRunner.loadTestConfig.mockReturnValue(mockConfig);
      mockTestRunner.runTest.mockResolvedValue(mockResult);
    });

    it("builds execution options with default values", async () => {
      await testImpl({}, "test.yaml");

      const executionOptions = mockTestRunner.runTest.mock.calls[0][1];
      expect(executionOptions.verbose).toBe(false);
      expect(executionOptions.dryRun).toBe(false);
      expect(executionOptions.forceCleanup).toBe(false);
      expect(executionOptions.cliPath).toContain("bun");
    });

    it("builds execution options with custom flags", async () => {
      await testImpl(
        {
          verbose: true,
          "dry-run": true,
          "force-cleanup": true,
          "cli-path": "/custom/cli",
        },
        "test.yaml"
      );

      const executionOptions = mockTestRunner.runTest.mock.calls[0][1];
      expect(executionOptions.verbose).toBe(true);
      expect(executionOptions.dryRun).toBe(true);
      expect(executionOptions.forceCleanup).toBe(true);
      expect(executionOptions.cliPath).toBe("/custom/cli");
    });
  });

  describe("error handling", () => {
    it("catches and logs errors during execution", async () => {
      mockExistsSync.mockReturnValue(true);
      mockTestRunner.loadTestConfig.mockImplementation(() => {
        throw new Error("Failed to load config");
      });

      await expect(testImpl({}, "test.yaml")).rejects.toThrow("process.exit(1)");

      expect(mockLogger.error).toHaveBeenCalledWith("Test execution failed", expect.any(Object));
      expect(processExitCalls).toContain(1);
    });
  });
});
