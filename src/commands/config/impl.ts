import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import * as yaml from "js-yaml";
import { homedir } from "os";
import { dirname, join } from "path";
import colors from "picocolors";
import treeify from "treeify";
import { loadConfig } from "../../config/index";
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
  if (!flags.key || !flags.value) {
    logger.error(colors.red("❌ Key and value are required"));
    return new Error("Key and value are required");
  }

  const configFile = flags.global ? GLOBAL_CONFIG_FILE : LOCAL_CONFIG_FILE;
  const configType = flags.global ? "global" : "local";

  logger.info(colors.cyan(`🔧 Setting ${configType} configuration: ${colors.bold(flags.key)}`));

  try {
    // Ensure config directory exists
    const configDir = dirname(configFile);
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    // Load existing config or create new one
    let config: Record<string, unknown> = {} as Record<string, unknown>;
    if (existsSync(configFile)) {
      const yamlContent = readFileSync(configFile, "utf8");
      config = (yaml.load(yamlContent) as Record<string, unknown>) || {};
    }

    // Parse value based on type
    let parsedValue: any = flags.value;
    if (flags.type) {
      switch (flags.type) {
        case "number":
          parsedValue = parseFloat(flags.value);
          if (isNaN(parsedValue)) {
            throw new Error(`Invalid number value: ${flags.value}`);
          }
          break;
        case "boolean":
          parsedValue = flags.value.toLowerCase() === "true";
          break;
        case "string":
        default:
          parsedValue = flags.value;
          break;
      }
    }

    // Set nested property using dot notation
    setNestedProperty(config, flags.key, parsedValue);

    // Write back to file
    const yamlContent = yaml.dump(config, { indent: 2 });
    writeFileSync(configFile, yamlContent, "utf8");

    logger.info(colors.green("✅ Configuration updated successfully"));
    logger.info(`📁 File: ${colors.bold(configFile)}`);
    logger.info(`🔑 Key: ${colors.bold(flags.key)}`);
    logger.info(`💾 Value: ${colors.bold(String(parsedValue))}`);
  } catch (error) {
    logger.error(colors.red("❌ Failed to set configuration"));
    logger.error(error instanceof Error ? error.message : String(error));
    return error instanceof Error ? error : new Error(String(error));
  }
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

    // Validate GitLab configuration
    if (config.gitlab) {
      if (config.gitlab.host && !isValidUrl(config.gitlab.host)) {
        errors.push("gitlab.host must be a valid URL");
      }
      if (config.gitlab.accessToken && config.gitlab.accessToken.length < 20) {
        warnings.push("gitlab.accessToken appears to be too short (< 20 characters)");
      }
    }

    // Validate database configuration
    if (config.database) {
      if (config.database.path && !config.database.path.endsWith(".sqlite")) {
        warnings.push("database.path should end with .sqlite extension");
      }
    }

    // Validate output configuration
    if (config.output) {
      if (config.output.directory && !existsSync(dirname(config.output.directory))) {
        errors.push(`output.directory parent does not exist: ${dirname(config.output.directory)}`);
      }
    }

    // Validate logging configuration
    if (config.logging) {
      const validLevels = ["error", "warn", "info", "debug"];
      if (config.logging.level && !validLevels.includes(config.logging.level)) {
        errors.push(`logging.level must be one of: ${validLevels.join(", ")}`);
      }
    }

    // Report results
    if (errors.length === 0 && warnings.length === 0) {
      logger.info(colors.green("✅ Configuration is valid"));
    } else {
      if (errors.length > 0) {
        logger.error(colors.red(`❌ Found ${errors.length} error(s):`));
        errors.forEach((error) => logger.error(colors.red(`  • ${error}`)));
      }

      if (warnings.length > 0) {
        logger.warn(colors.yellow(`⚠️  Found ${warnings.length} warning(s):`));
        warnings.forEach((warning) => logger.warn(colors.yellow(`  • ${warning}`)));
      }

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
    }

    if (flags.fix) {
      logger.warn(colors.yellow("⚠️  Auto-fix functionality not yet implemented"));
    }
  } catch (error) {
    logger.error(colors.red("❌ Failed to validate configuration"));
    logger.error(error instanceof Error ? error.message : String(error));
    return error instanceof Error ? error : new Error(String(error));
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
