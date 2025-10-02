import type { Config } from "../../types.js";
import { LoggingConfigValidator } from "./loggingValidator";

describe("LoggingConfigValidator", () => {
  let validator: LoggingConfigValidator;
  const originalEnv = process.env;

  beforeEach(() => {
    validator = new LoggingConfigValidator();
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("log level validation", () => {
    it("should pass with valid error level", () => {
      const config: Partial<Config> = {
        logging: {
          level: "error",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should pass with valid warn level", () => {
      const config: Partial<Config> = {
        logging: {
          level: "warn",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
    });

    it("should pass with valid info level", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
    });

    it("should pass with valid debug level", () => {
      const config: Partial<Config> = {
        logging: {
          level: "debug",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
    });

    it("should fail when log level is missing", () => {
      const config: Partial<Config> = {
        logging: {} as any,
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("logging.level");
      expect(result.errors[0]?.message).toBe("Log level is required");
    });

    it("should fail when logging config is missing", () => {
      const config: Partial<Config> = {};

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("logging.level");
    });

    it("should fail with invalid log level", () => {
      const config: Partial<Config> = {
        logging: {
          level: "invalid" as any,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("logging.level");
      expect(result.errors[0]?.message).toBe("Log level must be one of: error, warn, info, debug");
      expect(result.errors[0]?.value).toBe("invalid");
    });

    it("should fail with verbose level (not supported)", () => {
      const config: Partial<Config> = {
        logging: {
          level: "verbose" as any,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.message).toContain("error, warn, info, debug");
    });
  });

  describe("log format validation", () => {
    it("should pass with valid json format", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          format: "json",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should pass with valid simple format", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          format: "simple",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
    });

    it("should pass with valid combined format", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          format: "combined",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
    });

    it("should pass when format is not specified", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
    });

    it("should fail with invalid format", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          format: "invalid" as any,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("logging.format");
      expect(result.errors[0]?.message).toBe("Log format must be one of: json, simple, combined");
      expect(result.errors[0]?.value).toBe("invalid");
    });

    it("should fail with pretty format (not supported)", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          format: "pretty" as any,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.message).toContain("json, simple, combined");
    });
  });

  describe("log file validation", () => {
    it("should pass with valid file path", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          file: "/path/to/log.txt",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should pass when file is not specified", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
    });

    it("should fail when file is not a string", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          file: 123 as any,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("logging.file");
      expect(result.errors[0]?.message).toBe("Log file path must be a string");
      expect(result.errors[0]?.value).toBe(123);
    });

    it("should fail when file is an object", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          file: { path: "/path/to/log.txt" } as any,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.field).toBe("logging.file");
    });

    it("should pass with relative file path", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          file: "./logs/app.log",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
    });
  });

  describe("console settings validation", () => {
    it("should pass with console enabled", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          console: true,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should pass with console disabled", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          console: false,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
    });

    it("should pass when console is not specified", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
    });

    it("should fail when console is not a boolean", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          console: "true" as any,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("logging.console");
      expect(result.errors[0]?.message).toBe("Console logging must be a boolean");
      expect(result.errors[0]?.value).toBe("true");
    });

    it("should fail when console is a number", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          console: 1 as any,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.field).toBe("logging.console");
    });
  });

  describe("color settings validation", () => {
    it("should pass with colors enabled", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          colors: true,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should pass with colors disabled", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          colors: false,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
    });

    it("should pass when colors is not specified", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
    });

    it("should fail when colors is not a boolean", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          colors: "true" as any,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("logging.colors");
      expect(result.errors[0]?.message).toBe("Colors setting must be a boolean");
      expect(result.errors[0]?.value).toBe("true");
    });

    it("should fail when colors is a number", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          colors: 1 as any,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.field).toBe("logging.colors");
    });
  });

  describe("environment warnings", () => {
    it("should warn when colors enabled with NO_COLOR env", () => {
      process.env["NO_COLOR"] = "1";

      const config: Partial<Config> = {
        logging: {
          level: "info",
          colors: true,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toBe("Console colors are enabled but NO_COLOR environment variable is set");
    });

    it("should not warn when colors disabled with NO_COLOR env", () => {
      process.env["NO_COLOR"] = "1";

      const config: Partial<Config> = {
        logging: {
          level: "info",
          colors: false,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should warn when debug level in production", () => {
      process.env["NODE_ENV"] = "production";

      const config: Partial<Config> = {
        logging: {
          level: "debug",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toBe("Debug logging level is not recommended for production environments");
    });

    it("should not warn when debug level in development", () => {
      process.env["NODE_ENV"] = "development";

      const config: Partial<Config> = {
        logging: {
          level: "debug",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should not warn when info level in production", () => {
      process.env["NODE_ENV"] = "production";

      const config: Partial<Config> = {
        logging: {
          level: "info",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should accumulate multiple warnings", () => {
      process.env["NO_COLOR"] = "1";
      process.env["NODE_ENV"] = "production";

      const config: Partial<Config> = {
        logging: {
          level: "debug",
          colors: true,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings).toContain("Console colors are enabled but NO_COLOR environment variable is set");
      expect(result.warnings).toContain("Debug logging level is not recommended for production environments");
    });
  });

  describe("combined validation scenarios", () => {
    it("should accumulate multiple errors", () => {
      const config: Partial<Config> = {
        logging: {
          level: "invalid" as any,
          format: "invalid" as any,
          file: 123 as any,
          console: "true" as any,
          colors: "false" as any,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(5);
      expect(result.errors.some((e) => e.field === "logging.level")).toBe(true);
      expect(result.errors.some((e) => e.field === "logging.format")).toBe(true);
      expect(result.errors.some((e) => e.field === "logging.file")).toBe(true);
      expect(result.errors.some((e) => e.field === "logging.console")).toBe(true);
      expect(result.errors.some((e) => e.field === "logging.colors")).toBe(true);
    });

    it("should handle valid complete configuration", () => {
      const config: Partial<Config> = {
        logging: {
          level: "info",
          format: "json",
          file: "/var/log/app.log",
          console: true,
          colors: false,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("should handle minimal valid configuration", () => {
      const config: Partial<Config> = {
        logging: {
          level: "error",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
