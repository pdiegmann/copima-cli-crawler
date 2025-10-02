import type { Config } from "../../types.js";
import type { BaseValidator, ConfigValidationError, ValidationResult } from "../types.js";

export class GitlabConfigValidator implements BaseValidator {
  validate(config: Partial<Config>): ValidationResult {
    const errors: ConfigValidationError[] = [];
    const warnings: string[] = [];

    // Validate GitLab host
    if (config.gitlab?.host) {
      if (!this.isValidUrl(config.gitlab.host)) {
        errors.push({
          field: "gitlab.host",
          message: "Must be a valid URL",
          value: config.gitlab.host,
          severity: "error",
        });
      }
    } else {
      errors.push({
        field: "gitlab.host",
        message: "GitLab host is required",
        severity: "error",
      });
    }

    // Validate access token
    const hasOauthProviders = Boolean(config.oauth2 && Object.keys(config.oauth2.providers ?? {}).length > 0);

    if (config.gitlab?.accessToken) {
      if (typeof config.gitlab.accessToken !== "string" || config.gitlab.accessToken.length < 20) {
        errors.push({
          field: "gitlab.accessToken",
          message: "Access token must be at least 20 characters",
          severity: "error",
        });
      }
    } else if (!hasOauthProviders) {
      errors.push({
        field: "gitlab.accessToken",
        message: "GitLab access token is required unless OAuth2 providers are configured",
        severity: "error",
      });
    }

    // Validate timeout settings
    if (config.gitlab?.timeout && (config.gitlab.timeout < 1000 || config.gitlab.timeout > 300000)) {
      warnings.push("GitLab timeout should be between 1000ms and 300000ms");
    }

    // Validate max concurrency
    if (config.gitlab?.maxConcurrency && (config.gitlab.maxConcurrency < 1 || config.gitlab.maxConcurrency > 100)) {
      warnings.push("GitLab max concurrency should be between 1 and 100");
    }

    // Validate rate limit
    if (config.gitlab?.rateLimit && (config.gitlab.rateLimit < 1 || config.gitlab.rateLimit > 2000)) {
      warnings.push("GitLab rate limit should be between 1 and 2000 requests per minute");
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}
