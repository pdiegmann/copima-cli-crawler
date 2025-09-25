import type { Config } from "../types.js";

export class EnvironmentConfigLoader {
  loadFromEnvironment(): Partial<Config> {
    const config: Partial<Config> = {};

    // GitLab configuration
    const gitlabConfig: any = {};
    if (process.env["GITLAB_HOST"]) {
      gitlabConfig.host = process.env["GITLAB_HOST"];
    }
    if (process.env["GITLAB_ACCESS_TOKEN"]) {
      gitlabConfig.accessToken = process.env["GITLAB_ACCESS_TOKEN"];
    }
    if (process.env["GITLAB_REFRESH_TOKEN"]) {
      gitlabConfig.refreshToken = process.env["GITLAB_REFRESH_TOKEN"];
    }
    if (process.env["GITLAB_TIMEOUT"]) {
      const timeout = parseInt(process.env["GITLAB_TIMEOUT"], 10);
      if (!isNaN(timeout)) {
        gitlabConfig.timeout = timeout;
      }
    }
    if (process.env["GITLAB_MAX_CONCURRENCY"]) {
      const maxConcurrency = parseInt(process.env["GITLAB_MAX_CONCURRENCY"], 10);
      if (!isNaN(maxConcurrency)) {
        gitlabConfig.maxConcurrency = maxConcurrency;
      }
    }
    if (process.env["GITLAB_RATE_LIMIT"]) {
      const rateLimit = parseInt(process.env["GITLAB_RATE_LIMIT"], 10);
      if (!isNaN(rateLimit)) {
        gitlabConfig.rateLimit = rateLimit;
      }
    }
    if (Object.keys(gitlabConfig).length > 0) {
      config.gitlab = gitlabConfig;
    }

    // Database configuration
    const databaseConfig: any = {};
    if (process.env["DATABASE_PATH"]) {
      databaseConfig.path = process.env["DATABASE_PATH"];
    }
    if (process.env["DATABASE_WAL_MODE"]) {
      databaseConfig.walMode = process.env["DATABASE_WAL_MODE"].toLowerCase() === "true";
    }
    if (process.env["DATABASE_TIMEOUT"]) {
      const timeout = parseInt(process.env["DATABASE_TIMEOUT"], 10);
      if (!isNaN(timeout)) {
        databaseConfig.timeout = timeout;
      }
    }
    if (Object.keys(databaseConfig).length > 0) {
      config.database = databaseConfig;
    }

    // Output configuration
    const outputConfig: any = {};
    if (process.env["OUTPUT_ROOT_DIR"]) {
      outputConfig.rootDir = process.env["OUTPUT_ROOT_DIR"];
    }
    if (process.env["OUTPUT_FILE_NAMING"]) {
      const validNaming = ["lowercase", "kebab-case", "snake_case"];
      const naming = process.env["OUTPUT_FILE_NAMING"];
      if (validNaming.includes(naming)) {
        outputConfig.fileNaming = naming as any;
      }
    }
    if (process.env["OUTPUT_PRETTY_PRINT"]) {
      outputConfig.prettyPrint = process.env["OUTPUT_PRETTY_PRINT"].toLowerCase() === "true";
    }
    if (process.env["OUTPUT_COMPRESSION"]) {
      const validCompression = ["none", "gzip", "brotli"];
      const compression = process.env["OUTPUT_COMPRESSION"];
      if (validCompression.includes(compression)) {
        outputConfig.compression = compression as any;
      }
    }
    if (Object.keys(outputConfig).length > 0) {
      config.output = outputConfig;
    }

    // Logging configuration
    const loggingConfig: any = {};
    if (process.env["LOG_LEVEL"]) {
      const validLevels = ["error", "warn", "info", "debug"];
      const level = process.env["LOG_LEVEL"];
      if (validLevels.includes(level)) {
        loggingConfig.level = level as any;
      }
    }
    if (process.env["LOG_FORMAT"]) {
      const validFormats = ["json", "simple", "combined"];
      const format = process.env["LOG_FORMAT"];
      if (validFormats.includes(format)) {
        loggingConfig.format = format as any;
      }
    }
    if (process.env["LOG_FILE"]) {
      loggingConfig.file = process.env["LOG_FILE"];
    }
    if (process.env["LOG_CONSOLE"]) {
      loggingConfig.console = process.env["LOG_CONSOLE"].toLowerCase() === "true";
    }
    if (process.env["LOG_COLORS"]) {
      loggingConfig.colors = process.env["LOG_COLORS"].toLowerCase() === "true";
    }
    if (Object.keys(loggingConfig).length > 0) {
      config.logging = loggingConfig;
    }

    // Progress configuration
    const progressConfig: any = {};
    if (process.env["PROGRESS_ENABLED"]) {
      progressConfig.enabled = process.env["PROGRESS_ENABLED"].toLowerCase() === "true";
    }
    if (process.env["PROGRESS_FILE"]) {
      progressConfig.file = process.env["PROGRESS_FILE"];
    }
    if (process.env["PROGRESS_INTERVAL"]) {
      const interval = parseInt(process.env["PROGRESS_INTERVAL"], 10);
      if (!isNaN(interval)) {
        progressConfig.interval = interval;
      }
    }
    if (process.env["PROGRESS_DETAILED"]) {
      progressConfig.detailed = process.env["PROGRESS_DETAILED"].toLowerCase() === "true";
    }
    if (Object.keys(progressConfig).length > 0) {
      config.progress = progressConfig;
    }

    // Resume configuration
    const resumeConfig: any = {};
    if (process.env["RESUME_ENABLED"]) {
      resumeConfig.enabled = process.env["RESUME_ENABLED"].toLowerCase() === "true";
    }
    if (process.env["RESUME_STATE_FILE"]) {
      resumeConfig.stateFile = process.env["RESUME_STATE_FILE"];
    }
    if (process.env["RESUME_AUTO_SAVE_INTERVAL"]) {
      const interval = parseInt(process.env["RESUME_AUTO_SAVE_INTERVAL"], 10);
      if (!isNaN(interval)) {
        resumeConfig.autoSaveInterval = interval;
      }
    }
    if (Object.keys(resumeConfig).length > 0) {
      config.resume = resumeConfig;
    }

    // Callback configuration
    const callbackConfig: any = {};
    if (process.env["CALLBACK_ENABLED"]) {
      callbackConfig.enabled = process.env["CALLBACK_ENABLED"].toLowerCase() === "true";
    }
    if (process.env["CALLBACK_MODULE_PATH"]) {
      callbackConfig.modulePath = process.env["CALLBACK_MODULE_PATH"];
    }
    if (Object.keys(callbackConfig).length > 0) {
      config.callbacks = callbackConfig;
    }

    return config;
  }

  getConfigPaths(): string[] {
    const paths: string[] = [];

    if (process.env["COPIMA_CONFIG_PATH"]) {
      paths.push(process.env["COPIMA_CONFIG_PATH"]);
    }

    if (process.env["COPIMA_CONFIG_PATHS"]) {
      paths.push(...process.env["COPIMA_CONFIG_PATHS"].split(":"));
    }

    return paths;
  }
}
