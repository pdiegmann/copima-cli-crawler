import type { Config } from "../../types.js";
import { DatabaseConfigValidator } from "./databaseValidator";

describe("DatabaseConfigValidator", () => {
  let validator: DatabaseConfigValidator;

  beforeEach(() => {
    validator = new DatabaseConfigValidator();
  });

  describe("database path validation", () => {
    it("should pass with valid database path", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database.yaml",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail when database path is missing", () => {
      const config: Partial<Config> = {
        database: {} as any,
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("database.path");
      expect(result.errors[0]?.message).toBe("Database path is required");
      expect(result.errors[0]?.severity).toBe("error");
    });

    it("should fail when database config is missing", () => {
      const config: Partial<Config> = {};

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("database.path");
      expect(result.errors[0]?.message).toBe("Database path is required");
    });

    it("should fail when database path is empty string", () => {
      const config: Partial<Config> = {
        database: {
          path: "",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("database.path");
      expect(result.errors[0]?.message).toBe("Database path is required");
    });

    it("should fail when database path is whitespace only", () => {
      const config: Partial<Config> = {
        database: {
          path: "   ",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toBe("Database path must be a non-empty string");
    });
  });

  describe("WAL mode validation", () => {
    it("should pass with valid WAL mode boolean true", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database.yaml",
          walMode: true,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should pass with valid WAL mode boolean false", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database.yaml",
          walMode: false,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should pass when WAL mode is undefined", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database.yaml",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail when WAL mode is not a boolean", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database.yaml",
          walMode: "true" as any,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("database.walMode");
      expect(result.errors[0]?.message).toBe("WAL mode must be a boolean");
      expect(result.errors[0]?.value).toBe("true");
    });

    it("should fail when WAL mode is a number", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database.yaml",
          walMode: 1 as any,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toBe("WAL mode must be a boolean");
    });
  });

  describe("timeout validation", () => {
    it("should pass with valid timeout", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database.yaml",
          timeout: 5000,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should warn when timeout is below minimum", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database.yaml",
          timeout: 500,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toBe("Database timeout should be between 1000ms and 60000ms");
    });

    it("should warn when timeout is above maximum", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database.yaml",
          timeout: 70000,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toBe("Database timeout should be between 1000ms and 60000ms");
    });

    it("should pass when timeout is at minimum boundary", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database.yaml",
          timeout: 1000,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should pass when timeout is at maximum boundary", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database.yaml",
          timeout: 60000,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("database path extension validation", () => {
    it("should pass without warning for .yaml extension", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database.yaml",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should pass without warning for .yml extension", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database.yml",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should warn for non-yaml extension", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database.sqlite",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toBe("Database file should have .yaml or .yml extension");
    });

    it("should warn for path without extension", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toBe("Database file should have .yaml or .yml extension");
    });
  });

  describe("combined validation scenarios", () => {
    it("should accumulate multiple errors", () => {
      const config: Partial<Config> = {
        database: {
          path: "",
          walMode: "invalid" as any,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some((e) => e.field === "database.path")).toBe(true);
      expect(result.errors.some((e) => e.field === "database.walMode")).toBe(true);
    });

    it("should accumulate multiple warnings", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database.db",
          timeout: 500,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings).toContain("Database timeout should be between 1000ms and 60000ms");
      expect(result.warnings).toContain("Database file should have .yaml or .yml extension");
    });

    it("should handle valid complete configuration", () => {
      const config: Partial<Config> = {
        database: {
          path: "/path/to/database.yaml",
          walMode: true,
          timeout: 5000,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
