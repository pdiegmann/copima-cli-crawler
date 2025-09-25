import type { Config } from "../../types.js";
import type { BaseValidator, ConfigValidationError, ValidationResult } from "../types.js";

export class LoggingConfigValidator implements BaseValidator {
  validate(config: Partial<Config>): ValidationResult {
    const errors: ConfigValidationError[] = [];
    const warnings: string[] = [];

    // Validate log level
    if (config.logging?.level) {
      const validLevels = ["error", "warn", "info", "debug"];
      if (!validLevels.includes(config.logging.level)) {
        errors.push({
          field: "logging.level",
          message: `Log level must be one of: ${validLevels.join(", ")}`,
          value: config.logging.level,
          severity: "error",
        });
      }
    } else {
      errors.push({
        field: "logging.level",
        message: "Log level is required",
        severity: "error",
      });
    }

    // Validate log format
    if (config.logging?.format) {
      const validFormats = ["json", "simple", "combined"];
      if (!validFormats.includes(config.logging.format)) {
        errors.push({
          field: "logging.format",
          message: `Log format must be one of: ${validFormats.join(", ")}`,
          value: config.logging.format,
          severity: "error",
        });
      }
    }

    // Validate log file path
    if (config.logging?.file && typeof config.logging.file !== "string") {
      errors.push({
        field: "logging.file",
        message: "Log file path must be a string",
        value: config.logging.file,
        severity: "error",
      });
    }

    // Validate console setting
    if (config.logging?.console !== undefined && typeof config.logging.console !== "boolean") {
      errors.push({
        field: "logging.console",
        message: "Console logging must be a boolean",
        value: config.logging.console,
        severity: "error",
      });
    }

    // Validate colors setting
    if (config.logging?.colors !== undefined && typeof config.logging.colors !== "boolean") {
      errors.push({
        field: "logging.colors",
        message: "Colors setting must be a boolean",
        value: config.logging.colors,
        severity: "error",
      });
    }

    // Warning for colors in non-interactive environments
    if (config.logging?.colors === true && process.env["NO_COLOR"]) {
      warnings.push("Console colors are enabled but NO_COLOR environment variable is set");
    }

    // Warning for debug level in production
    if (config.logging?.level === "debug" && process.env["NODE_ENV"] === "production") {
      warnings.push("Debug logging level is not recommended for production environments");
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}
