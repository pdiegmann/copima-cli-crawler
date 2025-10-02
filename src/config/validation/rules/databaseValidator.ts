import type { Config } from "../../types.js";
import type { BaseValidator, ConfigValidationError, ValidationResult } from "../types.js";

export class DatabaseConfigValidator implements BaseValidator {
  validate(config: Partial<Config>): ValidationResult {
    const errors: ConfigValidationError[] = [];
    const warnings: string[] = [];

    // Validate database path
    if (config.database?.path) {
      if (typeof config.database.path !== "string" || config.database.path.trim().length === 0) {
        errors.push({
          field: "database.path",
          message: "Database path must be a non-empty string",
          value: config.database.path,
          severity: "error",
        });
      }
    } else {
      errors.push({
        field: "database.path",
        message: "Database path is required",
        severity: "error",
      });
    }

    // Validate WAL mode setting
    if (config.database?.walMode !== undefined && typeof config.database.walMode !== "boolean") {
      errors.push({
        field: "database.walMode",
        message: "WAL mode must be a boolean",
        value: config.database.walMode,
        severity: "error",
      });
    }

    // Validate timeout settings
    if (config.database?.timeout && (config.database.timeout < 1000 || config.database.timeout > 60000)) {
      warnings.push("Database timeout should be between 1000ms and 60000ms");
    }

    // Validate database path extension
    if (config.database?.path && !config.database.path.endsWith(".yaml") && !config.database.path.endsWith(".yml")) {
      warnings.push("Database file should have .yaml or .yml extension");
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}
