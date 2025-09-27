/**
 * End-to-end testing types for the GitLab crawler.
 * Supports test configuration via YAML files and comprehensive validation.
 */

import type { Config } from "../config/types.js";

/**
 * Complete test configuration for end-to-end crawler testing.
 */
export type TestConfig = {
  /** Test metadata */
  metadata: TestMetadata;
  /** GitLab connection configuration */
  gitlab: TestGitLabConfig;
  /** OAuth configuration if needed */
  oauth?: TestOAuthConfig;
  /** Test execution settings */
  execution: TestExecutionConfig;
  /** Expected outcomes and validation rules */
  validation: TestValidationConfig;
  /** Cleanup settings */
  cleanup: TestCleanupConfig;
};

/**
 * Test metadata and identification.
 */
export type TestMetadata = {
  /** Test name/identifier */
  name: string;
  /** Test description */
  description: string;
  /** Test version */
  version: string;
  /** Test author */
  author?: string;
  /** Test tags for categorization */
  tags?: string[];
  /** Test timeout in milliseconds */
  timeout?: number;
};

/**
 * GitLab instance configuration for testing.
 */
export type TestGitLabConfig = {
  /** GitLab host URL */
  host: string;
  /** OAuth2 access token (optional if using account lookup) */
  accessToken?: string;
  /** OAuth2 refresh token (optional) */
  refreshToken?: string;
  /** Account ID to lookup stored credentials */
  accountId?: string;
  /** Email address to lookup stored credentials */
  email?: string;
  /** API timeout in milliseconds */
  timeout?: number;
  /** Maximum concurrent requests */
  maxConcurrency?: number;
  /** Rate limit (requests per minute) */
  rateLimit?: number;
  /** OAuth2 Configuration for token refresh */
  oauth2?: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
    type: string;
  };
};

/**
 * OAuth application configuration for token refresh testing.
 */
export type TestOAuthConfig = {
  /** OAuth application client ID */
  clientId: string;
  /** OAuth application client secret */
  clientSecret: string;
  /** OAuth redirect URI */
  redirectUri: string;
  /** OAuth scopes */
  scopes?: string[];
};

/**
 * Test execution configuration.
 */
export type TestExecutionConfig = {
  /** Working directory for test execution */
  workingDir: string;
  /** Output directory for crawler data */
  outputDir: string;
  /** Database path for test */
  databasePath: string;
  /** Steps to execute (default: all) */
  steps?: ("areas" | "users" | "resources" | "repository")[];
  /** Enable resume functionality testing */
  testResume?: boolean;
  /** Enable callback testing */
  testCallbacks?: boolean;
  /** Custom crawler configuration overrides */
  crawlerConfig?: Partial<Config>;
};

/**
 * Validation configuration for test results.
 */
export type TestValidationConfig = {
  /** Expected output files */
  expectedFiles: ExpectedFileConfig[];
  /** Log validation rules */
  logs: LogValidationConfig;
  /** Performance expectations */
  performance: PerformanceValidationConfig;
  /** Data quality validation */
  dataQuality: DataQualityConfig;
  /** Resume state validation */
  resumeState?: ResumeStateValidation;
};

/**
 * Expected output file configuration.
 */
export type ExpectedFileConfig = {
  /** File path relative to output directory */
  path: string;
  /** Minimum number of records expected */
  minRecords?: number;
  /** Maximum number of records expected */
  maxRecords?: number;
  /** Required fields in each record */
  requiredFields?: string[];
  /** File format validation */
  format: "jsonl" | "yaml" | "json";
  /** Custom validation function name */
  customValidator?: string;
};

/**
 * Log validation configuration.
 */
export type LogValidationConfig = {
  /** Expected log levels */
  expectedLevels: ("error" | "warn" | "info" | "debug")[];
  /** Required log messages (regex patterns) */
  requiredMessages: string[];
  /** Forbidden log messages (regex patterns) */
  forbiddenMessages?: string[];
  /** Maximum allowed errors */
  maxErrors?: number;
  /** Maximum allowed warnings */
  maxWarnings?: number;
};

/**
 * Performance validation configuration.
 */
export type PerformanceValidationConfig = {
  /** Maximum execution time in milliseconds */
  maxExecutionTime?: number;
  /** Maximum memory usage in MB */
  maxMemoryUsage?: number;
  /** Expected API requests per minute */
  expectedApiRate?: number;
  /** Maximum file I/O operations per second */
  maxFileIOPS?: number;
};

/**
 * Data quality validation configuration.
 */
export type DataQualityConfig = {
  /** Validate JSON structure */
  validateJsonStructure: boolean;
  /** Check for duplicate records */
  checkDuplicates: boolean;
  /** Validate required fields are present */
  validateRequiredFields: boolean;
  /** Custom data validation functions */
  customValidators?: string[];
};

/**
 * Resume state validation configuration.
 */
export type ResumeStateValidation = {
  /** Validate state file is created */
  validateStateFile: boolean;
  /** Validate state file structure */
  validateStateStructure: boolean;
  /** Test resume from different points */
  testResumePoints?: string[];
};

/**
 * Test cleanup configuration.
 */
export type TestCleanupConfig = {
  /** Clean output directory after test */
  cleanOutputDir: boolean;
  /** Clean database after test */
  cleanDatabase: boolean;
  /** Clean log files after test */
  cleanLogs: boolean;
  /** Keep files on test failure */
  keepOnFailure: boolean;
};

/**
 * Test execution result.
 */
export type TestResult = {
  /** Test configuration used */
  config: TestConfig;
  /** Test success status */
  success: boolean;
  /** Test execution time in milliseconds */
  executionTime: number;
  /** Crawler execution result */
  crawlerResult: CrawlerExecutionResult;
  /** Validation results */
  validationResults: ValidationResults;
  /** Test error if failed */
  error?: string;
  /** Test warnings */
  warnings: string[];
  /** Cleanup results */
  cleanupResults: CleanupResults;
};

/**
 * Crawler execution result.
 */
export type CrawlerExecutionResult = {
  /** Exit code */
  exitCode: number;
  /** Stdout output */
  stdout: string;
  /** Stderr output */
  stderr: string;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Peak memory usage in MB */
  peakMemoryUsage?: number;
  /** Generated files */
  generatedFiles: string[];
};

/**
 * Validation results for all checks.
 */
export type ValidationResults = {
  /** File validation results */
  files: FileValidationResult[];
  /** Log validation results */
  logs: LogValidationResult;
  /** Performance validation results */
  performance: PerformanceValidationResult;
  /** Data quality validation results */
  dataQuality: DataQualityValidationResult;
  /** Resume state validation results */
  resumeState?: ResumeStateValidationResult;
};

/**
 * Individual file validation result.
 */
export type FileValidationResult = {
  /** File path */
  path: string;
  /** File exists */
  exists: boolean;
  /** Number of records found */
  recordCount?: number;
  /** Validation passed */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
};

/**
 * Log validation result.
 */
export type LogValidationResult = {
  /** Validation passed */
  valid: boolean;
  /** Found log levels */
  foundLevels: string[];
  /** Matched required messages */
  matchedMessages: string[];
  /** Found forbidden messages */
  forbiddenMatches: string[];
  /** Error count */
  errorCount: number;
  /** Warning count */
  warningCount: number;
  /** Validation errors */
  errors: string[];
};

/**
 * Performance validation result.
 */
export type PerformanceValidationResult = {
  /** Validation passed */
  valid: boolean;
  /** Actual execution time */
  executionTime: number;
  /** Actual memory usage */
  memoryUsage?: number;
  /** Actual API rate */
  apiRate?: number;
  /** Actual file I/O rate */
  fileIORate?: number;
  /** Performance errors */
  errors: string[];
};

/**
 * Data quality validation result.
 */
export type DataQualityValidationResult = {
  /** Validation passed */
  valid: boolean;
  /** JSON structure validation results */
  jsonStructure: boolean;
  /** Duplicate check results */
  duplicates: { file: string; count: number }[];
  /** Required fields validation results */
  requiredFields: { file: string; missing: string[] }[];
  /** Custom validator results */
  customValidators: { name: string; passed: boolean; errors: string[] }[];
  /** Overall errors */
  errors: string[];
};

/**
 * Resume state validation result.
 */
export type ResumeStateValidationResult = {
  /** Validation passed */
  valid: boolean;
  /** State file exists */
  stateFileExists: boolean;
  /** State structure valid */
  stateStructureValid: boolean;
  /** Resume points tested */
  resumePointsResults: { point: string; success: boolean; error?: string }[];
  /** Validation errors */
  errors: string[];
};

/**
 * Test cleanup results.
 */
export type CleanupResults = {
  /** Cleanup completed successfully */
  success: boolean;
  /** Output directory cleaned */
  outputDirCleaned: boolean;
  /** Database cleaned */
  databaseCleaned: boolean;
  /** Logs cleaned */
  logsCleaned: boolean;
  /** Cleanup errors */
  errors: string[];
};

/**
 * Test suite configuration for running multiple tests.
 */
export type TestSuite = {
  /** Suite metadata */
  metadata: {
    name: string;
    description: string;
    version: string;
  };
  /** Test configurations */
  tests: TestConfig[];
  /** Suite-wide settings */
  settings: {
    /** Run tests in parallel */
    parallel: boolean;
    /** Maximum parallel tests */
    maxParallel?: number;
    /** Stop on first failure */
    stopOnFailure: boolean;
    /** Generate report */
    generateReport: boolean;
    /** Report format */
    reportFormat?: "json" | "yaml" | "html";
  };
};

/**
 * Test suite execution result.
 */
export type TestSuiteResult = {
  /** Suite configuration */
  suite: TestSuite;
  /** Individual test results */
  results: TestResult[];
  /** Suite execution time */
  totalExecutionTime: number;
  /** Overall success */
  success: boolean;
  /** Summary statistics */
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    errors: number;
  };
};
