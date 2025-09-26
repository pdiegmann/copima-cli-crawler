export type OAuth2Config = {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
};

export type OAuth2CallbackParams = {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
};

export type OAuth2TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

export type AuthServerConfig = {
  port: number;
  timeout: number;
  callbackPath: string;
};

export type OAuth2Provider = {
  name: string;
  authorizationUrl: string;
  tokenUrl: string;
  defaultScopes: string[];
};
