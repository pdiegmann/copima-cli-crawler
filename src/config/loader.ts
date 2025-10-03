import { existsSync } from "fs";
import process from "node:process";
import { homedir } from "os";
import { join } from "path";
import { createLogger } from "../logging";
import { defaultConfig } from "./defaults";
import { ConfigurationValidationError } from "./errors";
import type { WizardPrompter } from "./setupWizard";
import type { CliArgs, Config } from "./types";

// Import new modular components
import { EnvironmentConfigLoader } from "./loaders/environmentLoader";
import { FileConfigLoader } from "./loaders/fileLoader";
import { ConfigMerger } from "./merging/configMerger";
import { TemplateUtils } from "./utils/templateUtils";
import { ConfigValidator } from "./validation/validator";

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

  // New modular components
  private readonly validator = new ConfigValidator();
  private readonly fileLoader = new FileConfigLoader();
  private readonly envLoader = new EnvironmentConfigLoader();
  private readonly merger = new ConfigMerger();

  constructor(logger: ReturnType<typeof createLogger> = createLogger("ConfigLoader")) {
    this.logger = logger;
    this.config = { ...defaultConfig };
  }

  /**
   * Load configuration from all sources in priority order
   */
  async load(args: CliArgs = {}): Promise<Config> {
    this.logger.debug("Loading configuration from all sources using modular architecture");

    try {
      // Prepare configuration array with priority order
      const configs: Partial<Config>[] = [];

      // Level 5: Start with defaults (lowest priority)
      configs.push({ ...defaultConfig });
      this.logger.debug("Applied default configuration");

      // Level 4: Specified config file (if provided) or local config files
      let fileConfig: Partial<Config> = {};
      if (args.config) {
        // Load from specified config file
        fileConfig = await this.loadSpecifiedConfigFile(args.config);
      } else {
        // Load from local config files
        fileConfig = await this.loadConfigFiles();
      }

      if (Object.keys(fileConfig).length > 0) {
        configs.push(fileConfig);
        this.logger.debug(args.config ? `Applied specified configuration file: ${args.config}` : "Applied local configuration files");
      }

      // Level 3: User config file (~/.config/copima/config.yaml) - only if no specified config
      if (!args.config) {
        const userConfig = await this.loadUserConfigFiles();
        if (Object.keys(userConfig).length > 0) {
          configs.push(userConfig);
          this.logger.debug("Applied user configuration files");
        }
      }

      // Level 2: Environment variables
      const envConfig = this.envLoader.loadFromEnvironment();
      if (Object.keys(envConfig).length > 0) {
        configs.push(envConfig);
        this.logger.debug("Applied environment variable configuration");
      }

      // Level 1: CLI arguments (highest priority)
      const argsConfig = this.convertCliArgsToConfig(args);
      if (Object.keys(argsConfig).length > 0) {
        configs.push(argsConfig);
        this.logger.debug("Applied CLI argument configuration");
      }

      // Merge all configurations using new merger
      const mergedConfig = this.merger.merge(configs);

      // Apply template interpolation
      const templateVars = TemplateUtils.getDefaultVariables();
      const finalConfig = TemplateUtils.interpolateDeep(mergedConfig, templateVars) as Config;

      this.config = finalConfig;
      this.logger.info("Configuration loaded successfully using modular architecture");

      return this.config;
    } catch (error) {
      this.logger.error("Failed to load configuration", { error });
      throw new Error(`Configuration loading failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Load specified configuration file using new modular file loader
   */
  private async loadSpecifiedConfigFile(configPath: string): Promise<Partial<Config>> {
    try {
      let config: Partial<Config>;
      if (configPath.endsWith(".json")) {
        config = await this.fileLoader.loadJsonFile(configPath);
      } else {
        config = await this.fileLoader.loadYamlFile(configPath);
      }
      this.logger.debug(`Loaded specified config from ${configPath}`);
      return config;
    } catch (error) {
      this.logger.warn(`Failed to load specified config from ${configPath}:`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return {}; // Return empty config on error, don't re-throw
    }
  }

  /**
   * Load configuration files using new modular file loader
   */
  private async loadConfigFiles(): Promise<Partial<Config>> {
    const localConfigPaths = ["./copima.yaml", "./copima.yml", "./.copima.yaml", "./copima.json"];

    for (const configPath of localConfigPaths) {
      if (existsSync(configPath)) {
        try {
          let config: Partial<Config>;
          if (configPath.endsWith(".json")) {
            config = await this.fileLoader.loadJsonFile(configPath);
          } else {
            config = await this.fileLoader.loadYamlFile(configPath);
          }
          this.logger.debug(`Loaded local config from ${configPath}`);
          return config;
        } catch (error) {
          this.logger.warn(`Failed to load local config from ${configPath}:`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return {};
  }

  /**
   * Load user configuration files using new modular file loader
   */
  private async loadUserConfigFiles(): Promise<Partial<Config>> {
    const userConfigDir = join(homedir(), ".config", "copima");
    const userConfigPaths = [join(userConfigDir, "config.yaml"), join(userConfigDir, "config.yml"), join(userConfigDir, "config.json")];

    for (const configPath of userConfigPaths) {
      if (existsSync(configPath)) {
        try {
          let config: Partial<Config>;
          if (configPath.endsWith(".json")) {
            config = await this.fileLoader.loadJsonFile(configPath);
          } else {
            config = await this.fileLoader.loadYamlFile(configPath);
          }
          this.logger.debug(`Loaded user config from ${configPath}`);
          return config;
        } catch (error) {
          this.logger.warn(`Failed to load user config from ${configPath}:`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return {};
  }

  /**
   * Convert CLI arguments to configuration object
   */
  private convertCliArgsToConfig(args: CliArgs): Partial<Config> {
    const argsConfig: Partial<Config> = {};

    // Build configuration sections using helper methods
    this.addGitlabConfigFromArgs(args, argsConfig);
    this.addDatabaseConfigFromArgs(args, argsConfig);
    this.addOutputConfigFromArgs(args, argsConfig);
    this.addLoggingConfigFromArgs(args, argsConfig);
    this.addProgressConfigFromArgs(args, argsConfig);
    this.addResumeConfigFromArgs(args, argsConfig);
    this.addCallbackConfigFromArgs(args, argsConfig);

    return argsConfig;
  }

  private addGitlabConfigFromArgs(args: CliArgs, argsConfig: Partial<Config>): void {
    const gitlabConfig: any = {};
    if (args.host) gitlabConfig.host = args.host;
    if (args.accessToken) gitlabConfig.accessToken = args.accessToken;
    if (args.refreshToken) gitlabConfig.refreshToken = args.refreshToken;
    if (args.timeout) gitlabConfig.timeout = args.timeout;
    if (args.maxConcurrency) gitlabConfig.maxConcurrency = args.maxConcurrency;
    if (args.rateLimit) gitlabConfig.rateLimit = args.rateLimit;
    if (Object.keys(gitlabConfig).length > 0) {
      argsConfig.gitlab = gitlabConfig;
    }
  }

  private addDatabaseConfigFromArgs(args: CliArgs, argsConfig: Partial<Config>): void {
    const databaseConfig: any = {};
    if (args.databasePath) databaseConfig.path = args.databasePath;
    if (args.walMode !== undefined) databaseConfig.walMode = args.walMode;
    if (args.databaseTimeout) databaseConfig.timeout = args.databaseTimeout;
    if (Object.keys(databaseConfig).length > 0) {
      argsConfig.database = databaseConfig;
    }
  }

  private addOutputConfigFromArgs(args: CliArgs, argsConfig: Partial<Config>): void {
    const outputConfig: any = {};
    if (args.outputDir) outputConfig.rootDir = args.outputDir;
    if (args.fileNaming) outputConfig.fileNaming = args.fileNaming;
    if (args.prettyPrint !== undefined) outputConfig.prettyPrint = args.prettyPrint;
    if (args.compression) outputConfig.compression = args.compression;
    if (Object.keys(outputConfig).length > 0) {
      argsConfig.output = outputConfig;
    }
  }

  private addLoggingConfigFromArgs(args: CliArgs, argsConfig: Partial<Config>): void {
    const loggingConfig: any = {};
    if (args.logLevel) loggingConfig.level = args.logLevel;
    if (args.logFormat) loggingConfig.format = args.logFormat;
    if (args.logFile) loggingConfig.file = args.logFile;
    if (args.console !== undefined) loggingConfig.console = args.console;
    if (args.colors !== undefined) loggingConfig.colors = args.colors;
    if (Object.keys(loggingConfig).length > 0) {
      argsConfig.logging = loggingConfig;
    }
  }

  private addProgressConfigFromArgs(args: CliArgs, argsConfig: Partial<Config>): void {
    const progressConfig: any = {};
    if (args.progressEnabled !== undefined) progressConfig.enabled = args.progressEnabled;
    if (args.progressFile) progressConfig.file = args.progressFile;
    if (args.progressInterval) progressConfig.interval = args.progressInterval;
    if (args.progressDetailed !== undefined) progressConfig.detailed = args.progressDetailed;
    if (Object.keys(progressConfig).length > 0) {
      argsConfig.progress = progressConfig;
    }
  }

  private addResumeConfigFromArgs(args: CliArgs, argsConfig: Partial<Config>): void {
    const resumeConfig: any = {};
    if (args.resumeEnabled !== undefined) resumeConfig.enabled = args.resumeEnabled;
    if (args.resumeStateFile) resumeConfig.stateFile = args.resumeStateFile;
    if (args.resumeAutoSaveInterval) resumeConfig.autoSaveInterval = args.resumeAutoSaveInterval;
    if (Object.keys(resumeConfig).length > 0) {
      argsConfig.resume = resumeConfig;
    }
  }

  private addCallbackConfigFromArgs(args: CliArgs, argsConfig: Partial<Config>): void {
    const callbackConfig: any = {};
    if (args.callbackEnabled !== undefined) callbackConfig.enabled = args.callbackEnabled;
    if (args.callbackModulePath) callbackConfig.modulePath = args.callbackModulePath;
    if (Object.keys(callbackConfig).length > 0) {
      argsConfig.callbacks = callbackConfig;
    }
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
    const validationResult = this.validator.validate(this.config);
    const issues = [...validationResult.errors];

    const pushNumericIssue = (field: string, message: string, value: unknown): void => {
      issues.push({
        field,
        message,
        value,
        severity: "error",
      });
    };

    if (this.config.gitlab?.timeout !== undefined && this.config.gitlab.timeout <= 0) {
      pushNumericIssue("gitlab.timeout", "GitLab timeout must be positive", this.config.gitlab.timeout);
    }

    if (this.config.gitlab?.maxConcurrency !== undefined && this.config.gitlab.maxConcurrency <= 0) {
      pushNumericIssue("gitlab.maxConcurrency", "GitLab max concurrency must be positive", this.config.gitlab.maxConcurrency);
    }

    if (this.config.gitlab?.rateLimit !== undefined && this.config.gitlab.rateLimit <= 0) {
      pushNumericIssue("gitlab.rateLimit", "GitLab rate limit must be positive", this.config.gitlab.rateLimit);
    }

    if (this.config.database?.timeout !== undefined && this.config.database.timeout <= 0) {
      pushNumericIssue("database.timeout", "Database timeout must be positive", this.config.database.timeout);
    }

    if (this.config.progress?.interval !== undefined && this.config.progress.interval <= 0) {
      pushNumericIssue("progress.interval", "Progress interval must be positive", this.config.progress.interval);
    }

    if (this.config.resume?.autoSaveInterval !== undefined && this.config.resume.autoSaveInterval <= 0) {
      pushNumericIssue("resume.autoSaveInterval", "Resume auto-save interval must be positive", this.config.resume.autoSaveInterval);
    }

    const hasBlockingIssues = issues.some((issue) => issue.severity === "error");

    if (hasBlockingIssues) {
      throw ConfigurationValidationError.fromIssues(issues, validationResult.warnings);
    }

    if (validationResult.warnings.length > 0) {
      validationResult.warnings.forEach((warning) => this.logger.warn(warning));
    }

    this.logger.debug("Configuration validation passed");
  }

  getCurrentConfig(): Config {
    return this.config;
  }

  getLogger(): ReturnType<typeof createLogger> {
    return this.logger;
  }
}

/**
 * Create and load configuration
 */
export type LoadConfigOptions = {
  autoSetup?: boolean;
  preferredConfigPath?: string;
  wizardPrompter?: WizardPrompter;
  alwaysPromptCoreFields?: boolean;
};

const isInteractiveSession = (): boolean => Boolean(process.stdin?.isTTY && process.stdout?.isTTY);

export const loadConfig = async (args: CliArgs = {}, options: LoadConfigOptions = {}): Promise<Config> => {
  const loader = new ConfigLoader();

  try {
    const config = await loader.load(args);
    loader.validate();
    return config;
  } catch (error) {
    if (!(error instanceof ConfigurationValidationError)) {
      throw error instanceof Error ? error : new Error(String(error));
    }

    if (options.autoSetup === false || !isInteractiveSession()) {
      throw error;
    }

    loader.getLogger().warn("Configuration incomplete. Launching setup wizard...");

    const { runSetupWizard } = await import("./setupWizard.js");

    const wizardResult = await runSetupWizard({
      initialConfig: loader.getCurrentConfig(),
      issues: error.issues,
      preferredTargetPath: options.preferredConfigPath ?? args.config,
      prompter: options.wizardPrompter,
      alwaysPromptCoreFields: Boolean(options.alwaysPromptCoreFields),
      args,
    });

    if (wizardResult.status === "completed") {
      return loadConfig(args, { ...options, autoSetup: false });
    }

    loader.getLogger().warn(wizardResult.status === "aborted" ? "Setup wizard aborted by user." : "Setup wizard skipped; configuration remains incomplete.");
    throw error;
  }
};
