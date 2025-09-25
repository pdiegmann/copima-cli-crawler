import type { Config } from "../types.js";
import { DatabaseConfigValidator } from "./rules/databaseValidator";
import { GitlabConfigValidator } from "./rules/gitlabValidator";
import { LoggingConfigValidator } from "./rules/loggingValidator";
import { OutputConfigValidator } from "./rules/outputValidator";
import type { ConfigValidationError, ValidationResult } from "./types.js";

export class ConfigValidator {
  private readonly validators = [new GitlabConfigValidator(), new DatabaseConfigValidator(), new OutputConfigValidator(), new LoggingConfigValidator()];

  validate(config: Partial<Config>): ValidationResult {
    const allErrors: ConfigValidationError[] = [];
    const allWarnings: string[] = [];

    for (const validator of this.validators) {
      const result = validator.validate(config);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    return {
      isValid: allErrors.filter((e) => e.severity === "error").length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  validateSection(config: Partial<Config>, section: string): ValidationResult {
    const validator = this.validators.find((v) => v.constructor.name.toLowerCase().includes(section.toLowerCase()));
    if (!validator) {
      return {
        isValid: false,
        errors: [
          {
            field: section,
            message: `No validator found for section: ${section}`,
            severity: "error",
          },
        ],
        warnings: [],
      };
    }
    return validator.validate(config);
  }
}
