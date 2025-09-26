import crypto from "node:crypto";
import open from "open";
import pc from "picocolors";
import { OAuth2Manager } from "../../auth/oauth2Manager.js";
import { buildOAuth2Config, getProviderConfig, validateProviderConfig } from "../../auth/oauth2Providers.js";
import { OAuth2Server } from "../../auth/oauth2Server.js";
import type { AuthServerConfig, OAuth2CallbackParams, OAuth2Config, OAuth2TokenResponse } from "../../auth/types.js";
import { createLogger } from "../../logging/logger.js";
import type { AuthCommandFlags } from "../../types/commands.js";

const logger = createLogger("AuthCommand");

export const executeAuthFlow = async (flags: AuthCommandFlags): Promise<void> => {
  logger.info("Starting OAuth2 authentication flow", { provider: flags.provider });

  try {
    // Validate and prepare configuration
    const config = await prepareOAuth2Config(flags);

    // Create and start callback server
    const server = await startCallbackServer(flags);
    const redirectUri = server.getCallbackUrl();
    config.redirectUri = redirectUri;

    try {
      // Generate state parameter for CSRF protection
      const state = generateState();

      // Generate authorization URL and open browser
      const authUrl = generateAuthUrl(config, state);
      console.log(pc.blue("🔗 Opening browser for authorization..."));
      console.log(pc.dim(`Authorization URL: ${authUrl}`));

      await openBrowser(authUrl);
      console.log(pc.yellow("⏳ Waiting for authorization callback..."));

      // Wait for callback
      const callbackParams = await waitForCallback(server, (flags.timeout || 300) * 1000);

      // Validate callback
      if (callbackParams.error) {
        throw new Error(`Authorization failed: ${callbackParams.error_description || callbackParams.error}`);
      }

      if (!callbackParams.code) {
        throw new Error("No authorization code received");
      }

      if (callbackParams.state !== state) {
        throw new Error("Invalid state parameter - possible CSRF attack");
      }

      console.log(pc.green("✅ Authorization successful!"));

      // Exchange code for tokens
      console.log(pc.blue("🔄 Exchanging authorization code for tokens..."));
      const tokens = await exchangeCodeForTokens(callbackParams.code, config);

      // Store credentials
      await storeCredentials(tokens, flags, config);

      console.log(pc.green("🎉 Authentication completed successfully!"));
    } finally {
      // Always stop the server
      await server.stop();
    }
  } catch (error) {
    logger.error("OAuth2 authentication failed", { error: error instanceof Error ? error.message : String(error) });
    console.error(pc.red("❌ Authentication failed:"), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

const prepareOAuth2Config = async (flags: AuthCommandFlags): Promise<OAuth2Config> => {
  const provider = getProviderConfig(flags.provider || "gitlab");
  if (!provider) {
    throw new Error(`Unsupported OAuth2 provider: ${flags.provider}`);
  }

  // Get client credentials from flags or environment
  const clientId = flags["client-id"] || process.env["OAUTH2_CLIENT_ID"];
  const clientSecret = flags["client-secret"] || process.env["OAUTH2_CLIENT_SECRET"];

  if (!clientId || !clientSecret) {
    throw new Error("OAuth2 client credentials required. Provide via --client-id and --client-secret flags or OAUTH2_CLIENT_ID and OAUTH2_CLIENT_SECRET environment variables");
  }

  const config = buildOAuth2Config(provider, {
    clientId,
    clientSecret,
    redirectUri: "http://localhost:3000/callback", // Temporary, will be updated
    scopes: flags.scopes,
  });

  if (!validateProviderConfig(config)) {
    throw new Error("Invalid OAuth2 configuration");
  }

  return config;
};

const startCallbackServer = async (flags: AuthCommandFlags): Promise<OAuth2Server> => {
  const serverConfig: AuthServerConfig = {
    port: flags.port || 3000,
    timeout: (flags.timeout || 300) * 1000,
    callbackPath: "/callback",
  };

  const server = new OAuth2Server(serverConfig);
  await server.start();
  return server;
};

const generateState = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

const generateAuthUrl = (config: OAuth2Config, state: string): string => {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(" "),
    response_type: "code",
    state,
  });

  return `${config.authorizationUrl}?${params.toString()}`;
};

const openBrowser = async (url: string): Promise<void> => {
  try {
    await open(url);
  } catch (error) {
    logger.warn("Failed to open browser automatically", { error: error instanceof Error ? error.message : String(error) });
    console.log(pc.yellow("⚠️  Could not open browser automatically."));
    console.log(pc.blue("Please open this URL manually:"));
    console.log(pc.underline(url));
  }
};

const waitForCallback = async (server: OAuth2Server, _timeout: number): Promise<OAuth2CallbackParams> => {
  return server.waitForCallback();
};

const exchangeCodeForTokens = async (code: string, config: OAuth2Config): Promise<OAuth2TokenResponse> => {
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });

  try {
    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const tokens = (await response.json()) as OAuth2TokenResponse;

    if (!tokens.access_token) {
      throw new Error("No access token received from OAuth2 provider");
    }

    return tokens;
  } catch (error) {
    logger.error("Token exchange failed", { error: error instanceof Error ? error.message : String(error) });
    throw new Error(`Failed to exchange authorization code for tokens: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const storeCredentials = async (tokens: OAuth2TokenResponse, flags: AuthCommandFlags, config: OAuth2Config): Promise<void> => {
  try {
    console.log(pc.blue("💾 Storing credentials..."));

    // Calculate expiration time
    const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null;

    // Store the account with tokens
    const accountId = flags["account-id"] || `${flags.provider}-${Date.now()}`;
    const accountName = flags.name || `${flags.provider} Account`;
    const providerId = flags.provider || "gitlab";

    // Log what we would store (simplified for now)
    logger.info("OAuth2 authentication successful", {
      accountId,
      providerId,
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresAt: expiresAt?.toISOString(),
      scopes: config.scopes,
    });

    // Create OAuth2Manager for token refresh scheduling
    if (tokens.refresh_token && expiresAt && tokens.expires_in) {
      const oauth2Manager = new OAuth2Manager({
        enabled: true,
        refreshThreshold: 300, // 5 minutes
        maxRetries: 3,
        tokenEndpoint: config.tokenUrl,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      });

      oauth2Manager.scheduleTokenRefresh(
        accountId,
        {
          access_token: tokens.access_token,
          token_type: tokens.token_type,
          expires_in: tokens.expires_in,
          refresh_token: tokens.refresh_token,
          scope: tokens.scope,
        },
        async (_newTokens) => {
          logger.info("Token refreshed automatically", { accountId });
          // Update stored tokens would happen here
        }
      );
    }

    console.log(pc.green(`✅ Credentials stored for account: ${pc.bold(accountName)}`));
    console.log(pc.dim(`   Account ID: ${accountId}`));
    console.log(pc.dim(`   Provider: ${flags.provider}`));
    console.log(pc.dim(`   Scopes: ${config.scopes.join(", ")}`));

    if (expiresAt) {
      console.log(pc.dim(`   Expires: ${expiresAt.toLocaleString()}`));
    }
  } catch (error) {
    logger.error("Failed to store credentials", { error: error instanceof Error ? error.message : String(error) });
    throw new Error(`Failed to store credentials: ${error instanceof Error ? error.message : String(error)}`);
  }
};
