import type { Config } from "../../types.js";
import { GitlabConfigValidator } from "./gitlabValidator";

describe("GitlabConfigValidator", () => {
  let validator: GitlabConfigValidator;

  beforeEach(() => {
    validator = new GitlabConfigValidator();
  });

  describe("GitLab host validation", () => {
    it("should pass with valid HTTPS URL", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should pass with valid HTTP URL", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "http://gitlab.example.com",
          accessToken: "glpat-12345678901234567890",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail when host is missing", () => {
      const config: Partial<Config> = {
        gitlab: {
          accessToken: "glpat-12345678901234567890",
        } as any,
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("gitlab.host");
      expect(result.errors[0]?.message).toBe("GitLab host is required");
    });

    it("should fail when gitlab config is missing", () => {
      const config: Partial<Config> = {};

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some((e) => e.field === "gitlab.host")).toBe(true);
    });

    it("should fail with invalid URL", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "not-a-url",
          accessToken: "glpat-12345678901234567890",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("gitlab.host");
      expect(result.errors[0]?.message).toBe("Must be a valid URL");
      expect(result.errors[0]?.value).toBe("not-a-url");
    });

    it("should fail with invalid protocol", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "ftp://gitlab.com",
          accessToken: "glpat-12345678901234567890",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("gitlab.host");
      expect(result.errors[0]?.message).toBe("Must be a valid URL");
    });

    it("should pass with URL including port", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com:8080",
          accessToken: "glpat-12345678901234567890",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
    });

    it("should pass with URL including path", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com/api/v4",
          accessToken: "glpat-12345678901234567890",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
    });
  });

  describe("access token validation", () => {
    it("should pass with valid access token", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail when access token is missing and no OAuth2", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
        } as any,
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("gitlab.accessToken");
      expect(result.errors[0]?.message).toBe(
        "GitLab access token is required unless OAuth2 providers are configured"
      );
    });

    it("should pass when access token is missing but OAuth2 providers configured", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
        } as any,
        oauth2: {
          providers: {
            gitlab: {
              clientId: "client-id",
              clientSecret: "client-secret",
              authorizationUrl: "https://gitlab.com/oauth/authorize",
              tokenUrl: "https://gitlab.com/oauth/token",
              scopes: ["api"],
            },
          },
        } as any,
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail when access token is too short", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "short",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("gitlab.accessToken");
      expect(result.errors[0]?.message).toBe("Access token must be at least 20 characters");
    });

    it("should pass with exactly 20 character token", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "12345678901234567890",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
    });

    it("should fail when access token is not a string", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: 123 as any,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("gitlab.accessToken");
    });

    it("should fail when OAuth2 providers is empty object", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
        } as any,
        oauth2: {
          providers: {},
        } as any,
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("gitlab.accessToken");
    });
  });

  describe("timeout validation", () => {
    it("should pass with valid timeout", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          timeout: 30000,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should warn when timeout is below minimum", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          timeout: 500,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toBe("GitLab timeout should be between 1000ms and 300000ms");
    });

    it("should warn when timeout is above maximum", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          timeout: 400000,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toBe("GitLab timeout should be between 1000ms and 300000ms");
    });

    it("should pass when timeout is at minimum boundary", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          timeout: 1000,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should pass when timeout is at maximum boundary", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          timeout: 300000,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("max concurrency validation", () => {
    it("should pass with valid max concurrency", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          maxConcurrency: 5,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should not warn when max concurrency is 0 (falsy, skipped)", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          maxConcurrency: 0,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should warn when max concurrency is above maximum", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          maxConcurrency: 200,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toBe("GitLab max concurrency should be between 1 and 100");
    });

    it("should pass when max concurrency is at minimum boundary", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          maxConcurrency: 1,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should pass when max concurrency is at maximum boundary", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          maxConcurrency: 100,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("rate limit validation", () => {
    it("should pass with valid rate limit", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          rateLimit: 600,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should not warn when rate limit is 0 (falsy, skipped)", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          rateLimit: 0,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should warn when rate limit is above maximum", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          rateLimit: 3000,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toBe("GitLab rate limit should be between 1 and 2000 requests per minute");
    });

    it("should pass when rate limit is at minimum boundary", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          rateLimit: 1,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should pass when rate limit is at maximum boundary", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          rateLimit: 2000,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("combined validation scenarios", () => {
    it("should accumulate multiple errors", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "not-a-url",
          accessToken: "short",
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some((e) => e.field === "gitlab.host")).toBe(true);
      expect(result.errors.some((e) => e.field === "gitlab.accessToken")).toBe(true);
    });

    it("should only warn about timeout when maxConcurrency and rateLimit are 0", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          timeout: 500,
          maxConcurrency: 0,
          rateLimit: 0,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings).toContain("GitLab timeout should be between 1000ms and 300000ms");
    });

    it("should handle valid complete configuration", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
          accessToken: "glpat-12345678901234567890",
          timeout: 30000,
          maxConcurrency: 5,
          rateLimit: 600,
        },
      } as any;

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("should handle OAuth2 configuration without access token", () => {
      const config: Partial<Config> = {
        gitlab: {
          host: "https://gitlab.com",
        } as any,
        oauth2: {
          providers: {
            gitlab: {
              clientId: "client-id",
              clientSecret: "client-secret",
              authorizationUrl: "https://gitlab.com/oauth/authorize",
              tokenUrl: "https://gitlab.com/oauth/token",
              scopes: ["api"],
            },
          },
        } as any,
      };

      const result = validator.validate(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
