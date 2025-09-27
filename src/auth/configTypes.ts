/**
 * OAuth2 YAML configuration types
 */

export type OAuth2ProviderYamlConfig = {
  name: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  redirectUri?: string;
};

export type OAuth2ServerYamlConfig = {
  port?: number;
  timeout?: number;
  callbackPath?: string;
};

export type OAuth2YamlConfig = {
  providers: OAuth2ProviderYamlConfig[];
  server?: OAuth2ServerYamlConfig;
  defaultProvider?: string;
};

export type AuthYamlConfig = {
  oauth2: OAuth2YamlConfig;
};

export type OAuth2ConfigFile = {
  auth?: AuthYamlConfig;
  // Allow for other top-level configurations
  [key: string]: unknown;
};
