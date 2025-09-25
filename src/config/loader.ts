import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { parse as yamlParse } from "yaml";
import { createLogger } from "../logging";
import { defaultConfig } from "./defaults";
import type { CliArgs, Config, EnvMapping } from "./types";

/**
 * Configuration loader implementing 5-level hierarchy:
 * 1. CLI arguments (highest priority)
 * 2. Environment variables
 * 3. User config file (~/.config/copima/config.yaml)
 * 4. Local config file (./copima.yaml)
 * 5. Built-time defaults (lowest priority)
 */
export class ConfigLoader {
  private config: Config;
  private readonly logger = createLogger("ConfigLoader");

  constructor(logger: ReturnType<typeof createLogger> = createLogger("ConfigLoader")) {
    this.logger = logger;
    this.config = { ...defaultConfig };
  }

  /**
   * Load configuration from all sources in priority order
   */
  load(args: CliArgs = {}): Config {
    this.logger.debug("Loading configuration from all sources");

    // Start with defaults (level 5)
    this.config = { ...defaultConfig };
    this.logger.debug("Applied default configuration");

    // Level 4: Local config file (./copima.yaml)
    this.loadLocalConfigFile();

    // Level 3: User config file (~/.config/copima/config.yaml)
    this.loadUserConfigFile();

    // Level 2: Environment variables
    this.loadEnvironmentVariables();

    // Level 1: CLI arguments (highest priority)
    this.loadCliArguments(args);

    this.logger.info("Configuration loaded successfully");
    return this.config;
  }

  /**
   * Level 4: Load local configuration file (./copima.yaml)
   */
  private loadLocalConfigFile(): void {
    const localConfigPaths = ["./copima.yaml", "./copima.yml", "./.copima.yaml"];

    for (const configPath of localConfigPaths) {
      if (existsSync(configPath)) {
        try {
          const yamlContent = readFileSync(configPath, "utf8");
          const localConfig = yamlParse(yamlContent) as Partial<Config>;
          this.mergeConfig(localConfig);
          this.logger.debug(`Loaded local config from ${configPath}`);
          return;
        } catch (error) {
          this.logger.warn(`Failed to load local config from ${configPath}:`, { error: error instanceof Error ? error.message : String(error) });
        }
      }
    }

    this.logger.debug("No local config file found");
  }

  /**
   * Level 3: Load user configuration file (~/.config/copima/config.yaml)
   */
  private loadUserConfigFile(): void {
    const userConfigDir = join(homedir(), ".config", "copima");
    const userConfigPaths = [join(userConfigDir, "config.yaml"), join(userConfigDir, "config.yml")];

    for (const configPath of userConfigPaths) {
      if (existsSync(configPath)) {
        try {
          const yamlContent = readFileSync(configPath, "utf8");
          const userConfig = yamlParse(yamlContent) as Partial<Config>;
          this.mergeConfig(userConfig);
          this.logger.debug(`Loaded user config from ${configPath}`);
          return;
        } catch (error) {
          this.logger.warn(`Failed to load user config from ${configPath}:`, { error: error instanceof Error ? error.message : String(error) });
        }
      }
    }

    this.logger.debug("No user config file found");
  }

  /**
   /**
    * Level 2: Load environment variables
    */
  private loadEnvironmentVariables(): void {
    const env = process.env as EnvMapping;
    const envConfig: Partial<Config> = {};

    Object.keys(env)
      .filter((key) => key.startsWith("COPIMA_"))
      .forEach((key) => {
        const path = key.replace("COPIMA_", "").toLowerCase().split("_");
        let current: any = envConfig;

        path.forEach((segment, index) => {
          if (index === path.length - 1) {
            current[segment] = isNaN(Number(env[key])) ? env[key] : Number(env[key]);
          } else {
            current[segment] = current[segment] || {};
            current = current[segment];
          }
        });
      });

    if (Object.keys(envConfig).length > 0) {
      this.mergeConfig(envConfig);
      this.logger.debug("Applied COPIMA_* environment variable configuration");
    }
  }
  /**
   * Level 1: Load CLI arguments (highest priority)
   */
  private loadCliArguments(args: CliArgs): void {
    const argsConfig: Partial<Config> = {};

    // GitLab configuration
    if (args.host) {
      argsConfig.gitlab = { ...this.config.gitlab, host: args.host };
    }
    if (args.accessToken) {
      argsConfig.gitlab = {
        ...argsConfig.gitlab,
        ...this.config.gitlab,
        accessToken: args.accessToken,
      };
    }
    if (args.refreshToken) {
      argsConfig.gitlab = {
        ...argsConfig.gitlab,
        ...this.config.gitlab,
        refreshToken: args.refreshToken,
      };
    }
    if (args.timeout) {
      argsConfig.gitlab = {
        ...argsConfig.gitlab,
        ...this.config.gitlab,
        timeout: args.timeout,
      };
    }
    if (args.maxConcurrency) {
      argsConfig.gitlab = {
        ...argsConfig.gitlab,
        ...this.config.gitlab,
        maxConcurrency: args.maxConcurrency,
      };
    }
    if (args.rateLimit) {
      argsConfig.gitlab = {
        ...argsConfig.gitlab,
        ...this.config.gitlab,
        rateLimit: args.rateLimit,
      };
    }

    // Database configuration
    if (args.databasePath) {
      argsConfig.database = {
        ...this.config.database,
        path: args.databasePath,
      };
    }
    if (args.walMode !== undefined) {
      argsConfig.database = {
        ...argsConfig.database,
        ...this.config.database,
        walMode: args.walMode,
      };
    }
    if (args.databaseTimeout) {
      argsConfig.database = {
        ...argsConfig.database,
        ...this.config.database,
        timeout: args.databaseTimeout,
      };
    }

    // Output configuration
    if (args.outputDir) {
      argsConfig.output = { ...this.config.output, rootDir: args.outputDir };
    }
    if (args.fileNaming) {
      argsConfig.output = {
        ...argsConfig.output,
        ...this.config.output,
        fileNaming: args.fileNaming as "lowercase" | "kebab-case" | "snake_case",
      };
    }
    if (args.prettyPrint !== undefined) {
      argsConfig.output = {
        ...argsConfig.output,
        ...this.config.output,
        prettyPrint: args.prettyPrint,
      };
    }
    if (args.compression) {
      argsConfig.output = {
        ...argsConfig.output,
        ...this.config.output,
        compression: args.compression as "none" | "gzip" | "brotli",
      };
    }

    // Logging configuration
    if (args.logLevel) {
      argsConfig.logging = {
        ...this.config.logging,
        level: args.logLevel as "info" | "error" | "warn" | "debug",
      };
    }
    if (args.logFormat) {
      argsConfig.logging = {
        ...argsConfig.logging,
        ...this.config.logging,
        format: args.logFormat as "json" | "simple" | "combined",
      };
    }
    if (args.logFile) {
      argsConfig.logging = {
        ...argsConfig.logging,
        ...this.config.logging,
        file: args.logFile,
      };
    }
    if (args.console !== undefined) {
      argsConfig.logging = {
        ...argsConfig.logging,
        ...this.config.logging,
        console: args.console,
      };
    }
    if (args.colors !== undefined) {
      argsConfig.logging = {
        ...argsConfig.logging,
        ...this.config.logging,
        colors: args.colors,
      };
    }

    // Progress configuration
    if (args.progressEnabled !== undefined) {
      argsConfig.progress = {
        ...this.config.progress,
        enabled: args.progressEnabled,
      };
    }
    if (args.progressFile) {
      argsConfig.progress = {
        ...argsConfig.progress,
        ...this.config.progress,
        file: args.progressFile,
      };
    }
    if (args.progressInterval) {
      argsConfig.progress = {
        ...argsConfig.progress,
        ...this.config.progress,
        interval: args.progressInterval,
      };
    }
    if (args.progressDetailed !== undefined) {
      argsConfig.progress = {
        ...argsConfig.progress,
        ...this.config.progress,
        detailed: args.progressDetailed,
      };
    }

    // Resume configuration
    if (args.resumeEnabled !== undefined) {
      argsConfig.resume = {
        ...this.config.resume,
        enabled: args.resumeEnabled,
      };
    }
    if (args.resumeStateFile) {
      argsConfig.resume = {
        ...argsConfig.resume,
        ...this.config.resume,
        stateFile: args.resumeStateFile,
      };
    }
    if (args.resumeAutoSaveInterval) {
      argsConfig.resume = {
        ...argsConfig.resume,
        ...this.config.resume,
        autoSaveInterval: args.resumeAutoSaveInterval,
      };
    }

    if (Object.keys(argsConfig).length > 0) {
      this.mergeConfig(argsConfig);
      this.logger.debug("Applied CLI argument configuration");
    }
  }

  /**
   * Deep merge configuration objects
   */
  private mergeConfig(source: Partial<Config>): void {
    this.config = this.deepMerge(this.config, source);
  }

  /**
   * Deep merge two objects, with source taking priority
   */
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (sourceValue !== undefined) {
        if (this.isObject(sourceValue) && this.isObject(targetValue)) {
          (result as any)[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          (result as any)[key] = sourceValue;
        }
      }
    }

    return result;
  }

  /**
   * Check if value is a plain object
   */
  private isObject(value: any): value is Record<string, any> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /**
   * Get current configuration
   */
  getConfig(): Config {
    return this.config;
  }

  /**
   * Validate configuration
   */
  validate(): void {
    if (!this.config.gitlab.host) {
      throw new Error("GitLab host is required");
    }

    if (!this.config.gitlab.accessToken) {
      throw new Error("GitLab access token is required");
    }

    if (this.config.gitlab?.timeout !== undefined && this.config.gitlab.timeout <= 0) {
      throw new Error("GitLab timeout must be positive");
    }

    if (this.config.gitlab?.maxConcurrency !== undefined && this.config.gitlab.maxConcurrency <= 0) {
      throw new Error("GitLab max concurrency must be positive");
    }

    if (this.config.gitlab?.rateLimit !== undefined && this.config.gitlab.rateLimit <= 0) {
      throw new Error("GitLab rate limit must be positive");
    }

    if (this.config.database?.timeout !== undefined && this.config.database.timeout <= 0) {
      throw new Error("Database timeout must be positive");
    }

    if (this.config.progress?.interval !== undefined && this.config.progress.interval <= 0) {
      throw new Error("Progress interval must be positive");
    }

    if (this.config.resume?.autoSaveInterval !== undefined && this.config.resume.autoSaveInterval <= 0) {
      throw new Error("Resume auto-save interval must be positive");
    }

    this.logger.debug("Configuration validation passed");
  }
}

/**
 * Create and load configuration
 */
export const loadConfig = (args: CliArgs = {}): Config => {
  const loader = new ConfigLoader();
  const config = loader.load(args);
  loader.validate();
  return config;
};
