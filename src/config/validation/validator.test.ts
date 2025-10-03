import { describe, expect, it } from "@jest/globals";
import type { Config } from "../types.js";
import { ConfigValidator } from "./validator.js";

describe("ConfigValidator", () => {
  const validator = new ConfigValidator();

  it("validates a valid configuration", () => {
    const config: Partial<Config> = {
      gitlab: {
        host: "https://gitlab.com",
        timeout: 30000,
        maxConcurrency: 10,
        rateLimit: 600,
        accessToken: "glpat-12345678901234567890",
      },
      database: {
        path: "./data.db",
        timeout: 5000,
      },
      output: {
        rootDir: "./output",
      },
      logging: {
        level: "info",
      },
    };

    const result = validator.validate(config);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("validates and returns errors for invalid configuration", () => {
    const config: Partial<Config> = {
      gitlab: {
        host: "", // Invalid
        accessToken: "",
      } as any,
    };

    const result = validator.validate(config);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("validates specific section (gitlab)", () => {
    const config: Partial<Config> = {
      gitlab: {
        host: "https://gitlab.com",
        timeout: 30000,
        maxConcurrency: 10,
        rateLimit: 600,
        accessToken: "glpat-12345678901234567890",
      },
    };

    const result = validator.validateSection(config, "gitlab");
    expect(result.isValid).toBe(true);
  });

  it("validates specific section (database)", () => {
    const config: Partial<Config> = {
      database: {
        path: "./data.db",
        timeout: 5000,
      },
    };

    const result = validator.validateSection(config, "database");
    expect(result.isValid).toBe(true);
  });

  it("validates specific section (output)", () => {
    const config: Partial<Config> = {
      output: {
        rootDir: "./output",
      },
    };

    const result = validator.validateSection(config, "output");
    expect(result.isValid).toBe(true);
  });

  it("validates specific section (logging)", () => {
    const config: Partial<Config> = {
      logging: {
        level: "info",
      },
    };

    const result = validator.validateSection(config, "logging");
    expect(result.isValid).toBe(true);
  });

  it("returns error for unknown section", () => {
    const config: Partial<Config> = {};

    const result = validator.validateSection(config, "unknown");
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toContain("No validator found for section");
    expect(result.errors[0]?.field).toBe("unknown");
  });

  it("aggregates errors from multiple validators", () => {
    const config: Partial<Config> = {
      gitlab: {
        host: "", // Invalid
        accessToken: "",
      } as any,
      database: {
        path: "", // Invalid
      } as any,
    };

    const result = validator.validate(config);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it("aggregates warnings from validators", () => {
    const config: Partial<Config> = {
      gitlab: {
        host: "https://gitlab.com",
        timeout: 30000,
        maxConcurrency: 10,
        rateLimit: 600,
        accessToken: "glpat-12345678901234567890",
      },
      database: {
        path: "./data.db",
        timeout: 5000,
      },
      output: {
        rootDir: "./output",
      },
      logging: {
        level: "info",
      },
    };

    const result = validator.validate(config);
    expect(result.warnings).toBeDefined();
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("filters out warning-level errors when checking validity", () => {
    const config: Partial<Config> = {
      gitlab: {
        host: "https://gitlab.com",
        timeout: 30000,
        maxConcurrency: 10,
        rateLimit: 600,
        accessToken: "glpat-12345678901234567890",
      },
    };

    const result = validator.validate(config);
    // Should be valid even if there are warnings, as long as no error-level issues
    const hasErrorLevelIssues = result.errors.some((e) => e.severity === "error");
    expect(result.isValid).toBe(!hasErrorLevelIssues);
  });
});
