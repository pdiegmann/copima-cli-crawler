/**
 * Test configuration validator for end-to-end testing.
 * Validates YAML test configurations and provides detailed error reporting.
 */

import type { TestConfig, TestSuite } from "./types.js";

/**
 * Validation result for test configurations.
 */
export type ConfigValidationResult = {
  /** Validation passed */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Validated configuration (if valid) */
  config?: TestConfig;
};

/**
 * Validation result for test suites.
 */
export type SuiteValidationResult = {
  /** Validation passed */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Validated suite (if valid) */
  suite?: TestSuite;
};

/**
 * Test configuration validator class.
 */
export class TestConfigValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Validates a complete test configuration.
   */
  public validateTestConfig(config: any): ConfigValidationResult {
    this.errors = [];
    this.warnings = [];

    if (!config || typeof config !== "object") {
      this.errors.push("Test configuration must be an object");
      return this.createResult();
    }

    // Validate each section
    this.validateMetadata(config.metadata);
    this.validateGitLabConfig(config.gitlab);

    if (config.oauth) {
      this.validateOAuthConfig(config.oauth);
    }

    this.validateExecutionConfig(config.execution);
    this.validateValidationConfig(config.validation);
    this.validateCleanupConfig(config.cleanup);

    return this.createResult(config as TestConfig);
  }

  /**
   * Validates a test suite configuration.
   */
  public validateTestSuite(suite: any): SuiteValidationResult {
    this.errors = [];
    this.warnings = [];

    if (!suite || typeof suite !== "object") {
      this.errors.push("Test suite must be an object");
      return this.createSuiteResult();
    }

    // Validate suite metadata
    if (!suite.metadata || typeof suite.metadata !== "object") {
      this.errors.push("Suite metadata is required");
    } else {
      this.validateSuiteMetadata(suite.metadata);
    }

    // Validate tests array
    if (!Array.isArray(suite.tests)) {
      this.errors.push("Suite tests must be an array");
    } else {
      suite.tests.forEach((test: any, index: number) => {
        const result = this.validateTestConfig(test);
        if (!result.valid) {
          this.errors.push(`Test ${index}: ${result.errors.join(", ")}`);
        }
      });
    }

    // Validate settings
    if (!suite.settings || typeof suite.settings !== "object") {
      this.errors.push("Suite settings are required");
    } else {
      this.validateSuiteSettings(suite.settings);
    }

    return this.createSuiteResult(suite as TestSuite);
  }

  /**
   * Validates test metadata section.
   */
  private validateMetadata(metadata: any): void {
    if (!metadata || typeof metadata !== "object") {
      this.errors.push("Test metadata is required");
      return;
    }

    const required = ["name", "description", "version"];
    for (const field of required) {
      if (!metadata[field] || typeof metadata[field] !== "string") {
        this.errors.push(`Metadata.${field} is required and must be a string`);
      }
    }

    if (metadata.timeout && (typeof metadata.timeout !== "number" || metadata.timeout <= 0)) {
      this.errors.push("Metadata.timeout must be a positive number");
    }

    if (metadata.tags && !Array.isArray(metadata.tags)) {
      this.errors.push("Metadata.tags must be an array");
    }
  }

  /**
   * Validates GitLab configuration section.
   */
  private validateGitLabConfig(gitlab: any): void {
    if (!gitlab || typeof gitlab !== "object") {
      this.errors.push("GitLab configuration is required");
      return;
    }

    // Host is always required
    if (!gitlab.host || typeof gitlab.host !== "string") {
      this.errors.push("GitLab.host is required and must be a string");
    }

    // Either accessToken OR accountId OR email must be provided
    const hasAccessToken = gitlab.accessToken && typeof gitlab.accessToken === "string";
    const hasAccountId = gitlab.accountId && typeof gitlab.accountId === "string";
    const hasEmail = gitlab.email && typeof gitlab.email === "string";

    if (!hasAccessToken && !hasAccountId && !hasEmail) {
      this.errors.push("GitLab configuration must provide either accessToken, accountId, or email for authentication");
    }

    // Validate accessToken if provided
    if (gitlab.accessToken !== undefined && typeof gitlab.accessToken !== "string") {
      this.errors.push("GitLab.accessToken must be a string");
    }

    // Validate accountId if provided
    if (gitlab.accountId !== undefined && typeof gitlab.accountId !== "string") {
      this.errors.push("GitLab.accountId must be a string");
    }

    // Validate email if provided
    if (gitlab.email !== undefined && typeof gitlab.email !== "string") {
      this.errors.push("GitLab.email must be a string");
    }

    // Validate host URL format
    if (gitlab.host && typeof gitlab.host === "string") {
      try {
        new URL(gitlab.host);
      } catch {
        this.errors.push("GitLab.host must be a valid URL");
      }
    }

    // Validate numeric fields
    const numericFields = ["timeout", "maxConcurrency", "rateLimit"];
    for (const field of numericFields) {
      if (gitlab[field] !== undefined && (typeof gitlab[field] !== "number" || gitlab[field] <= 0)) {
        this.errors.push(`GitLab.${field} must be a positive number`);
      }
    }
  }

  /**
   * Validates OAuth configuration section.
   */
  private validateOAuthConfig(oauth: any): void {
    if (typeof oauth !== "object") {
      this.errors.push("OAuth configuration must be an object");
      return;
    }

    const required = ["clientId", "clientSecret", "redirectUri"];
    for (const field of required) {
      if (!oauth[field] || typeof oauth[field] !== "string") {
        this.errors.push(`OAuth.${field} is required and must be a string`);
      }
    }

    // Validate redirect URI format
    if (oauth.redirectUri && typeof oauth.redirectUri === "string") {
      try {
        new URL(oauth.redirectUri);
      } catch {
        this.errors.push("OAuth.redirectUri must be a valid URL");
      }
    }

    if (oauth.scopes && !Array.isArray(oauth.scopes)) {
      this.errors.push("OAuth.scopes must be an array");
    }
  }

  /**
   * Validates execution configuration section.
   */
  private validateExecutionConfig(execution: any): void {
    if (!execution || typeof execution !== "object") {
      this.errors.push("Execution configuration is required");
      return;
    }

    const required = ["workingDir", "outputDir", "databasePath"];
    for (const field of required) {
      if (!execution[field] || typeof execution[field] !== "string") {
        this.errors.push(`Execution.${field} is required and must be a string`);
      }
    }

    // Validate steps array
    if (execution.steps) {
      if (!Array.isArray(execution.steps)) {
        this.errors.push("Execution.steps must be an array");
      } else {
        const validSteps = ["areas", "users", "resources", "repository"];
        for (const step of execution.steps) {
          if (!validSteps.includes(step)) {
            this.errors.push(`Invalid step: ${step}. Valid steps: ${validSteps.join(", ")}`);
          }
        }
      }
    }

    // Validate boolean fields
    const booleanFields = ["testResume", "testCallbacks"];
    for (const field of booleanFields) {
      if (execution[field] !== undefined && typeof execution[field] !== "boolean") {
        this.errors.push(`Execution.${field} must be a boolean`);
      }
    }
  }

  /**
   * Validates validation configuration section.
   */
  private validateValidationConfig(validation: any): void {
    if (!validation || typeof validation !== "object") {
      this.errors.push("Validation configuration is required");
      return;
    }

    // Validate expected files
    if (!Array.isArray(validation.expectedFiles)) {
      this.errors.push("Validation.expectedFiles must be an array");
    } else {
      validation.expectedFiles.forEach((file: any, index: number) => {
        this.validateExpectedFile(file, index);
      });
    }

    // Validate logs configuration
    if (!validation.logs || typeof validation.logs !== "object") {
      this.errors.push("Validation.logs configuration is required");
    } else {
      this.validateLogValidation(validation.logs);
    }

    // Validate performance configuration
    if (!validation.performance || typeof validation.performance !== "object") {
      this.errors.push("Validation.performance configuration is required");
    } else {
      this.validatePerformanceValidation(validation.performance);
    }

    // Validate data quality configuration
    if (!validation.dataQuality || typeof validation.dataQuality !== "object") {
      this.errors.push("Validation.dataQuality configuration is required");
    } else {
      this.validateDataQualityValidation(validation.dataQuality);
    }
  }

  /**
   * Validates expected file configuration.
   */
  private validateExpectedFile(file: any, index: number): void {
    if (!file || typeof file !== "object") {
      this.errors.push(`Expected file ${index} must be an object`);
      return;
    }

    if (!file.path || typeof file.path !== "string") {
      this.errors.push(`Expected file ${index}: path is required and must be a string`);
    }

    const validFormats = ["jsonl", "yaml", "json"];
    if (!file.format || !validFormats.includes(file.format)) {
      this.errors.push(`Expected file ${index}: format must be one of: ${validFormats.join(", ")}`);
    }

    const numericFields = ["minRecords", "maxRecords"];
    for (const field of numericFields) {
      if (file[field] !== undefined && (typeof file[field] !== "number" || file[field] < 0)) {
        this.errors.push(`Expected file ${index}: ${field} must be a non-negative number`);
      }
    }

    if (file.requiredFields && !Array.isArray(file.requiredFields)) {
      this.errors.push(`Expected file ${index}: requiredFields must be an array`);
    }
  }

  /**
   * Validates log validation configuration.
   */
  private validateLogValidation(logs: any): void {
    const validLevels = ["error", "warn", "info", "debug"];

    if (!Array.isArray(logs.expectedLevels)) {
      this.errors.push("Log validation expectedLevels must be an array");
    } else {
      for (const level of logs.expectedLevels) {
        if (!validLevels.includes(level)) {
          this.errors.push(`Invalid log level: ${level}. Valid levels: ${validLevels.join(", ")}`);
        }
      }
    }

    if (!Array.isArray(logs.requiredMessages)) {
      this.errors.push("Log validation requiredMessages must be an array");
    }

    if (logs.forbiddenMessages && !Array.isArray(logs.forbiddenMessages)) {
      this.errors.push("Log validation forbiddenMessages must be an array");
    }

    const numericFields = ["maxErrors", "maxWarnings"];
    for (const field of numericFields) {
      if (logs[field] !== undefined && (typeof logs[field] !== "number" || logs[field] < 0)) {
        this.errors.push(`Log validation ${field} must be a non-negative number`);
      }
    }
  }

  /**
   * Validates performance validation configuration.
   */
  private validatePerformanceValidation(performance: any): void {
    const numericFields = ["maxExecutionTime", "maxMemoryUsage", "expectedApiRate", "maxFileIOPS"];
    for (const field of numericFields) {
      if (performance[field] !== undefined && (typeof performance[field] !== "number" || performance[field] <= 0)) {
        this.errors.push(`Performance validation ${field} must be a positive number`);
      }
    }
  }

  /**
   * Validates data quality validation configuration.
   */
  private validateDataQualityValidation(dataQuality: any): void {
    const booleanFields = ["validateJsonStructure", "checkDuplicates", "validateRequiredFields"];
    for (const field of booleanFields) {
      if (typeof dataQuality[field] !== "boolean") {
        this.errors.push(`Data quality ${field} must be a boolean`);
      }
    }

    if (dataQuality.customValidators && !Array.isArray(dataQuality.customValidators)) {
      this.errors.push("Data quality customValidators must be an array");
    }
  }

  /**
   * Validates cleanup configuration section.
   */
  private validateCleanupConfig(cleanup: any): void {
    if (!cleanup || typeof cleanup !== "object") {
      this.errors.push("Cleanup configuration is required");
      return;
    }

    const booleanFields = ["cleanOutputDir", "cleanDatabase", "cleanLogs", "keepOnFailure"];
    for (const field of booleanFields) {
      if (typeof cleanup[field] !== "boolean") {
        this.errors.push(`Cleanup.${field} must be a boolean`);
      }
    }
  }

  /**
   * Validates suite metadata.
   */
  private validateSuiteMetadata(metadata: any): void {
    const required = ["name", "description", "version"];
    for (const field of required) {
      if (!metadata[field] || typeof metadata[field] !== "string") {
        this.errors.push(`Suite metadata.${field} is required and must be a string`);
      }
    }
  }

  /**
   * Validates suite settings.
   */
  private validateSuiteSettings(settings: any): void {
    if (typeof settings.parallel !== "boolean") {
      this.errors.push("Suite settings.parallel must be a boolean");
    }

    if (settings.maxParallel !== undefined && (typeof settings.maxParallel !== "number" || settings.maxParallel <= 0)) {
      this.errors.push("Suite settings.maxParallel must be a positive number");
    }

    if (typeof settings.stopOnFailure !== "boolean") {
      this.errors.push("Suite settings.stopOnFailure must be a boolean");
    }

    if (typeof settings.generateReport !== "boolean") {
      this.errors.push("Suite settings.generateReport must be a boolean");
    }

    const validReportFormats = ["json", "yaml", "html"];
    if (settings.reportFormat && !validReportFormats.includes(settings.reportFormat)) {
      this.errors.push(`Suite settings.reportFormat must be one of: ${validReportFormats.join(", ")}`);
    }
  }

  /**
   * Creates validation result for test configuration.
   */
  private createResult(config?: TestConfig): ConfigValidationResult {
    return {
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
      config: this.errors.length === 0 ? config : undefined,
    };
  }

  /**
   * Creates validation result for test suite.
   */
  private createSuiteResult(suite?: TestSuite): SuiteValidationResult {
    return {
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
      suite: this.errors.length === 0 ? suite : undefined,
    };
  }
}

/**
 * Creates a new test configuration validator.
 */
export const createTestConfigValidator = (): TestConfigValidator => {
  return new TestConfigValidator();
};

/**
 * Validates a test configuration object.
 */
export const validateTestConfig = (config: any): ConfigValidationResult => {
  const validator = createTestConfigValidator();
  return validator.validateTestConfig(config);
};

/**
 * Validates a test suite configuration object.
 */
export const validateTestSuite = (suite: any): SuiteValidationResult => {
  const validator = createTestConfigValidator();
  return validator.validateTestSuite(suite);
};
