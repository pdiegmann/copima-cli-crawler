import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import * as yaml from "js-yaml";
import { homedir } from "os";
import { dirname, join } from "path";
import colors from "picocolors";
import treeify from "treeify";
import { ConfigurationValidationError } from "../../config/errors";
import { ConfigLoader, loadConfig } from "../../config/index";
import { runSetupWizard } from "../../config/setupWizard";
import type { CliArgs, Config } from "../../config/types";
import type { ConfigValidationError } from "../../config/validation/types";
import { createLogger } from "../../logging";

const logger = createLogger("ConfigCommands");

type ShowConfigFlags = {
  format?: string;
  section?: string;
  source?: boolean;
};

type SetConfigFlags = {
  global?: boolean;
  type?: string;
  key: string;
  value: string;
};

type UnsetConfigFlags = {
  global?: boolean;
  key: string;
};

type ValidateConfigFlags = {
  fix?: boolean;
  strict?: boolean;
};

type SetupConfigFlags = {
  config?: string;
  full?: boolean;
};

const GLOBAL_CONFIG_DIR = join(homedir(), ".config", "copima");
const GLOBAL_CONFIG_FILE = join(GLOBAL_CONFIG_DIR, "config.yaml");
const LOCAL_CONFIG_FILE = join(process.cwd(), "copima.yaml");

export const showConfig = async (flags: ShowConfigFlags): Promise<void | Error> => {
  logger.info(colors.cyan("🔧 Loading configuration..."));

  try {
    const config = await loadConfig();
    const format = flags.format || "table";

    let displayConfig = config;
    if (flags.section) {
      // @ts-expect-error - dynamic property access
      displayConfig = { [flags.section]: config[flags.section] };
    }

    if (format === "json") {
      console.log(JSON.stringify(displayConfig, null, 2));
    } else if (format === "yaml") {
      console.log(yaml.dump(displayConfig, { indent: 2 }));
    } else {
      // Table format using treeify
      console.log(colors.bold("\n🔧 Current Configuration:"));
      console.log(treeify.asTree(displayConfig as any, true, true));

      if (flags.source) {
        console.log(colors.dim("\n📍 Configuration Sources:"));
        console.log(colors.dim("  1. CLI arguments (highest priority)"));
        console.log(colors.dim("  2. Environment variables"));
        console.log(colors.dim(`  3. Global config: ${GLOBAL_CONFIG_FILE}`));
        console.log(colors.dim(`  4. Local config: ${LOCAL_CONFIG_FILE}`));
        console.log(colors.dim("  5. Built-in defaults (lowest priority)"));
      }
    }

    logger.info(colors.green("✅ Configuration loaded successfully"));
  } catch (error) {
    logger.error(colors.red("❌ Failed to load configuration"));
    logger.error(error instanceof Error ? error.message : String(error));
    return error instanceof Error ? error : new Error(String(error));
  }
};

export const setConfig = async (flags: SetConfigFlags): Promise<void | Error> => {
  const validationError = validateSetConfigFlags(flags);
  if (validationError) return validationError;

  const configFile = flags.global ? GLOBAL_CONFIG_FILE : LOCAL_CONFIG_FILE;
  const configType = flags.global ? "global" : "local";

  logger.info(colors.cyan(`🔧 Setting ${configType} configuration: ${colors.bold(flags.key)}`));

  try {
    ensureConfigDirectory(configFile);
    const config = loadExistingConfig(configFile);
    const parsedValue = parseConfigValue(flags.value, flags.type);

    setNestedProperty(config, flags.key, parsedValue);
    saveConfigFile(configFile, config);

    logConfigUpdateSuccess(configFile, flags.key, parsedValue);
  } catch (error) {
    logger.error(colors.red("❌ Failed to set configuration"));
    logger.error(error instanceof Error ? error.message : String(error));
    return error instanceof Error ? error : new Error(String(error));
  }
};

const validateSetConfigFlags = (flags: SetConfigFlags): Error | null => {
  if (!flags.key || !flags.value) {
    logger.error(colors.red("❌ Key and value are required"));
    return new Error("Key and value are required");
  }
  return null;
};

const ensureConfigDirectory = (configFile: string): void => {
  const configDir = dirname(configFile);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
};

const loadExistingConfig = (configFile: string): Record<string, unknown> => {
  if (!existsSync(configFile)) {
    return {};
  }

  const yamlContent = readFileSync(configFile, "utf8");
  return (yaml.load(yamlContent) as Record<string, unknown>) || {};
};

const parseConfigValue = (value: string, type?: string): any => {
  if (!type) return value;

  switch (type) {
    case "number": {
      const parsedNumber = parseFloat(value);
      if (isNaN(parsedNumber)) {
        throw new Error(`Invalid number value: ${value}`);
      }
      return parsedNumber;
    }
    case "boolean":
      return value.toLowerCase() === "true";
    case "string":
    default:
      return value;
  }
};

const saveConfigFile = (configFile: string, config: Record<string, unknown>): void => {
  const yamlContent = yaml.dump(config, { indent: 2 });
  writeFileSync(configFile, yamlContent, "utf8");
};

const logConfigUpdateSuccess = (configFile: string, key: string, value: any): void => {
  logger.info(colors.green("✅ Configuration updated successfully"));
  logger.info(`📁 File: ${colors.bold(configFile)}`);
  logger.info(`🔑 Key: ${colors.bold(key)}`);
  logger.info(`💾 Value: ${colors.bold(String(value))}`);
};

export const unsetConfig = async (flags: UnsetConfigFlags): Promise<void | Error> => {
  if (!flags.key) {
    logger.error(colors.red("❌ Key is required"));
    return new Error("Key is required");
  }

  const configFile = flags.global ? GLOBAL_CONFIG_FILE : LOCAL_CONFIG_FILE;
  const configType = flags.global ? "global" : "local";

  logger.info(colors.cyan(`🔧 Removing ${configType} configuration: ${colors.bold(flags.key)}`));

  try {
    if (!existsSync(configFile)) {
      logger.warn(colors.yellow(`⚠️  Configuration file does not exist: ${configFile}`));
      return;
    }

    // Load existing config
    const yamlContent = readFileSync(configFile, "utf8");
    const config = yaml.load(yamlContent) || {};

    // Remove nested property using dot notation
    const removed = unsetNestedProperty(config as Record<string, unknown>, flags.key);

    if (!removed) {
      logger.warn(colors.yellow(`⚠️  Configuration key not found: ${flags.key}`));
      return;
    }

    // Write back to file
    const newYamlContent = yaml.dump(config, { indent: 2 });
    writeFileSync(configFile, newYamlContent, "utf8");

    logger.info(colors.green("✅ Configuration key removed successfully"));
    logger.info(`📁 File: ${colors.bold(configFile)}`);
    logger.info(`🔑 Removed: ${colors.bold(flags.key)}`);
  } catch (error) {
    logger.error(colors.red("❌ Failed to remove configuration"));
    logger.error(error instanceof Error ? error.message : String(error));
    return error instanceof Error ? error : new Error(String(error));
  }
};

export const validateConfig = async (flags: ValidateConfigFlags): Promise<void | Error> => {
  logger.info(colors.cyan("🔍 Validating configuration..."));

  try {
    const config = await loadConfig();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Run all validation checks
    validateGitlabConfig(config, errors, warnings);
    validateDatabaseConfig(config, errors, warnings);
    validateOutputConfig(config, errors, warnings);
    validateLoggingConfig(config, errors, warnings);

    // Handle validation results
    const validationError = handleValidationResults(errors, warnings, flags);
    if (validationError) return validationError;

    handleAutoFix(flags);
  } catch (error) {
    logger.error(colors.red("❌ Failed to validate configuration"));
    logger.error(error instanceof Error ? error.message : String(error));
    return error instanceof Error ? error : new Error(String(error));
  }
};

export const setupConfig = async (flags: SetupConfigFlags): Promise<void | Error> => {
  const logger = createLogger("ConfigSetupCommand");
  const cliArgs: CliArgs = {};
  if (flags.config) {
    cliArgs.config = flags.config;
  }

  const loader = new ConfigLoader(logger);
  let initialConfig: Config | null = null;
  let validationIssues: ConfigValidationError[] = [];

  try {
    initialConfig = await loader.load(cliArgs);
    loader.validate();
  } catch (error) {
    if (error instanceof ConfigurationValidationError) {
      validationIssues = error.issues;
      initialConfig = loader.getCurrentConfig();
    } else {
      return error instanceof Error ? error : new Error(String(error));
    }
  }

  initialConfig = initialConfig ?? loader.getCurrentConfig();

  const wizardResult = await runSetupWizard({
    initialConfig,
    issues: validationIssues,
    preferredTargetPath: flags.config,
    alwaysPromptCoreFields: flags.full !== false,
  });

  if (wizardResult.status === "completed") {
    logger.info(colors.green("✅ Configuration updated"));
    try {
      await loadConfig(cliArgs, { autoSetup: false });
      logger.info(colors.cyan("Configuration validated successfully."));
    } catch (error) {
      logger.error(colors.red("Failed to validate configuration after setup"));
      return error instanceof Error ? error : new Error(String(error));
    }
    return;
  }

  if (wizardResult.status === "aborted") {
    logger.warn(colors.yellow("Setup wizard aborted by user."));
    return new Error("Setup wizard aborted by user");
  }

  logger.info(colors.yellow("Setup wizard skipped"));
};

const validateGitlabConfig = (config: any, errors: string[], warnings: string[]): void => {
  if (!config.gitlab) return;

  if (config.gitlab.host && !isValidUrl(config.gitlab.host)) {
    errors.push("gitlab.host must be a valid URL");
  }
  if (config.gitlab.accessToken && config.gitlab.accessToken.length < 20) {
    warnings.push("gitlab.accessToken appears to be too short (< 20 characters)");
  }
};

const validateDatabaseConfig = (config: any, errors: string[], warnings: string[]): void => {
  if (!config.database) return;

  if (config.database.path && !config.database.path.endsWith(".sqlite")) {
    warnings.push("database.path should end with .sqlite extension");
  }
};

const validateOutputConfig = (config: any, errors: string[], warnings: string[]): void => {
  if (!config.output) return;

  if (config.output.directory && !existsSync(dirname(config.output.directory))) {
    errors.push(`output.directory parent does not exist: ${dirname(config.output.directory)}`);
  }

  // Add potential warnings for output configuration
  if (config.output.format && !["json", "jsonl", "yaml"].includes(config.output.format)) {
    warnings.push(`output.format '${config.output.format}' is not a standard format (json, jsonl, yaml)`);
  }
};

const validateLoggingConfig = (config: any, errors: string[], _warnings: string[]): void => {
  if (!config.logging) return;

  const validLevels = ["error", "warn", "info", "debug"];
  if (config.logging.level && !validLevels.includes(config.logging.level)) {
    errors.push(`logging.level must be one of: ${validLevels.join(", ")}`);
  }
};

const handleValidationResults = (errors: string[], warnings: string[], flags: ValidateConfigFlags): Error | null => {
  if (errors.length === 0 && warnings.length === 0) {
    logger.info(colors.green("✅ Configuration is valid"));
    return null;
  }

  reportValidationIssues(errors, warnings);
  return checkValidationFailures(errors, warnings, flags);
};

const reportValidationIssues = (errors: string[], warnings: string[]): void => {
  if (errors.length > 0) {
    logger.error(colors.red(`❌ Found ${errors.length} error(s):`));
    errors.forEach((error) => logger.error(colors.red(`  • ${error}`)));
  }

  if (warnings.length > 0) {
    logger.warn(colors.yellow(`⚠️  Found ${warnings.length} warning(s):`));
    warnings.forEach((warning) => logger.warn(colors.yellow(`  • ${warning}`)));
  }
};

const checkValidationFailures = (errors: string[], warnings: string[], flags: ValidateConfigFlags): Error | null => {
  if (flags.strict && warnings.length > 0) {
    const error = new Error("Validation failed: warnings treated as errors in strict mode");
    logger.error(colors.red("❌ Failed to validate configuration"));
    logger.error(error.message);
    return error;
  }

  if (errors.length > 0) {
    const error = new Error("Validation failed: configuration has errors");
    logger.error(colors.red("❌ Failed to validate configuration"));
    logger.error(error.message);
    return error;
  }

  return null;
};

const handleAutoFix = (flags: ValidateConfigFlags): void => {
  if (flags.fix) {
    logger.warn(colors.yellow("⚠️  Auto-fix functionality not yet implemented"));
  }
};

// Helper functions

const setNestedProperty = (obj: Record<string, unknown>, path: string, value: unknown): void => {
  const keys = path.split(".");
  const lastKey = keys.pop()!;

  let current = obj;
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = (current as Record<string, unknown>)[key] as Record<string, unknown>;
  }

  current[lastKey] = value;
};

const unsetNestedProperty = (obj: Record<string, unknown>, path: string): boolean => {
  const keys = path.split(".");
  const lastKey = keys.pop()!;

  let current = obj;
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== "object") {
      return false; // Path doesn't exist
    }
    current = ((current as Record<string, unknown> | null)?.[key] ?? {}) as Record<string, unknown>;
  }

  if (lastKey in current) {
    delete current[lastKey];
    return true;
  }

  return false; // Key doesn't exist
};

const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
};
