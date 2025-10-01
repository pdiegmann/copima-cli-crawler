import type { ConfigValidationError } from "./validation/types.js";

export class ConfigurationValidationError extends Error {
  readonly issues: ConfigValidationError[];
  readonly warnings: string[];

  constructor(message: string, issues: ConfigValidationError[], warnings: string[] = []) {
    super(message);
    this.name = "ConfigurationValidationError";
    this.issues = issues;
    this.warnings = warnings;
  }

  static fromIssues(issues: ConfigValidationError[], warnings: string[] = []): ConfigurationValidationError {
    const errorFields = issues.filter((issue) => issue.severity === "error").map((issue) => issue.field);
    const description = errorFields.length > 0 ? `Missing or invalid configuration values: ${errorFields.join(", ")}` : "Configuration validation failed";
    return new ConfigurationValidationError(description, issues, warnings);
  }
}
