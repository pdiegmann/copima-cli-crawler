/**
 * End-to-end test runner for GitLab crawler.
 * Executes tests with configuration validation, log monitoring, and comprehensive validation.
 */

import { spawn, type ChildProcess } from "child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import * as yaml from "js-yaml";
import { dirname, join } from "path";
import { createLogger } from "../logging/index.js";
import { validateTestConfig, validateTestSuite } from "./configValidator.js";
import type {
  CleanupResults,
  CrawlerExecutionResult,
  DataQualityValidationResult,
  FileValidationResult,
  LogValidationResult,
  PerformanceValidationResult,
  TestConfig,
  TestResult,
  TestSuite,
  TestSuiteResult,
  ValidationResults,
} from "./types.js";

/**
 * Test execution options.
 */
export type TestExecutionOptions = {
  /** Verbose logging */
  verbose?: boolean;
  /** Dry run mode (validate only) */
  dryRun?: boolean;
  /** Force cleanup even on success */
  forceCleanup?: boolean;
  /** Custom CLI path */
  cliPath?: string;
  /** Environment variables to pass */
  env?: Record<string, string>;
};

/**
 * Main test runner class for end-to-end testing.
 */
export class TestRunner {
  private logger = createLogger("TestRunner");
  private activeProcesses: ChildProcess[] = [];

  /**
   * Runs a single test configuration.
   */
  public async runTest(config: TestConfig, options: TestExecutionOptions = {}): Promise<TestResult> {
    const startTime = Date.now();

    this.logger.info(`Starting test: ${config.metadata.name}`);

    try {
      // Validate configuration
      const validationResult = validateTestConfig(config);
      if (!validationResult.valid) {
        throw new Error(`Invalid test configuration: ${validationResult.errors.join(", ")}`);
      }

      // Setup test environment
      await this.setupTestEnvironment(config, options);

      let crawlerResult: CrawlerExecutionResult;
      let validationResults: ValidationResults;

      if (options.dryRun) {
        // Dry run - just validate configuration
        crawlerResult = {
          exitCode: 0,
          stdout: "Dry run - no execution",
          stderr: "",
          executionTime: 0,
          generatedFiles: [],
        };
        validationResults = this.createEmptyValidationResults();
      } else {
        // Execute crawler
        crawlerResult = await this.executeCrawler(config, options);

        // Validate results
        validationResults = await this.validateResults(config, crawlerResult);
      }

      // Cleanup
      const cleanupResults = await this.cleanup(
        config,
        validationResults.files.every((f) => f.valid)
      );

      const executionTime = Date.now() - startTime;
      const success = crawlerResult.exitCode === 0 && this.isValidationSuccessful(validationResults);

      this.logger.info(`Test completed: ${config.metadata.name} - ${success ? "PASSED" : "FAILED"}`);

      return {
        config,
        success,
        executionTime,
        crawlerResult,
        validationResults,
        warnings: this.collectWarnings(validationResults),
        cleanupResults,
        error: success ? undefined : this.getFirstError(crawlerResult, validationResults),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Test failed: ${config.metadata.name}`, { error });

      return {
        config,
        success: false,
        executionTime,
        crawlerResult: {
          exitCode: 1,
          stdout: "",
          stderr: error instanceof Error ? error.message : String(error),
          executionTime: 0,
          generatedFiles: [],
        },
        validationResults: this.createEmptyValidationResults(),
        warnings: [],
        cleanupResults: { success: false, outputDirCleaned: false, databaseCleaned: false, logsCleaned: false, errors: [String(error)] },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Runs a test suite with multiple configurations.
   */
  public async runTestSuite(suite: TestSuite, options: TestExecutionOptions = {}): Promise<TestSuiteResult> {
    const startTime = Date.now();

    this.logger.info(`Starting test suite: ${suite.metadata.name}`);

    // Validate suite configuration
    const validationResult = validateTestSuite(suite);
    if (!validationResult.valid) {
      throw new Error(`Invalid test suite configuration: ${validationResult.errors.join(", ")}`);
    }

    const results: TestResult[] = [];
    let shouldStop = false;

    if (suite.settings.parallel && !options.dryRun) {
      // Run tests in parallel
      const maxParallel = suite.settings.maxParallel || 3;
      const chunks = this.chunkArray(suite.tests, maxParallel);

      for (const chunk of chunks) {
        if (shouldStop) break;

        const chunkPromises = chunk.map((test) => this.runTest(test, options));
        const chunkResults = await Promise.all(chunkPromises);

        results.push(...chunkResults);

        // Check if we should stop on failure
        if (suite.settings.stopOnFailure && chunkResults.some((r) => !r.success)) {
          shouldStop = true;
        }
      }
    } else {
      // Run tests sequentially
      for (const test of suite.tests) {
        if (shouldStop) break;

        const result = await this.runTest(test, options);
        results.push(result);

        if (suite.settings.stopOnFailure && !result.success) {
          shouldStop = true;
        }
      }
    }

    const totalExecutionTime = Date.now() - startTime;
    const summary = {
      total: results.length,
      passed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      warnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
      errors: results.filter((r) => r.error).length,
    };

    const suiteResult: TestSuiteResult = {
      suite,
      results,
      totalExecutionTime,
      success: summary.failed === 0,
      summary,
    };

    // Generate report if requested
    if (suite.settings.generateReport) {
      await this.generateReport(suiteResult, suite.settings.reportFormat || "json");
    }

    this.logger.info(`Test suite completed: ${suite.metadata.name} - ${suiteResult.success ? "PASSED" : "FAILED"}`);
    this.logger.info(`Results: ${summary.passed}/${summary.total} passed, ${summary.failed} failed, ${summary.warnings} warnings`);

    return suiteResult;
  }

  /**
   * Loads test configuration from YAML file.
   */
  public loadTestConfig(filePath: string): TestConfig {
    try {
      const content = readFileSync(filePath, "utf8");
      const config = yaml.load(content) as TestConfig;

      const validationResult = validateTestConfig(config);
      if (!validationResult.valid) {
        throw new Error(`Invalid configuration in ${filePath}: ${validationResult.errors.join(", ")}`);
      }

      return config;
    } catch (error) {
      this.logger.error(`Failed to load test configuration from ${filePath}`, { error });
      throw error;
    }
  }

  /**
   * Loads test suite from YAML file.
   */
  public loadTestSuite(filePath: string): TestSuite {
    try {
      const content = readFileSync(filePath, "utf8");
      const suite = yaml.load(content) as TestSuite;

      const validationResult = validateTestSuite(suite);
      if (!validationResult.valid) {
        throw new Error(`Invalid suite configuration in ${filePath}: ${validationResult.errors.join(", ")}`);
      }

      return suite;
    } catch (error) {
      this.logger.error(`Failed to load test suite from ${filePath}`, { error });
      throw error;
    }
  }

  /**
   * Sets up test environment.
   */
  private async setupTestEnvironment(config: TestConfig, _options: TestExecutionOptions): Promise<void> {
    const { execution } = config;

    // Create directories
    if (!existsSync(execution.workingDir)) {
      mkdirSync(execution.workingDir, { recursive: true });
    }
    if (!existsSync(execution.outputDir)) {
      mkdirSync(execution.outputDir, { recursive: true });
    }

    // Ensure database directory exists
    const dbDir = dirname(execution.databasePath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    this.logger.debug("Test environment setup completed", {
      workingDir: execution.workingDir,
      outputDir: execution.outputDir,
      databasePath: execution.databasePath,
    });
  }

  /**
   * Executes the crawler with given configuration.
   */
  private async executeCrawler(config: TestConfig, options: TestExecutionOptions): Promise<CrawlerExecutionResult> {
    const startTime = Date.now();
    const cliPath = options.cliPath || "bun run src/bin/cli.ts";

    // Build command arguments
    const args = await this.buildCrawlerArgs(config);

    // Setup environment variables
    const testEnv = await this.buildEnvironmentVariables(config);
    const env = {
      ...process.env,
      ...options.env,
      ...testEnv,
    };

    this.logger.debug("Executing crawler", { cliPath, args, workingDir: config.execution.workingDir });

    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      const generatedFiles: string[] = [];

      const child = spawn("bash", ["-c", `${cliPath} ${args.join(" ")}`], {
        cwd: config.execution.workingDir,
        env,
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.activeProcesses.push(child);

      child.stdout?.on("data", (data) => {
        const chunk = data.toString();
        stdout += chunk;
        if (options.verbose) {
          this.logger.info(`[CRAWLER STDOUT] ${chunk.trim()}`);
        }
      });

      child.stderr?.on("data", (data) => {
        const chunk = data.toString();
        stderr += chunk;
        if (options.verbose) {
          this.logger.warn(`[CRAWLER STDERR] ${chunk.trim()}`);
        }
      });

      child.on("close", (code) => {
        const executionTime = Date.now() - startTime;
        this.activeProcesses = this.activeProcesses.filter((p) => p !== child);

        // Collect generated files
        try {
          this.collectGeneratedFiles(config.execution.outputDir, generatedFiles);
        } catch (error) {
          this.logger.warn("Failed to collect generated files", { error });
        }

        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
          executionTime,
          generatedFiles,
        });
      });

      // Handle timeout
      if (config.metadata.timeout) {
        setTimeout(() => {
          if (!child.killed) {
            child.kill("SIGTERM");
            setTimeout(() => {
              if (!child.killed) {
                child.kill("SIGKILL");
              }
            }, 5000);
          }
        }, config.metadata.timeout);
      }
    });
  }

  /**
   * Validates test results against expectations.
   */
  private async validateResults(config: TestConfig, crawlerResult: CrawlerExecutionResult): Promise<ValidationResults> {
    const { validation } = config;

    // Validate files
    const files = await Promise.all(validation.expectedFiles.map((expectedFile) => this.validateFile(expectedFile, config.execution.outputDir)));

    // Validate logs
    const logs = this.validateLogs(validation.logs, crawlerResult.stdout, crawlerResult.stderr);

    // Validate performance
    const performance = this.validatePerformance(validation.performance, crawlerResult);

    // Validate data quality
    const dataQuality = await this.validateDataQuality(validation.dataQuality, crawlerResult.generatedFiles, config.execution.outputDir);

    return {
      files,
      logs,
      performance,
      dataQuality,
    };
  }

  /**
   * Validates a single expected file.
   */
  private async validateFile(expectedFile: any, outputDir: string): Promise<FileValidationResult> {
    const filePath = join(outputDir, expectedFile.path);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if file exists
    if (!existsSync(filePath)) {
      errors.push(`File does not exist: ${expectedFile.path}`);
      return {
        path: expectedFile.path,
        exists: false,
        valid: false,
        errors,
        warnings,
      };
    }

    let recordCount = 0;

    try {
      // Count records based on format
      if (expectedFile.format === "jsonl") {
        const content = readFileSync(filePath, "utf8");
        recordCount = content
          .trim()
          .split("\n")
          .filter((line) => line.trim()).length;
      } else if (expectedFile.format === "json") {
        const content = readFileSync(filePath, "utf8");
        const data = JSON.parse(content);
        recordCount = Array.isArray(data) ? data.length : 1;
      }

      // Validate record count
      if (expectedFile.minRecords !== undefined && recordCount < expectedFile.minRecords) {
        errors.push(`Too few records: ${recordCount} < ${expectedFile.minRecords}`);
      }
      if (expectedFile.maxRecords !== undefined && recordCount > expectedFile.maxRecords) {
        errors.push(`Too many records: ${recordCount} > ${expectedFile.maxRecords}`);
      }

      // Validate required fields (for JSONL)
      if (expectedFile.requiredFields && expectedFile.format === "jsonl") {
        const content = readFileSync(filePath, "utf8");
        const lines = content
          .trim()
          .split("\n")
          .filter((line) => line.trim());

        for (let i = 0; i < Math.min(lines.length, 10); i++) {
          // Check first 10 records
          try {
            const record = JSON.parse(lines[i]);
            for (const field of expectedFile.requiredFields) {
              if (!(field in record)) {
                errors.push(`Missing required field '${field}' in record ${i + 1}`);
                break;
              }
            }
          } catch {
            errors.push(`Invalid JSON in line ${i + 1}`);
          }
        }
      }
    } catch (error) {
      errors.push(`Failed to validate file: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      path: expectedFile.path,
      exists: true,
      recordCount,
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates logs against expectations.
   */
  private validateLogs(logConfig: any, stdout: string, stderr: string): LogValidationResult {
    const errors: string[] = [];
    const foundLevels: string[] = [];
    const matchedMessages: string[] = [];
    const forbiddenMatches: string[] = [];

    const allOutput = stdout + stderr;

    // Extract log levels from output
    const logLevelRegex = /\[(error|warn|info|debug)\]/gi;
    const levelMatches = allOutput.match(logLevelRegex) || [];
    levelMatches.forEach((match) => {
      const level = match.replace(/[\[\]]/g, "").toLowerCase();
      if (!foundLevels.includes(level)) {
        foundLevels.push(level);
      }
    });

    // Check required messages
    for (const pattern of logConfig.requiredMessages) {
      const regex = new RegExp(pattern, "i");
      if (regex.test(allOutput)) {
        matchedMessages.push(pattern);
      } else {
        errors.push(`Required log message not found: ${pattern}`);
      }
    }

    // Check forbidden messages
    if (logConfig.forbiddenMessages) {
      for (const pattern of logConfig.forbiddenMessages) {
        const regex = new RegExp(pattern, "i");
        if (regex.test(allOutput)) {
          forbiddenMatches.push(pattern);
          errors.push(`Forbidden log message found: ${pattern}`);
        }
      }
    }

    // Count errors and warnings
    const errorCount = (allOutput.match(/\[error\]/gi) || []).length;
    const warningCount = (allOutput.match(/\[warn\]/gi) || []).length;

    // Validate counts
    if (logConfig.maxErrors !== undefined && errorCount > logConfig.maxErrors) {
      errors.push(`Too many errors: ${errorCount} > ${logConfig.maxErrors}`);
    }
    if (logConfig.maxWarnings !== undefined && warningCount > logConfig.maxWarnings) {
      errors.push(`Too many warnings: ${warningCount} > ${logConfig.maxWarnings}`);
    }

    return {
      valid: errors.length === 0,
      foundLevels,
      matchedMessages,
      forbiddenMatches,
      errorCount,
      warningCount,
      errors,
    };
  }

  /**
   * Validates performance metrics.
   */
  private validatePerformance(perfConfig: any, crawlerResult: CrawlerExecutionResult): PerformanceValidationResult {
    const errors: string[] = [];

    // Validate execution time
    if (perfConfig.maxExecutionTime && crawlerResult.executionTime > perfConfig.maxExecutionTime) {
      errors.push(`Execution time exceeded: ${crawlerResult.executionTime}ms > ${perfConfig.maxExecutionTime}ms`);
    }

    // Note: Memory usage and other metrics would require more sophisticated monitoring
    // For now, we'll just validate what we have

    return {
      valid: errors.length === 0,
      executionTime: crawlerResult.executionTime,
      errors,
    };
  }

  /**
   * Validates data quality.
   */
  private async validateDataQuality(qualityConfig: any, generatedFiles: string[], outputDir: string): Promise<DataQualityValidationResult> {
    const errors: string[] = [];
    const duplicates: { file: string; count: number }[] = [];
    const requiredFields: { file: string; missing: string[] }[] = [];

    let jsonStructure = true;

    // Validate JSON structure for JSONL files
    if (qualityConfig.validateJsonStructure) {
      for (const file of generatedFiles) {
        if (file.endsWith(".jsonl")) {
          const filePath = join(outputDir, file);
          try {
            if (existsSync(filePath)) {
              const content = readFileSync(filePath, "utf8");
              const lines = content
                .trim()
                .split("\n")
                .filter((line) => line.trim());

              for (let i = 0; i < lines.length; i++) {
                try {
                  JSON.parse(lines[i]);
                } catch {
                  jsonStructure = false;
                  errors.push(`Invalid JSON structure in ${file} at line ${i + 1}`);
                  break;
                }
              }
            }
          } catch (error) {
            jsonStructure = false;
            errors.push(`Failed to validate JSON structure in ${file}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      jsonStructure,
      duplicates,
      requiredFields,
      customValidators: [],
      errors,
    };
  }

  /**
   * Cleanup test artifacts.
   */
  private async cleanup(config: TestConfig, testPassed: boolean): Promise<CleanupResults> {
    const { cleanup } = config;
    const errors: string[] = [];
    let outputDirCleaned = false;
    let databaseCleaned = false;
    let logsCleaned = false;

    // Skip cleanup if test failed and keepOnFailure is true
    if (!testPassed && cleanup.keepOnFailure) {
      return {
        success: true,
        outputDirCleaned: false,
        databaseCleaned: false,
        logsCleaned: false,
        errors: [],
      };
    }

    try {
      // Clean output directory
      if (cleanup.cleanOutputDir && existsSync(config.execution.outputDir)) {
        rmSync(config.execution.outputDir, { recursive: true, force: true });
        outputDirCleaned = true;
      }

      // Clean database
      if (cleanup.cleanDatabase && existsSync(config.execution.databasePath)) {
        rmSync(config.execution.databasePath, { force: true });
        databaseCleaned = true;
      }

      // Clean logs would go here if we had specific log file paths
      logsCleaned = true;
    } catch (error) {
      errors.push(`Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      success: errors.length === 0,
      outputDirCleaned,
      databaseCleaned,
      logsCleaned,
      errors,
    };
  }

  /**
   * Builds crawler command arguments from test configuration.
   */
  private async buildCrawlerArgs(config: TestConfig): Promise<string[]> {
    const steps = config.execution.steps || ["areas", "users"];

    // Execute all configured steps sequentially
    const allSteps = steps.length > 0 ? steps : ["areas"];
    const args: string[] = [];

    // For multiple steps, use the crawl command with steps parameter
    if (allSteps.length > 1) {
      args.push("crawl");
      args.push("--steps", allSteps.join(","));
    } else {
      // For single step, use the step command directly
      args.push(allSteps[0]);
    }

    // Add authentication arguments
    args.push("--host", config.gitlab.host);

    // Get access token from database or config and resolve account ID
    let accessToken = config.gitlab.accessToken;
    let resolvedAccountId = config.gitlab.accountId;

    // Try to retrieve access token from database first
    if (!accessToken) {
      try {
        const { initDatabase } = await import("../db/connection.js");
        const { TokenManager } = await import("../auth/tokenManager.js");
        const { eq, desc } = await import("drizzle-orm");
        const { account } = await import("../db/schema.js");

        const db = initDatabase({ path: "./database.sqlite", wal: true });
        const tokenManager = new TokenManager(db);

        let storedToken = null;

        // Check if we have account ID or email specified in config
        if (config.gitlab.accountId) {
          storedToken = await tokenManager.getAccessToken(config.gitlab.accountId);
          if (storedToken) {
            console.log(`Test runner: Using access token for account ID: ${config.gitlab.accountId}`);
            resolvedAccountId = config.gitlab.accountId;
          }
        } else if (config.gitlab.email) {
          // Look up account by email - need to join user and account tables
          const { user } = await import("../db/schema.js");

          const [userRecord] = await db
            .select({
              accountId: account.accountId,
              userId: user.id,
              email: user.email,
            })
            .from(user)
            .innerJoin(account, eq(account.userId, user.id))
            .where(eq(user.email, config.gitlab.email))
            .orderBy(desc(account.createdAt))
            .limit(1);

          if (userRecord) {
            storedToken = await tokenManager.getAccessToken(userRecord.accountId);
            if (storedToken) {
              console.log(`Test runner: Using access token for email: ${config.gitlab.email} (account: ${userRecord.accountId})`);
              resolvedAccountId = userRecord.accountId; // Store the resolved account ID
            }
          } else {
            console.warn(`Test runner: No account found for email: ${config.gitlab.email}`);
          }
        } else {
          // Fallback to default account
          storedToken = await tokenManager.getAccessToken("default");
          if (storedToken) {
            console.log("Test runner: Using access token for default account");
            resolvedAccountId = "default";
          }
        }

        if (storedToken) {
          accessToken = storedToken;
        }
      } catch (error) {
        console.warn("Test runner: Failed to retrieve stored token:", error);
      }
    }

    // Add account ID (resolved or from config)
    if (resolvedAccountId) {
      args.push("--account-id", resolvedAccountId);
    }

    // Add access token if available (only if we have a valid non-empty token)
    if (accessToken && accessToken.trim()) {
      args.push("--access-token", accessToken);
    }

    // Add optional arguments
    if (config.gitlab.refreshToken) {
      args.push("--refresh-token", config.gitlab.refreshToken);
    }

    // Set output directory
    args.push("--output", config.execution.outputDir);

    // Set database path to match test configuration
    args.push("--database", config.execution.databasePath);

    return args;
  }

  /**
   * Builds environment variables from configuration.
   */
  private async buildEnvironmentVariables(config: TestConfig): Promise<Record<string, string>> {
    const env: Record<string, string> = {
      NODE_ENV: "test",
      LOG_LEVEL: "info",
    };

    // Disable TLS certificate validation for test environments
    env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

    // Add GitLab configuration
    if (config.gitlab) {
      if (config.gitlab.host) {
        env["GITLAB_HOST"] = config.gitlab.host;
      }

      // Try to get access token from database first, fallback to config
      let accessToken = config.gitlab.accessToken;

      try {
        const { initDatabase } = await import("../db/connection.js");
        const { TokenManager } = await import("../auth/tokenManager.js");
        const { eq, desc } = await import("drizzle-orm");
        const { account } = await import("../db/schema.js");

        try {
          const db = initDatabase({ path: "./database.sqlite", wal: true });
          const tokenManager = new TokenManager(db);

          let storedToken = null;

          // Check if we have account ID or email specified in config
          if (config.gitlab.accountId) {
            storedToken = await tokenManager.getAccessToken(config.gitlab.accountId);
            if (storedToken) {
              console.log(`Test runner: Using access token for account ID: ${config.gitlab.accountId}`);
            }
          } else if (config.gitlab.email) {
            // Look up account by email - need to join user and account tables
            const { user } = await import("../db/schema.js");

            const [userRecord] = await db
              .select({
                accountId: account.accountId,
                userId: user.id,
                email: user.email,
              })
              .from(user)
              .innerJoin(account, eq(account.userId, user.id))
              .where(eq(user.email, config.gitlab.email))
              .orderBy(desc(account.createdAt))
              .limit(1);

            if (userRecord) {
              storedToken = await tokenManager.getAccessToken(userRecord.accountId);
              if (storedToken) {
                console.log(`Test runner: Using access token for email: ${config.gitlab.email} (account: ${userRecord.accountId})`);
              }
            } else {
              console.warn(`Test runner: No account found for email: ${config.gitlab.email}`);
            }
          } else {
            // Fallback to default account
            storedToken = await tokenManager.getAccessToken("default");
            if (storedToken) {
              console.log("Test runner: Using access token for default account");
            }
          }

          if (storedToken) {
            accessToken = storedToken;
          } else if (!accessToken) {
            console.warn("Test runner: No stored access token found and none in config. Please run 'copima auth' first.");
          }
        } catch {
          console.warn("Test runner: Database not available, using config token");
        }
      } catch (error) {
        console.warn("Test runner: Failed to retrieve stored token, using config token:", error);
      }

      if (accessToken) {
        env["GITLAB_ACCESS_TOKEN"] = accessToken;
        // Set global token for test mode
        (global as any).testAccessToken = accessToken;
      }
    }

    return env;
  }

  /**
   * Collects generated files from output directory.
   */
  private collectGeneratedFiles(outputDir: string, files: string[], relativePath = ""): void {
    if (!existsSync(outputDir)) return;

    const entries = readdirSync(outputDir);

    for (const entry of entries) {
      const fullPath = join(outputDir, entry);
      const relativFilePath = relativePath ? join(relativePath, entry) : entry;

      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        this.collectGeneratedFiles(fullPath, files, relativFilePath);
      } else {
        files.push(relativFilePath);
      }
    }
  }

  /**
   * Generates test report in specified format.
   */
  private async generateReport(result: TestSuiteResult, format: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `test-report-${timestamp}.${format}`;

    let content: string;

    switch (format) {
      case "json":
        content = JSON.stringify(result, null, 2);
        break;
      case "yaml":
        content = yaml.dump(result);
        break;
      case "html":
        content = this.generateHTMLReport(result);
        break;
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }

    writeFileSync(fileName, content, "utf8");
    this.logger.info(`Test report generated: ${fileName}`);
  }

  /**
   * Generates HTML test report.
   */
  private generateHTMLReport(result: TestSuiteResult): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Report - ${result.suite.metadata.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .stat { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .passed { background: #d4edda; color: #155724; }
        .failed { background: #f8d7da; color: #721c24; }
        .test { margin: 10px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .test.passed { border-left: 5px solid #28a745; }
        .test.failed { border-left: 5px solid #dc3545; }
        .details { margin-top: 10px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Test Report: ${result.suite.metadata.name}</h1>
        <p>${result.suite.metadata.description}</p>
        <p><strong>Version:</strong> ${result.suite.metadata.version}</p>
        <p><strong>Execution Time:</strong> ${result.totalExecutionTime}ms</p>
        <p><strong>Status:</strong> <span class="${result.success ? "passed" : "failed"}">${result.success ? "PASSED" : "FAILED"}</span></p>
    </div>

    <div class="summary">
        <div class="stat">
            <h3>${result.summary.total}</h3>
            <p>Total Tests</p>
        </div>
        <div class="stat passed">
            <h3>${result.summary.passed}</h3>
            <p>Passed</p>
        </div>
        <div class="stat failed">
            <h3>${result.summary.failed}</h3>
            <p>Failed</p>
        </div>
        <div class="stat">
            <h3>${result.summary.warnings}</h3>
            <p>Warnings</p>
        </div>
    </div>

    <h2>Test Results</h2>
    ${result.results
      .map(
        (test) => `
        <div class="test ${test.success ? "passed" : "failed"}">
            <h3>${test.config.metadata.name} - ${test.success ? "PASSED" : "FAILED"}</h3>
            <p>${test.config.metadata.description}</p>
            <div class="details">
                <p><strong>Execution Time:</strong> ${test.executionTime}ms</p>
                <p><strong>Exit Code:</strong> ${test.crawlerResult.exitCode}</p>
                ${test.error ? `<p><strong>Error:</strong> ${test.error}</p>` : ""}
                ${test.warnings.length > 0 ? `<p><strong>Warnings:</strong> ${test.warnings.join(", ")}</p>` : ""}
            </div>
        </div>
    `
      )
      .join("")}
</body>
</html>`;
  }

  /**
   * Utility functions.
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private createEmptyValidationResults(): ValidationResults {
    return {
      files: [],
      logs: {
        valid: true,
        foundLevels: [],
        matchedMessages: [],
        forbiddenMatches: [],
        errorCount: 0,
        warningCount: 0,
        errors: [],
      },
      performance: {
        valid: true,
        executionTime: 0,
        errors: [],
      },
      dataQuality: {
        valid: true,
        jsonStructure: true,
        duplicates: [],
        requiredFields: [],
        customValidators: [],
        errors: [],
      },
    };
  }

  private isValidationSuccessful(results: ValidationResults): boolean {
    return results.files.every((f) => f.valid) && results.logs.valid && results.performance.valid && results.dataQuality.valid;
  }

  private collectWarnings(results: ValidationResults): string[] {
    const warnings: string[] = [];
    results.files.forEach((f) => warnings.push(...f.warnings));
    return warnings;
  }

  private getFirstError(crawlerResult: CrawlerExecutionResult, results: ValidationResults): string | undefined {
    if (crawlerResult.exitCode !== 0 && crawlerResult.stderr) {
      return crawlerResult.stderr.split("\n")[0];
    }

    for (const file of results.files) {
      if (file.errors.length > 0) {
        return file.errors[0];
      }
    }

    if (results.logs.errors.length > 0) {
      return results.logs.errors[0];
    }

    if (results.performance.errors.length > 0) {
      return results.performance.errors[0];
    }

    if (results.dataQuality.errors.length > 0) {
      return results.dataQuality.errors[0];
    }

    return undefined;
  }

  /**
   * Cleanup active processes on exit.
   */
  public cleanupProcesses(): void {
    for (const process of this.activeProcesses) {
      if (!process.killed) {
        process.kill("SIGTERM");
      }
    }
    this.activeProcesses = [];
  }
}

/**
 * Creates a new test runner instance.
 */
export const createTestRunner = (): TestRunner => {
  return new TestRunner();
};
