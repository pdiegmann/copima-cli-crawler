/**
 * Configuration types for the GitLab crawler CLI application.
 * Supports 5-level configuration hierarchy:
 * 1. CLI arguments (highest priority)
 * 2. Environment variables
 * 3. User config file (~/.config/copima)
 * 4. Local config file (./copima.config.yaml)
 * 5. Built-time defaults (lowest priority)
 */

/**
 * Core configuration interface for the GitLab crawler.
 */
export type Config = {
  /** GitLab instance configuration */
  gitlab: GitLabConfig;
  /** Database configuration */
  database: DatabaseConfig;
  /** Output configuration for data storage */
  output: OutputConfig;
  /** Logging configuration */
  logging: LoggingConfig;
  /** Progress reporting configuration */
  progress: ProgressConfig;
  /** Resume capabilities configuration */
  resume: ResumeConfig;
  /** Data processing callback configuration */
  callbacks: CallbackConfig;
};

/**
 * Callback configuration for data processing hooks.
 */
export type CallbackConfig = {
  /** Enable or disable the callback system */
  enabled: boolean;
  /** Path to the callback module or function */
  modulePath?: string;
  /** Inline callback function (overrides modulePath if provided) */
  inlineCallback?: (context: CallbackContext, object: any) => any | false;
};

/**
 * Context information passed to callbacks.
 */
export type CallbackContext = {
  /** GitLab host URL */
  host: string;
  /** Account ID associated with the current operation */
  accountId: string;
  /** Resource type being processed (e.g., 'user', 'issue') */
  resourceType: string;
};

/**
 * GitLab instance connection and authentication configuration.
 */
export type GitLabConfig = {
  /** GitLab host URL (e.g., https://gitlab.com) */
  host: string;
  /** OAuth2 access token for API authentication */
  accessToken: string;
  /** OAuth2 refresh token for token renewal */
  refreshToken?: string;
  /** API request timeout in milliseconds */
  timeout?: number;
  /** Maximum concurrent API requests */
  maxConcurrency?: number;
  /** Rate limiting: requests per minute */
  rateLimit?: number;
};

/**
 * Database configuration for OAuth credentials storage.
 */
export type DatabaseConfig = {
  /** Path to SQLite database file */
  path: string;
  /** Enable WAL mode for better concurrent access */
  walMode?: boolean;
  /** Connection timeout in milliseconds */
  timeout?: number;
};

/**
 * Output configuration for JSONL data storage.
 */
export type OutputConfig = {
  /** Root directory for output data */
  rootDir: string;
  /** Current working directory for output operations */
  directory?: string;
  /** File naming convention (lowercase, kebab-case, etc.) */
  fileNaming?: "lowercase" | "kebab-case" | "snake_case";
  /** Pretty print JSON (slower but readable) */
  prettyPrint?: boolean;
  /** Compression for output files */
  compression?: "none" | "gzip" | "brotli";
};

/**
 * Logging configuration using Winston.
 */
export type LoggingConfig = {
  /** Log level (error, warn, info, debug) */
  level: "error" | "warn" | "info" | "debug";
  /** Log format (json, simple, combined) */
  format?: "json" | "simple" | "combined";
  /** Log to file path (optional) */
  file?: string;
  /** Enable console logging */
  console?: boolean;
  /** Enable colored output in console */
  colors?: boolean;
};

/**
 * Progress reporting configuration for YAML progress files.
 */
export type ProgressConfig = {
  /** Enable progress reporting */
  enabled: boolean;
  /** Path to progress YAML file */
  file: string;
  /** Update interval in milliseconds */
  interval?: number;
  /** Include detailed resource counts */
  detailed?: boolean;
};

/**
 * Resume capabilities configuration for state persistence.
 */
export type ResumeConfig = {
  /** Enable resume capabilities */
  enabled: boolean;
  /** Path to resume state file */
  stateFile: string;
  /** Auto-save interval in milliseconds */
  autoSaveInterval?: number;
};

/**
 * Partial configuration type for merging configurations.
 */
export type PartialConfig = {
  [K in keyof Config]?: Partial<Config[K]>;
};

/**
 * Environment variable mapping for configuration.
 */
export type EnvMapping = {
  GITLAB_HOST?: string;
  GITLAB_ACCESS_TOKEN?: string;
  GITLAB_REFRESH_TOKEN?: string;
  GITLAB_TIMEOUT?: string;
  GITLAB_MAX_CONCURRENCY?: string;
  GITLAB_RATE_LIMIT?: string;

  DATABASE_PATH?: string;
  DATABASE_WAL_MODE?: string;
  DATABASE_TIMEOUT?: string;

  OUTPUT_ROOT_DIR?: string;
  OUTPUT_FILE_NAMING?: string;
  OUTPUT_PRETTY_PRINT?: string;
  OUTPUT_COMPRESSION?: string;

  LOG_LEVEL?: string;
  LOG_FORMAT?: string;
  LOG_FILE?: string;
  LOG_CONSOLE?: string;
  LOG_COLORS?: string;

  PROGRESS_ENABLED?: string;
  PROGRESS_FILE?: string;
  PROGRESS_INTERVAL?: string;
  PROGRESS_DETAILED?: string;

  RESUME_ENABLED?: string;
  RESUME_STATE_FILE?: string;
  RESUME_AUTO_SAVE_INTERVAL?: string;

  CALLBACK_ENABLED?: string;
  CALLBACK_MODULE_PATH?: string;
};

/**
 * CLI argument mapping for configuration.
 */
export type CliArgs = {
  // GitLab configuration
  host?: string;
  accessToken?: string;
  refreshToken?: string;
  timeout?: number;
  maxConcurrency?: number;
  rateLimit?: number;

  // Database configuration
  databasePath?: string;
  walMode?: boolean;
  databaseTimeout?: number;

  // Output configuration
  outputDir?: string;
  fileNaming?: string;
  prettyPrint?: boolean;
  compression?: string;

  // Logging configuration
  logLevel?: string;
  logFormat?: string;
  logFile?: string;
  console?: boolean;
  colors?: boolean;

  // Progress configuration
  progressEnabled?: boolean;
  progressFile?: string;
  progressInterval?: number;
  progressDetailed?: boolean;

  // Resume configuration
  resumeEnabled?: boolean;
  resumeStateFile?: string;
  resumeAutoSaveInterval?: number;

  // Callback configuration
  callbackEnabled?: boolean;
  callbackModulePath?: string;
};
