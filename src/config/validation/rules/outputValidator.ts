import type { Config } from "../../types.js";
import type { BaseValidator, ConfigValidationError, ValidationResult } from "../types.js";

export class OutputConfigValidator implements BaseValidator {
  validate(config: Partial<Config>): ValidationResult {
    const errors: ConfigValidationError[] = [];
    const warnings: string[] = [];

    // Validate root directory
    if (config.output?.rootDir) {
      if (typeof config.output.rootDir !== "string" || config.output.rootDir.trim().length === 0) {
        errors.push({
          field: "output.rootDir",
          message: "Root directory must be a non-empty string",
          value: config.output.rootDir,
          severity: "error",
        });
      }
    } else {
      errors.push({
        field: "output.rootDir",
        message: "Output root directory is required",
        severity: "error",
      });
    }

    // Validate directory
    if (config.output?.directory && typeof config.output.directory !== "string") {
      errors.push({
        field: "output.directory",
        message: "Output directory must be a string",
        value: config.output.directory,
        severity: "error",
      });
    }

    // Validate file naming convention
    if (config.output?.fileNaming) {
      const validNamingConventions = ["lowercase", "kebab-case", "snake_case"];
      if (!validNamingConventions.includes(config.output.fileNaming)) {
        errors.push({
          field: "output.fileNaming",
          message: `File naming must be one of: ${validNamingConventions.join(", ")}`,
          value: config.output.fileNaming,
          severity: "error",
        });
      }
    }

    // Validate pretty print setting
    if (config.output?.prettyPrint !== undefined && typeof config.output.prettyPrint !== "boolean") {
      errors.push({
        field: "output.prettyPrint",
        message: "Pretty print must be a boolean",
        value: config.output.prettyPrint,
        severity: "error",
      });
    }

    // Validate compression setting
    if (config.output?.compression) {
      const validCompressionTypes = ["none", "gzip", "brotli"];
      if (!validCompressionTypes.includes(config.output.compression)) {
        errors.push({
          field: "output.compression",
          message: `Compression type must be one of: ${validCompressionTypes.join(", ")}`,
          value: config.output.compression,
          severity: "error",
        });
      }
    }

    // Performance warning for pretty print
    if (config.output?.prettyPrint === true) {
      warnings.push("Pretty print is enabled which may impact performance for large datasets");
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}
