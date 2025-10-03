import { existsSync, readFileSync } from "fs";
import type { OAuth2ConfigFile } from "./configTypes";
import { getProviderConfig } from "./oauth2Providers";
import { OAuth2YamlConfigLoader } from "./yamlConfigLoader";

jest.mock("fs");
jest.mock("./oauth2Providers");

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockGetProviderConfig = getProviderConfig as jest.MockedFunction<typeof getProviderConfig>;

describe("OAuth2YamlConfigLoader", () => {
  let loader: OAuth2YamlConfigLoader;

  beforeEach(() => {
    loader = new OAuth2YamlConfigLoader();
    jest.clearAllMocks();
  });

  describe("loadConfig", () => {
    it("should load valid YAML configuration", () => {
      const yamlContent = `
auth:
  oauth2:
    defaultProvider: gitlab
    providers:
      - name: gitlab
        clientId: test-client-id
        clientSecret: test-client-secret
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(yamlContent);

      const config = loader.loadConfig("/path/to/config.yaml");

      expect(config.auth?.oauth2?.providers).toHaveLength(1);
      expect(config.auth?.oauth2?.providers[0]?.name).toBe("gitlab");
    });

    it("should cache configuration after first load", () => {
      const yamlContent = `
auth:
  oauth2:
    providers:
      - name: gitlab
        clientId: test-id
        clientSecret: test-secret
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(yamlContent);

      loader.loadConfig("/path/to/config.yaml");
      loader.loadConfig("/path/to/config.yaml");

      expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    });

    it("should throw error when file does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => loader.loadConfig("/nonexistent.yaml")).toThrow(
        "OAuth2 configuration file not found"
      );
    });

    it("should throw error for invalid YAML syntax", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("invalid: yaml: syntax:");

      expect(() => loader.loadConfig("/path/to/config.yaml")).toThrow(
        "Invalid OAuth2 configuration file"
      );
    });

    it("should throw error when auth.oauth2 section is missing", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("some:\n  other: config");

      expect(() => loader.loadConfig("/path/to/config.yaml")).toThrow(
        "Missing auth.oauth2 configuration section"
      );
    });

    it("should throw error when providers array is missing", () => {
      const yamlContent = `
auth:
  oauth2:
    defaultProvider: gitlab
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(yamlContent);

      expect(() => loader.loadConfig("/path/to/config.yaml")).toThrow(
        "Missing or invalid auth.oauth2.providers array"
      );
    });

    it("should throw error when providers array is empty", () => {
      const yamlContent = `
auth:
  oauth2:
    providers: []
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(yamlContent);

      expect(() => loader.loadConfig("/path/to/config.yaml")).toThrow(
        "No OAuth2 providers configured"
      );
    });

    it("should throw error when provider is missing name", () => {
      const yamlContent = `
auth:
  oauth2:
    providers:
      - clientId: test-id
        clientSecret: test-secret
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(yamlContent);

      expect(() => loader.loadConfig("/path/to/config.yaml")).toThrow(
        "Provider name is required"
      );
    });

    it("should throw error when provider is missing clientId", () => {
      const yamlContent = `
auth:
  oauth2:
    providers:
      - name: gitlab
        clientSecret: test-secret
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(yamlContent);

      expect(() => loader.loadConfig("/path/to/config.yaml")).toThrow(
        "Provider 'gitlab' is missing clientId"
      );
    });

    it("should throw error when provider is missing clientSecret", () => {
      const yamlContent = `
auth:
  oauth2:
    providers:
      - name: gitlab
        clientId: test-id
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(yamlContent);

      expect(() => loader.loadConfig("/path/to/config.yaml")).toThrow(
        "Provider 'gitlab' is missing clientSecret"
      );
    });

    it("should throw error when default provider does not exist", () => {
      const yamlContent = `
auth:
  oauth2:
    defaultProvider: nonexistent
    providers:
      - name: gitlab
        clientId: test-id
        clientSecret: test-secret
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(yamlContent);

      expect(() => loader.loadConfig("/path/to/config.yaml")).toThrow(
        "Default provider 'nonexistent' not found in providers list"
      );
    });
  });

  describe("getProviderFromYaml", () => {
    const validConfig: OAuth2ConfigFile = {
      auth: {
        oauth2: {
          defaultProvider: "gitlab",
          providers: [
            {
              name: "gitlab",
              clientId: "test-client-id",
              clientSecret: "test-client-secret",
            },
            {
              name: "github",
              clientId: "github-client-id",
              clientSecret: "github-client-secret",
            },
          ],
        },
      },
    };

    it("should get default provider when no provider name specified", () => {
      mockGetProviderConfig.mockReturnValue({
        name: "GitLab",
        authorizationUrl: "https://gitlab.com/oauth/authorize",
        tokenUrl: "https://gitlab.com/oauth/token",
        defaultScopes: ["api", "read_user"],
      });

      const oauth2Config = loader.getProviderFromYaml(validConfig);

      expect(oauth2Config.clientId).toBe("test-client-id");
      expect(oauth2Config.clientSecret).toBe("test-client-secret");
    });

    it("should get specified provider", () => {
      mockGetProviderConfig.mockReturnValue({
        name: "GitHub",
        authorizationUrl: "https://github.com/login/oauth/authorize",
        tokenUrl: "https://github.com/login/oauth/access_token",
        defaultScopes: ["repo", "user"],
      });

      const oauth2Config = loader.getProviderFromYaml(validConfig, "github");

      expect(oauth2Config.clientId).toBe("github-client-id");
      expect(oauth2Config.clientSecret).toBe("github-client-secret");
    });

    it("should throw error when no OAuth2 configuration in YAML", () => {
      const invalidConfig: OAuth2ConfigFile = { auth: {} as any };

      expect(() => loader.getProviderFromYaml(invalidConfig)).toThrow(
        "No OAuth2 configuration found in YAML file"
      );
    });

    it("should throw error when no provider specified and no default", () => {
      const configNoDefault: OAuth2ConfigFile = {
        auth: {
          oauth2: {
            providers: [
              {
                name: "gitlab",
                clientId: "test-id",
                clientSecret: "test-secret",
              },
            ],
          },
        },
      };

      expect(() => loader.getProviderFromYaml(configNoDefault)).toThrow(
        "No provider specified and no default provider configured"
      );
    });

    it("should throw error when specified provider not found", () => {
      expect(() => loader.getProviderFromYaml(validConfig, "nonexistent")).toThrow(
        "Provider 'nonexistent' not found in configuration"
      );
    });

    it("should handle custom provider with URLs", () => {
      mockGetProviderConfig.mockReturnValue(null);

      const customConfig: OAuth2ConfigFile = {
        auth: {
          oauth2: {
            providers: [
              {
                name: "custom",
                clientId: "custom-id",
                clientSecret: "custom-secret",
                authorizationUrl: "https://custom.com/oauth/authorize",
                tokenUrl: "https://custom.com/oauth/token",
                scopes: ["read", "write"],
                redirectUri: "http://localhost:4000/callback",
              },
            ],
          },
        },
      };

      const oauth2Config = loader.getProviderFromYaml(customConfig, "custom");

      expect(oauth2Config.authorizationUrl).toBe("https://custom.com/oauth/authorize");
      expect(oauth2Config.tokenUrl).toBe("https://custom.com/oauth/token");
      expect(oauth2Config.scopes).toEqual(["read", "write"]);
      expect(oauth2Config.redirectUri).toBe("http://localhost:4000/callback");
    });

    it("should throw error for custom provider without authorizationUrl", () => {
      mockGetProviderConfig.mockReturnValue(null);

      const customConfig: OAuth2ConfigFile = {
        auth: {
          oauth2: {
            providers: [
              {
                name: "custom",
                clientId: "custom-id",
                clientSecret: "custom-secret",
                tokenUrl: "https://custom.com/oauth/token",
              },
            ],
          },
        },
      };

      expect(() => loader.getProviderFromYaml(customConfig, "custom")).toThrow(
        "Custom provider 'custom' must specify authorizationUrl and tokenUrl"
      );
    });
  });

  describe("getServerConfigFromYaml", () => {
    it("should return server configuration", () => {
      const config: OAuth2ConfigFile = {
        auth: {
          oauth2: {
            providers: [
              {
                name: "gitlab",
                clientId: "test-id",
                clientSecret: "test-secret",
              },
            ],
            server: {
              port: 4000,
              timeout: 30,
              callbackPath: "/custom/callback",
            },
          },
        },
      };

      const serverConfig = loader.getServerConfigFromYaml(config);

      expect(serverConfig.port).toBe(4000);
      expect(serverConfig.timeout).toBe(30000);
      expect(serverConfig.callbackPath).toBe("/custom/callback");
    });

    it("should return empty object when no server configuration", () => {
      const config: OAuth2ConfigFile = {
        auth: {
          oauth2: {
            providers: [
              {
                name: "gitlab",
                clientId: "test-id",
                clientSecret: "test-secret",
              },
            ],
          },
        },
      };

      const serverConfig = loader.getServerConfigFromYaml(config);

      expect(serverConfig).toEqual({});
    });

    it("should handle partial server configuration", () => {
      const config: OAuth2ConfigFile = {
        auth: {
          oauth2: {
            providers: [
              {
                name: "gitlab",
                clientId: "test-id",
                clientSecret: "test-secret",
              },
            ],
            server: {
              port: 5000,
            },
          },
        },
      };

      const serverConfig = loader.getServerConfigFromYaml(config);

      expect(serverConfig.port).toBe(5000);
      expect(serverConfig.timeout).toBeUndefined();
      expect(serverConfig.callbackPath).toBeUndefined();
    });
  });

  describe("getAvailableProviders", () => {
    it("should return list of provider names", () => {
      const config: OAuth2ConfigFile = {
        auth: {
          oauth2: {
            providers: [
              {
                name: "gitlab",
                clientId: "test-id-1",
                clientSecret: "test-secret-1",
              },
              {
                name: "github",
                clientId: "test-id-2",
                clientSecret: "test-secret-2",
              },
              {
                name: "google",
                clientId: "test-id-3",
                clientSecret: "test-secret-3",
              },
            ],
          },
        },
      };

      const providers = loader.getAvailableProviders(config);

      expect(providers).toEqual(["gitlab", "github", "google"]);
    });

    it("should return empty array when no providers", () => {
      const config: OAuth2ConfigFile = { auth: {} as any };

      const providers = loader.getAvailableProviders(config);

      expect(providers).toEqual([]);
    });

    it("should return empty array when providers is undefined", () => {
      const config: OAuth2ConfigFile = {
        auth: {
          oauth2: {} as any,
        },
      };

      const providers = loader.getAvailableProviders(config);

      expect(providers).toEqual([]);
    });
  });

  describe("clearCache", () => {
    it("should clear configuration cache", () => {
      const yamlContent = `
auth:
  oauth2:
    providers:
      - name: gitlab
        clientId: test-id
        clientSecret: test-secret
`;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(yamlContent);

      loader.loadConfig("/path/to/config.yaml");
      loader.clearCache();
      loader.loadConfig("/path/to/config.yaml");

      expect(mockReadFileSync).toHaveBeenCalledTimes(2);
    });
  });
});
