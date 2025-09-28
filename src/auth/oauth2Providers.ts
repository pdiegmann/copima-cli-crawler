import type { OAuth2Config, OAuth2Provider } from "./types.js";

const OAUTH2_PROVIDERS: Record<string, OAuth2Provider> = {
  gitlab: {
    name: "GitLab",
    authorizationUrl: "https://gitlab.com/oauth/authorize",
    tokenUrl: "https://gitlab.com/oauth/token",
    defaultScopes: ["api", "read_user"],
  },
  github: {
    name: "GitHub",
    authorizationUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    defaultScopes: ["repo", "user"],
  },
};

export const getProviderConfig = (provider: string): OAuth2Provider | null => {
  if (!provider) {
    return null;
  }
  return OAUTH2_PROVIDERS[provider.toLowerCase()] || null;
};

export const getSupportedProviders = (): string[] => {
  return Object.keys(OAUTH2_PROVIDERS);
};

export const validateProviderConfig = (config: OAuth2Config): boolean => {
  return !!(config.clientId && config.clientSecret && config.authorizationUrl && config.tokenUrl && config.redirectUri && Array.isArray(config.scopes));
};

export const buildOAuth2Config = (
  provider: OAuth2Provider,
  options: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes?: string[];
  }
): OAuth2Config => {
  return {
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    authorizationUrl: provider.authorizationUrl,
    tokenUrl: provider.tokenUrl,
    scopes: options.scopes || provider.defaultScopes,
    redirectUri: options.redirectUri,
  };
};
