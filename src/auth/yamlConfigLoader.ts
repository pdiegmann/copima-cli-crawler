import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { parse } from "yaml";
import { createLogger } from "../logging/index.js";
import type { OAuth2ConfigFile, OAuth2ProviderYamlConfig } from "./configTypes.js";
import { getProviderConfig } from "./oauth2Providers.js";
import type { AuthServerConfig, OAuth2Config } from "./types.js";

const logger = createLogger("yaml-config-loader");

export class OAuth2YamlConfigLoader {
  private configCache: Map<string, OAuth2ConfigFile> = new Map();

  /**
   * Load OAuth2 configuration from YAML file
   */
  loadConfig(configPath: string): OAuth2ConfigFile {
    const resolvedPath = resolve(configPath);

    // Check cache first
    if (this.configCache.has(resolvedPath)) {
      return this.configCache.get(resolvedPath)!;
    }

    if (!existsSync(resolvedPath)) {
      throw new Error(`OAuth2 configuration file not found: ${resolvedPath}`);
    }

    try {
      const content = readFileSync(resolvedPath, "utf8");
      const config = parse(content) as OAuth2ConfigFile;

      // Validate basic structure
      this.validateConfig(config);

      // Cache the configuration
      this.configCache.set(resolvedPath, config);

      logger.info(`Loaded OAuth2 configuration from ${resolvedPath}`);
      return config;
    } catch (error) {
      logger.error(`Failed to load OAuth2 configuration from ${resolvedPath}:`, { error });
      throw new Error(`Invalid OAuth2 configuration file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get OAuth2 provider configuration from YAML
   */
  getProviderFromYaml(config: OAuth2ConfigFile, providerName?: string): OAuth2Config {
    const oauth2Config = config.auth?.oauth2;
    if (!oauth2Config) {
      throw new Error("No OAuth2 configuration found in YAML file");
    }

    // Use specified provider or default provider
    const targetProvider = providerName || oauth2Config.defaultProvider;
    if (!targetProvider) {
      throw new Error("No provider specified and no default provider configured");
    }

    // Find provider in configuration
    const providerConfig = oauth2Config.providers.find((p) => p.name === targetProvider);
    if (!providerConfig) {
      throw new Error(`Provider '${targetProvider}' not found in configuration`);
    }

    return this.buildOAuth2Config(providerConfig);
  }

  /**
   * Get server configuration from YAML
   */
  getServerConfigFromYaml(config: OAuth2ConfigFile): Partial<AuthServerConfig> {
    const serverConfig = config.auth?.oauth2?.server;
    if (!serverConfig) {
      return {};
    }

    return {
      port: serverConfig.port,
      timeout: serverConfig.timeout ? serverConfig.timeout * 1000 : undefined, // Convert to milliseconds
      callbackPath: serverConfig.callbackPath,
    };
  }

  /**
   * Get list of available providers from YAML
   */
  getAvailableProviders(config: OAuth2ConfigFile): string[] {
    const oauth2Config = config.auth?.oauth2;
    if (!oauth2Config?.providers) {
      return [];
    }

    return oauth2Config.providers.map((p) => p.name);
  }

  /**
   * Clear configuration cache
   */
  clearCache(): void {
    this.configCache.clear();
  }

  private validateConfig(config: OAuth2ConfigFile): void {
    if (!config.auth?.oauth2) {
      throw new Error("Missing auth.oauth2 configuration section");
    }

    const oauth2Config = config.auth.oauth2;

    if (!oauth2Config.providers || !Array.isArray(oauth2Config.providers)) {
      throw new Error("Missing or invalid auth.oauth2.providers array");
    }

    if (oauth2Config.providers.length === 0) {
      throw new Error("No OAuth2 providers configured");
    }

    // Validate each provider
    for (const provider of oauth2Config.providers) {
      this.validateProvider(provider);
    }

    // Validate default provider exists
    if (oauth2Config.defaultProvider) {
      const defaultExists = oauth2Config.providers.some((p) => p.name === oauth2Config.defaultProvider);
      if (!defaultExists) {
        throw new Error(`Default provider '${oauth2Config.defaultProvider}' not found in providers list`);
      }
    }
  }

  private validateProvider(provider: OAuth2ProviderYamlConfig): void {
    if (!provider.name) {
      throw new Error("Provider name is required");
    }

    if (!provider.clientId) {
      throw new Error(`Provider '${provider.name}' is missing clientId`);
    }

    if (!provider.clientSecret) {
      throw new Error(`Provider '${provider.name}' is missing clientSecret`);
    }
  }

  private buildOAuth2Config(yamlProvider: OAuth2ProviderYamlConfig): OAuth2Config {
    // Try to get built-in provider configuration first
    const providerConfig = getProviderConfig(yamlProvider.name);
    let baseConfig: OAuth2Config;

    if (providerConfig) {
      // Use built-in provider configuration
      baseConfig = {
        clientId: "",
        clientSecret: "",
        authorizationUrl: providerConfig.authorizationUrl,
        tokenUrl: providerConfig.tokenUrl,
        scopes: providerConfig.defaultScopes,
        redirectUri: "http://localhost:3000/callback",
      };
    } else {
      // If not a built-in provider, create a minimal config
      if (!yamlProvider.authorizationUrl || !yamlProvider.tokenUrl) {
        throw new Error(`Custom provider '${yamlProvider.name}' must specify authorizationUrl and tokenUrl`);
      }

      baseConfig = {
        clientId: "",
        clientSecret: "",
        authorizationUrl: yamlProvider.authorizationUrl,
        tokenUrl: yamlProvider.tokenUrl,
        scopes: yamlProvider.scopes || [],
        redirectUri: yamlProvider.redirectUri || "http://localhost:3000/callback",
      };
    }

    // Override with YAML configuration
    return {
      ...baseConfig,
      clientId: yamlProvider.clientId,
      clientSecret: yamlProvider.clientSecret,
      authorizationUrl: yamlProvider.authorizationUrl || baseConfig.authorizationUrl,
      tokenUrl: yamlProvider.tokenUrl || baseConfig.tokenUrl,
      scopes: yamlProvider.scopes || baseConfig.scopes,
      redirectUri: yamlProvider.redirectUri || baseConfig.redirectUri,
    };
  }
}

// Export singleton instance
export const oauth2YamlConfigLoader = new OAuth2YamlConfigLoader();
