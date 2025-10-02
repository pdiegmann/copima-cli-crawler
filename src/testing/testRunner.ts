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
  private accountContextCache = new Map<string, { accountId: string; accessToken: string }>();

  /**
   * Runs a single test configuration.
   */
  public async runTest(config: TestConfig, options: TestExecutionOptions = {}): Promise<TestResult> {
    const startTime = Date.now();

    this.logger.info(`Starting test: ${config.metadata.name}`);

    try {
      await this.validateAndSetupTest(config, options);

      const { crawlerResult, validationResults } = await this.executeTestSteps(config, options);
      const cleanupResults = await this.cleanup(
        config,
        validationResults.files.every((f) => f.valid)
      );

      return this.buildSuccessfulTestResult(config, startTime, crawlerResult, validationResults, cleanupResults);
    } catch (error) {
      return this.buildFailedTestResult(config, startTime, error);
    }
  }

  /**
   * Validates configuration and sets up test environment.
   */
  private async validateAndSetupTest(config: TestConfig, options: TestExecutionOptions): Promise<void> {
    const validationResult = validateTestConfig(config);
    if (!validationResult.valid) {
      throw new Error(`Invalid test configuration: ${validationResult.errors.join(", ")}`);
    }

    await this.setupTestEnvironment(config, options);
  }

  /**
   * Executes test steps (dry run or actual execution with validation).
   */
  private async executeTestSteps(
    config: TestConfig,
    options: TestExecutionOptions
  ): Promise<{
    crawlerResult: CrawlerExecutionResult;
    validationResults: ValidationResults;
  }> {
    if (options.dryRun) {
      return {
        crawlerResult: this.createDryRunResult(),
        validationResults: this.createEmptyValidationResults(),
      };
    }

    const crawlerResult = await this.executeCrawler(config, options);
    const validationResults = await this.validateResults(config, crawlerResult);

    return { crawlerResult, validationResults };
  }

  /**
   * Creates a dry run execution result.
   */
  private createDryRunResult(): CrawlerExecutionResult {
    return {
      exitCode: 0,
      stdout: "Dry run - no execution",
      stderr: "",
      executionTime: 0,
      generatedFiles: [],
    };
  }

  /**
   * Builds successful test result.
   */
  private buildSuccessfulTestResult(
    config: TestConfig,
    startTime: number,
    crawlerResult: CrawlerExecutionResult,
    validationResults: ValidationResults,
    cleanupResults: CleanupResults
  ): TestResult {
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
  }

  /**
   * Builds failed test result for exception cases.
   */
  private buildFailedTestResult(config: TestConfig, startTime: number, error: unknown): TestResult {
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
      cleanupResults: {
        success: false,
        outputDirCleaned: false,
        databaseCleaned: false,
        logsCleaned: false,
        errors: [String(error)],
      },
      error: error instanceof Error ? error.message : String(error),
    };
  }

  /**
   * Runs a test suite with multiple configurations.
   */
  public async runTestSuite(suite: TestSuite, options: TestExecutionOptions = {}): Promise<TestSuiteResult> {
    const startTime = Date.now();

    this.logger.info(`Starting test suite: ${suite.metadata.name}`);

    this.validateTestSuite(suite);
    const results = await this.executeTestSuite(suite, options);
    const suiteResult = this.buildTestSuiteResult(suite, results, startTime);

    await this.handleReportGeneration(suiteResult, suite.settings);
    this.logTestSuiteCompletion(suiteResult);

    return suiteResult;
  }

  /**
   * Validates test suite configuration.
   */
  private validateTestSuite(suite: TestSuite): void {
    const validationResult = validateTestSuite(suite);
    if (!validationResult.valid) {
      throw new Error(`Invalid test suite configuration: ${validationResult.errors.join(", ")}`);
    }
  }

  /**
   * Executes all tests in a test suite.
   */
  private async executeTestSuite(suite: TestSuite, options: TestExecutionOptions): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const shouldStop = false;

    if (suite.settings.parallel && !options.dryRun) {
      return await this.executeTestsInParallel(suite, options, results, shouldStop);
    } else {
      return await this.executeTestsSequentially(suite, options, results, shouldStop);
    }
  }

  /**
   * Executes tests in parallel chunks.
   */
  private async executeTestsInParallel(suite: TestSuite, options: TestExecutionOptions, results: TestResult[], shouldStop: boolean): Promise<TestResult[]> {
    const maxParallel = suite.settings.maxParallel || 3;
    const chunks = this.chunkArray(suite.tests, maxParallel);

    for (const chunk of chunks) {
      if (shouldStop) break;

      const chunkPromises = chunk.map((test) => this.runTest(test, options));
      const chunkResults = await Promise.all(chunkPromises);

      results.push(...chunkResults);

      if (suite.settings.stopOnFailure && chunkResults.some((r) => !r.success)) {
        shouldStop = true;
      }
    }

    return results;
  }

  /**
   * Executes tests sequentially.
   */
  private async executeTestsSequentially(suite: TestSuite, options: TestExecutionOptions, results: TestResult[], shouldStop: boolean): Promise<TestResult[]> {
    for (const test of suite.tests) {
      if (shouldStop) break;

      const result = await this.runTest(test, options);
      results.push(result);

      if (suite.settings.stopOnFailure && !result.success) {
        shouldStop = true;
      }
    }

    return results;
  }

  /**
   * Builds test suite result from individual test results.
   */
  private buildTestSuiteResult(suite: TestSuite, results: TestResult[], startTime: number): TestSuiteResult {
    const totalExecutionTime = Date.now() - startTime;
    const summary = {
      total: results.length,
      passed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      warnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
      errors: results.filter((r) => r.error).length,
    };

    return {
      suite,
      results,
      totalExecutionTime,
      success: summary.failed === 0,
      summary,
    };
  }

  /**
   * Handles report generation if requested.
   */
  private async handleReportGeneration(suiteResult: TestSuiteResult, settings: any): Promise<void> {
    if (settings.generateReport) {
      await this.generateReport(suiteResult, settings.reportFormat || "json");
    }
  }

  /**
   * Logs test suite completion summary.
   */
  private logTestSuiteCompletion(suiteResult: TestSuiteResult): void {
    this.logger.info(`Test suite completed: ${suiteResult.suite.metadata.name} - ${suiteResult.success ? "PASSED" : "FAILED"}`);
    this.logger.info(`Results: ${suiteResult.summary.passed}/${suiteResult.summary.total} passed, ${suiteResult.summary.failed} failed, ${suiteResult.summary.warnings} warnings`);
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

    const args = await this.buildCrawlerArgs(config);
    const env = await this.buildCrawlerEnvironment(config, options);

    this.logger.debug("Executing crawler", { cliPath, args, workingDir: config.execution.workingDir });

    return new Promise((resolve) => {
      const executionState = this.initializeExecutionState();
      const child = this.spawnCrawlerProcess(cliPath, args, config, env);

      this.setupProcessHandlers(child, options, executionState);
      this.setupProcessCompletion(child, config, startTime, executionState, resolve);
      this.setupProcessTimeout(child, config);
    });
  }

  /**
   * Builds crawler environment variables.
   */
  private async buildCrawlerEnvironment(config: TestConfig, options: TestExecutionOptions): Promise<Record<string, string>> {
    const testEnv = await this.buildEnvironmentVariables(config);
    const processEnv = Object.fromEntries(Object.entries(process.env).filter(([_, value]) => value !== undefined)) as Record<string, string>;

    return {
      ...processEnv,
      ...options.env,
      ...testEnv,
    };
  }

  /**
   * Initializes execution state tracking.
   */
  private initializeExecutionState(): { stdout: string; stderr: string; generatedFiles: string[] } {
    return {
      stdout: "",
      stderr: "",
      generatedFiles: [],
    };
  }

  /**
   * Spawns the crawler process.
   */
  private spawnCrawlerProcess(cliPath: string, args: string[], config: TestConfig, env: Record<string, string>): ChildProcess {
    /* eslint-disable sonarjs/no-os-command-from-path */
    const child = spawn("bash", ["-c", `${cliPath} ${args.join(" ")}`], {
      cwd: config.execution.workingDir,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    /* eslint-enable sonarjs/no-os-command-from-path */

    this.activeProcesses.push(child);
    return child;
  }

  /**
   * Sets up process output handlers.
   */
  private setupProcessHandlers(child: ChildProcess, options: TestExecutionOptions, executionState: { stdout: string; stderr: string; generatedFiles: string[] }): void {
    child.stdout?.on("data", (data) => {
      const chunk = data.toString();
      executionState.stdout += chunk;
      if (options.verbose) {
        this.logger.info(`[CRAWLER STDOUT] ${chunk.trim()}`);
      }
    });

    child.stderr?.on("data", (data) => {
      const chunk = data.toString();
      executionState.stderr += chunk;
      if (options.verbose) {
        this.logger.warn(`[CRAWLER STDERR] ${chunk.trim()}`);
      }
    });
  }

  /**
   * Sets up process completion handler.
   */
  private setupProcessCompletion(
    child: ChildProcess,
    config: TestConfig,
    startTime: number,
    executionState: { stdout: string; stderr: string; generatedFiles: string[] },
    resolve: (result: CrawlerExecutionResult) => void
  ): void {
    child.on("close", (code) => {
      const executionTime = Date.now() - startTime;
      this.activeProcesses = this.activeProcesses.filter((p) => p !== child);

      this.collectExecutionResults(config, executionState);

      resolve({
        exitCode: code || 0,
        stdout: executionState.stdout,
        stderr: executionState.stderr,
        executionTime,
        generatedFiles: executionState.generatedFiles,
      });
    });
  }

  /**
   * Collects execution results and generated files.
   */
  private collectExecutionResults(config: TestConfig, executionState: { generatedFiles: string[] }): void {
    try {
      this.collectGeneratedFiles(config.execution.outputDir, executionState.generatedFiles);
    } catch (error) {
      this.logger.warn("Failed to collect generated files", { error });
    }
  }

  /**
   * Sets up process timeout handling.
   */
  private setupProcessTimeout(child: ChildProcess, config: TestConfig): void {
    if (config.metadata.timeout) {
      setTimeout(() => {
        this.terminateProcess(child);
      }, config.metadata.timeout);
    }
  }

  /**
   * Terminates process gracefully with fallback to force kill.
   */
  private terminateProcess(child: ChildProcess): void {
    if (!child.killed) {
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGKILL");
        }
      }, 5000);
    }
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
      return this.createFileNotFoundResult(expectedFile.path, errors, warnings);
    }

    const recordCount = this.countRecords(filePath, expectedFile.format, errors);
    this.validateRecordCount(expectedFile, recordCount, errors);

    // Validate required fields (for JSONL)
    if (expectedFile.requiredFields && expectedFile.format === "jsonl") {
      this.validateRequiredFields(filePath, expectedFile.requiredFields, errors);
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
   * Creates result for non-existent file.
   */
  private createFileNotFoundResult(path: string, errors: string[], warnings: string[]): FileValidationResult {
    errors.push(`File does not exist: ${path}`);
    return {
      path,
      exists: false,
      valid: false,
      errors,
      warnings,
    };
  }

  /**
   * Counts records in a file based on format.
   */
  private countRecords(filePath: string, format: string, errors: string[]): number {
    try {
      if (format === "jsonl") {
        const content = readFileSync(filePath, "utf8");
        return content
          .trim()
          .split("\n")
          .filter((line) => line.trim()).length;
      } else if (format === "json") {
        const content = readFileSync(filePath, "utf8");
        const data = JSON.parse(content);
        return Array.isArray(data) ? data.length : 1;
      }
      return 0;
    } catch (error) {
      errors.push(`Failed to count records: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  /**
   * Validates record count against expected values.
   */
  private validateRecordCount(expectedFile: any, recordCount: number, errors: string[]): void {
    if (expectedFile.minRecords !== undefined && recordCount < expectedFile.minRecords) {
      errors.push(`Too few records: ${recordCount} < ${expectedFile.minRecords}`);
    }
    if (expectedFile.maxRecords !== undefined && recordCount > expectedFile.maxRecords) {
      errors.push(`Too many records: ${recordCount} > ${expectedFile.maxRecords}`);
    }
  }

  /**
   * Validates required fields in JSONL file.
   */
  private validateRequiredFields(filePath: string, requiredFields: string[], errors: string[]): void {
    try {
      const content = readFileSync(filePath, "utf8");
      const lines = content
        .trim()
        .split("\n")
        .filter((line) => line.trim());

      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        // Check first 10 records
        try {
          const line = lines[i];
          if (!line) continue;
          const record = JSON.parse(line);
          for (const field of requiredFields) {
            if (!(field in record)) {
              errors.push(`Missing required field '${field}' in record ${i + 1}`);
              break;
            }
          }
        } catch {
          errors.push(`Invalid JSON in line ${i + 1}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to validate required fields: ${error instanceof Error ? error.message : String(error)}`);
    }
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
      const level = match.replace(/[[\]]/g, "").toLowerCase();
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

    const jsonStructure = this.validateJsonStructureForFiles(qualityConfig, generatedFiles, outputDir, errors);

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
   * Validates JSON structure for all generated files.
   */
  private validateJsonStructureForFiles(qualityConfig: any, generatedFiles: string[], outputDir: string, errors: string[]): boolean {
    if (!qualityConfig.validateJsonStructure) {
      return true;
    }

    let allValid = true;
    for (const file of generatedFiles) {
      if (file.endsWith(".jsonl")) {
        const isValid = this.validateSingleJsonlFile(file, outputDir, errors);
        if (!isValid) {
          allValid = false;
        }
      }
    }

    return allValid;
  }

  /**
   * Validates JSON structure for a single JSONL file.
   */
  private validateSingleJsonlFile(file: string, outputDir: string, errors: string[]): boolean {
    const filePath = join(outputDir, file);

    if (!existsSync(filePath)) {
      return true; // Skip non-existent files
    }

    try {
      const content = readFileSync(filePath, "utf8");
      return this.validateJsonLinesContent(file, content, errors);
    } catch (error) {
      errors.push(`Failed to validate JSON structure in ${file}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Validates JSON content line by line.
   */
  private validateJsonLinesContent(fileName: string, content: string, errors: string[]): boolean {
    const lines = content
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    for (let i = 0; i < lines.length; i++) {
      try {
        const line = lines[i];
        if (!line) continue;
        JSON.parse(line);
      } catch {
        errors.push(`Invalid JSON structure in ${fileName} at line ${i + 1}`);
        return false;
      }
    }

    return true;
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
    const args = this.buildStepArgs(config.execution.steps);
    this.addHostArgument(args, config.gitlab.host);

    const accountId = await this.resolveAccountId(config.gitlab);
    this.addCredentialArgs(args, accountId);
    this.addOutputArgs(args, config.execution.outputDir, config.execution.databasePath);

    return args;
  }

  /**
   * Builds step arguments for crawler command.
   */
  private buildStepArgs(steps?: string[]): string[] {
    const allSteps: string[] = steps && steps.length > 0 ? steps : ["areas"];
    const args: string[] = [];

    if (allSteps.length > 1) {
      args.push("crawl", "--steps", allSteps.join(","));
    } else {
      const firstStep = allSteps[0];
      if (firstStep) {
        args.push(firstStep);
      }
    }

    return args;
  }

  /**
   * Adds host argument if provided.
   */
  private addHostArgument(args: string[], host?: string): void {
    if (host && host.trim()) {
      args.push("--host", host);
    }
  }

  /**
   * Resolves OAuth2 account identifier from stored credentials.
   */
  private async resolveAccountId(gitlabConfig: any): Promise<string> {
    const accountContext = await this.resolveAccountContext(gitlabConfig);

    if (!accountContext) {
      throw new Error("No OAuth2 credentials found for the provided configuration. Run 'copima auth' to authenticate.");
    }

    return accountContext.accountId;
  }

  /**
   * Adds credential arguments to command.
   */
  private addCredentialArgs(args: string[], accountId: string): void {
    args.push("--account-id", accountId);
  }

  /**
   * Adds output arguments to command.
   */
  private addOutputArgs(args: string[], outputDir: string, databasePath: string): void {
    args.push("--output", outputDir);
    args.push("--database", databasePath);
  }

  /**
   * Builds environment variables from configuration.
   */
  private async buildEnvironmentVariables(config: TestConfig): Promise<Record<string, string>> {
    const env = this.createBaseEnvironment();
    await this.addGitlabEnvironmentVariables(env, config);
    return env;
  }

  /**
   * Creates base environment variables for testing.
   */
  private createBaseEnvironment(): Record<string, string> {
    return {
      NODE_ENV: "test",
      LOG_LEVEL: "info",
      NODE_TLS_REJECT_UNAUTHORIZED: "0", // Disable TLS certificate validation for test environments
    };
  }

  /**
   * Adds GitLab-related environment variables.
   */
  private async addGitlabEnvironmentVariables(env: Record<string, string>, config: TestConfig): Promise<void> {
    if (!config.gitlab) return;

    this.addGitlabHostToEnvironment(env, config.gitlab);
    const accountContext = await this.resolveAccountContext(config.gitlab);

    if (accountContext) {
      env["GITLAB_ACCOUNT_ID"] = accountContext.accountId;
      this.addGitlabTokenToEnvironment(env, accountContext.accessToken);
    }
  }

  /**
   * Adds GitLab host to environment variables.
   */
  private addGitlabHostToEnvironment(env: Record<string, string>, gitlabConfig: any): void {
    if (gitlabConfig.host) {
      env["GITLAB_HOST"] = gitlabConfig.host;
    }
  }

  private async resolveAccountContext(gitlabConfig: any): Promise<{ accountId: string; accessToken: string } | null> {
    const cacheKey = this.getAccountContextCacheKey(gitlabConfig);
    const cachedContext = cacheKey ? this.accountContextCache.get(cacheKey) : undefined;
    if (cachedContext) {
      return cachedContext;
    }

    try {
      const { initDatabase } = await import("../db/connection.js");
      const { TokenManager } = await import("../auth/tokenManager.js");
      const { account, user } = await import("../db/schema.js");
      const { eq, desc } = await import("drizzle-orm");

      const db = initDatabase({ path: "./database.sqlite", wal: true });
      const tokenManager = new TokenManager(db);

      let accountRecord: { accountId: string; refreshToken: string | null } | undefined;

      if (gitlabConfig.accountId) {
        const rows = await db
          .select({ accountId: account.accountId, refreshToken: account.refreshToken })
          .from(account)
          .where(eq(account.accountId, gitlabConfig.accountId))
          .limit(1);
        accountRecord = rows[0];
      } else if (gitlabConfig.email) {
        const rows = await db
          .select({ accountId: account.accountId, refreshToken: account.refreshToken, createdAt: account.createdAt })
          .from(user)
          .innerJoin(account, eq(account.userId, user.id))
          .where(eq(user.email, gitlabConfig.email))
          .orderBy(desc(account.createdAt))
          .limit(1);
        accountRecord = rows[0];
      } else {
        const rows = await db.select({ accountId: account.accountId, refreshToken: account.refreshToken }).from(account).where(eq(account.accountId, "default")).limit(1);
        accountRecord = rows[0];
      }

      if (!accountRecord) {
        console.warn("Test runner: No stored OAuth2 account found matching configuration");
        return null;
      }

      if (!accountRecord.refreshToken) {
        console.warn("Test runner: Stored account is missing a refresh token and cannot be used for OAuth2-authenticated tests");
        return null;
      }

      const accessToken = await tokenManager.getAccessToken(accountRecord.accountId);
      if (!accessToken) {
        console.warn(`Test runner: No valid access token available for account: ${accountRecord.accountId}`);
        return null;
      }

      if (accessToken.startsWith("test_") || accessToken.startsWith("mock_")) {
        console.warn(`Test runner: Ignoring mock access token for account: ${accountRecord.accountId}`);
        return null;
      }

      const context = { accountId: accountRecord.accountId, accessToken };
      if (cacheKey) {
        this.accountContextCache.set(cacheKey, context);
      }

      console.log(`Test runner: Using OAuth2 account ${context.accountId}`);
      return context;
    } catch (error) {
      console.warn("Test runner: Failed to resolve OAuth2 account context", error);
      return null;
    }
  }

  private getAccountContextCacheKey(gitlabConfig: any): string | null {
    if (gitlabConfig.accountId) {
      return `account:${gitlabConfig.accountId}`;
    }
    if (gitlabConfig.email) {
      return `email:${gitlabConfig.email}`;
    }
    if (gitlabConfig.host) {
      return `host:${gitlabConfig.host}`;
    }
    return null;
  }

  /**
   * Adds GitLab token to environment variables.
   */
  private addGitlabTokenToEnvironment(env: Record<string, string>, accessToken?: string): void {
    if (accessToken) {
      env["GITLAB_ACCESS_TOKEN"] = accessToken;
      // Set global token for test mode
      (global as any).testAccessToken = accessToken;
    }
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
