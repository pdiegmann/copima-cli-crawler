import { describe, expect, it } from "@jest/globals";
import type { Config } from "../../../config/types.js";
import { OutputConfigValidator } from "./outputValidator.js";

describe("OutputConfigValidator", () => {
  const validator = new OutputConfigValidator();

  describe("rootDir validation", () => {
    it("validates a valid rootDir", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "./output",
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns error when rootDir is missing", () => {
      const config: Partial<Config> = {
        output: {} as any,
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        field: "output.rootDir",
        message: "Output root directory is required",
        severity: "error",
      });
    });

    it("returns error when rootDir is empty string", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "   ",
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        field: "output.rootDir",
        message: "Root directory must be a non-empty string",
        severity: "error",
      });
    });

    it("returns error when rootDir is not a string", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: 123 as any,
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        field: "output.rootDir",
        message: "Root directory must be a non-empty string",
        value: 123,
        severity: "error",
      });
    });
  });

  describe("directory validation", () => {
    it("validates when directory is a valid string", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "./output",
          directory: "subdir",
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns error when directory is not a string", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "./output",
          directory: 456 as any,
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        field: "output.directory",
        message: "Output directory must be a string",
        value: 456,
        severity: "error",
      });
    });
  });

  describe("fileNaming validation", () => {
    it("validates lowercase file naming", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "./output",
          fileNaming: "lowercase",
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("validates kebab-case file naming", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "./output",
          fileNaming: "kebab-case",
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("validates snake_case file naming", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "./output",
          fileNaming: "snake_case",
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns error for invalid file naming convention", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "./output",
          fileNaming: "camelCase" as any,
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        field: "output.fileNaming",
        message: "File naming must be one of: lowercase, kebab-case, snake_case",
        value: "camelCase",
        severity: "error",
      });
    });
  });

  describe("prettyPrint validation", () => {
    it("validates when prettyPrint is true", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "./output",
          prettyPrint: true,
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toBe("Pretty print is enabled which may impact performance for large datasets");
    });

    it("validates when prettyPrint is false", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "./output",
          prettyPrint: false,
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("returns error when prettyPrint is not a boolean", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "./output",
          prettyPrint: "yes" as any,
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        field: "output.prettyPrint",
        message: "Pretty print must be a boolean",
        value: "yes",
        severity: "error",
      });
    });
  });

  describe("compression validation", () => {
    it("validates none compression", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "./output",
          compression: "none",
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("validates gzip compression", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "./output",
          compression: "gzip",
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("validates brotli compression", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "./output",
          compression: "brotli",
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns error for invalid compression type", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "./output",
          compression: "zip" as any,
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        field: "output.compression",
        message: "Compression type must be one of: none, gzip, brotli",
        value: "zip",
        severity: "error",
      });
    });
  });

  describe("comprehensive validation", () => {
    it("validates a fully configured output section", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "./output",
          directory: "data",
          fileNaming: "kebab-case",
          prettyPrint: false,
          compression: "gzip",
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("aggregates multiple errors", () => {
      const config: Partial<Config> = {
        output: {
          rootDir: "",
          directory: 123 as any,
          fileNaming: "invalid" as any,
          prettyPrint: "yes" as any,
          compression: "zip" as any,
        },
      };
      const result = validator.validate(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(5);
    });

    it("handles missing output section", () => {
      const config: Partial<Config> = {};
      const result = validator.validate(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("output.rootDir");
    });
  });
});
