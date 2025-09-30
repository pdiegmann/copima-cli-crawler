import crypto from "node:crypto";
import open from "open";
import pc from "picocolors";
import { OAuth2Manager } from "../../auth/oauth2Manager.js";
import { buildOAuth2Config, getProviderConfig, validateProviderConfig } from "../../auth/oauth2Providers.js";
import { OAuth2Server } from "../../auth/oauth2Server.js";
import type { AuthServerConfig, OAuth2CallbackParams, OAuth2Config, OAuth2TokenResponse } from "../../auth/types.js";
import { loadConfig } from "../../config/loader.js";
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
  // Try to load config from various sources in priority order
  if (!flags.config) {
    const configFromMainApp = await tryLoadMainAppConfig(flags);
    if (configFromMainApp) return configFromMainApp;

    const configPath = await findOAuth2ConfigFile();
    if (configPath) {
      flags.config = configPath;
    } else {
      logger.info("No OAuth2 config found, using command-line flags and environment variables only");
    }
  }

  // Handle explicit config file or auto-discovered config
  if (flags.config) {
    return await loadConfigFromFile(flags);
  } else {
    return await buildConfigFromFlags(flags);
  }
};

const tryLoadMainAppConfig = async (flags: AuthCommandFlags): Promise<OAuth2Config | null> => {
  try {
    const mainConfig = await loadConfig({ config: undefined });
    if (mainConfig.oauth2?.providers && Object.keys(mainConfig.oauth2.providers).length > 0) {
      logger.info("Using OAuth2 configuration from main application config");
      return buildConfigFromProvider(flags, mainConfig.oauth2.providers);
    }
  } catch (error) {
    logger.debug("Main config does not contain valid OAuth2 settings", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return null;
};

const findOAuth2ConfigFile = async (): Promise<string | null> => {
  const { existsSync } = await import("fs");
  const commonPaths = ["./oauth2-config.yml", "./config/oauth2-config.yml", "./examples/oauth2-config.yml", "./examples/test-configs/basic-test.yaml"];

  for (const path of commonPaths) {
    if (existsSync(path)) {
      logger.info(`Found OAuth2 config at: ${path}`);
      return path;
    }
  }
  return null;
};

const buildConfigFromProvider = (flags: AuthCommandFlags, providers: Record<string, any>): OAuth2Config => {
  const provider = flags.provider || "gitlab";
  const providerConfig = providers[provider];

  if (!providerConfig) {
    const availableProviders = Object.keys(providers);
    throw new Error(`Provider '${provider}' not found. Available providers: ${availableProviders.join(", ")}`);
  }

  const config: OAuth2Config = {
    clientId: flags["client-id"] || providerConfig.clientId,
    clientSecret: flags["client-secret"] || providerConfig.clientSecret,
    redirectUri: flags["redirect-uri"] || providerConfig.redirectUri || "http://localhost:3000/callback",
    authorizationUrl: providerConfig.authorizationUrl,
    tokenUrl: providerConfig.tokenUrl,
    scopes: flags.scopes ? flags.scopes.split(",").map((s) => s.trim()) : providerConfig.scopes || [],
  };

  if (!validateProviderConfig(config)) {
    throw new Error("Invalid OAuth2 configuration");
  }

  return config;
};

const loadConfigFromFile = async (flags: AuthCommandFlags): Promise<OAuth2Config> => {
  logger.info(`Loading OAuth2 configuration from ${flags.config}`);

  // Try unified config format first
  const unifiedConfig = await tryLoadUnifiedConfig(flags);
  if (unifiedConfig) return unifiedConfig;

  // Fall back to legacy YAML format
  return await loadLegacyYamlConfig(flags);
};

const tryLoadUnifiedConfig = async (flags: AuthCommandFlags): Promise<OAuth2Config | null> => {
  try {
    const mainConfig = await loadConfig({ config: flags.config });
    if (mainConfig.oauth2?.providers && Object.keys(mainConfig.oauth2.providers).length > 0) {
      logger.info(`Using unified config from ${flags.config}`);
      return buildConfigFromProvider(flags, mainConfig.oauth2.providers);
    }
  } catch (error) {
    logger.debug("Failed to load unified config, trying legacy format", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return null;
};

const loadLegacyYamlConfig = async (flags: AuthCommandFlags): Promise<OAuth2Config> => {
  const { oauth2YamlConfigLoader } = await import("../../auth/yamlConfigLoader.js");
  const yamlConfig = oauth2YamlConfigLoader.loadConfig(flags.config!);
  let config = oauth2YamlConfigLoader.getProviderFromYaml(yamlConfig, flags.provider);

  // Override YAML config with command-line flags
  config = {
    ...config,
    ...(flags["client-id"] && { clientId: flags["client-id"] }),
    ...(flags["client-secret"] && { clientSecret: flags["client-secret"] }),
    ...(flags.scopes && { scopes: flags.scopes.split(",").map((s) => s.trim()) }),
    ...(flags["redirect-uri"] && { redirectUri: flags["redirect-uri"] }),
  };

  if (!validateProviderConfig(config)) {
    throw new Error("Invalid OAuth2 configuration from YAML file");
  }

  return config;
};

const buildConfigFromFlags = async (flags: AuthCommandFlags): Promise<OAuth2Config> => {
  const provider = getProviderConfig(flags.provider || "gitlab");
  if (!provider) {
    throw new Error(`Unsupported OAuth2 provider: ${flags.provider}`);
  }

  const clientId = flags["client-id"] || process.env["OAUTH2_CLIENT_ID"];
  const clientSecret = flags["client-secret"] || process.env["OAUTH2_CLIENT_SECRET"];

  if (!clientId || !clientSecret) {
    throw new Error(
      "OAuth2 client credentials required. Provide via --client-id and --client-secret flags, OAUTH2_CLIENT_ID and OAUTH2_CLIENT_SECRET environment variables, or use --config to specify a YAML configuration file"
    );
  }

  const config = buildOAuth2Config(provider, {
    clientId,
    clientSecret,
    redirectUri: "http://localhost:3000/callback",
    scopes: flags.scopes ? flags.scopes.split(",").map((s) => s.trim()) : undefined,
  });

  if (!validateProviderConfig(config)) {
    throw new Error("Invalid OAuth2 configuration");
  }

  return config;
};

const startCallbackServer = async (flags: AuthCommandFlags): Promise<OAuth2Server> => {
  let serverConfig: AuthServerConfig = {
    port: flags.port ? parseInt(flags.port, 10) : 3000,
    timeout: (flags.timeout ? parseInt(flags.timeout, 10) : 300) * 1000,
    callbackPath: "/callback",
  };

  // Try to get server config from unified config first
  if (!flags.config) {
    try {
      const mainConfig = await loadConfig({ config: undefined });
      if (mainConfig.oauth2?.server) {
        const oauth2Server = mainConfig.oauth2.server;
        serverConfig = {
          port: flags.port ? parseInt(flags.port, 10) : oauth2Server.port || 3000,
          timeout: (flags.timeout ? parseInt(flags.timeout, 10) : oauth2Server.timeout || 300) * 1000,
          callbackPath: oauth2Server.callbackPath || "/callback",
        };
        logger.debug("Using OAuth2 server config from main application config");
      }
    } catch {
      logger.debug("No OAuth2 server config found in main config, using defaults");
    }
  }

  // Check if YAML configuration is provided and load server config
  if (flags.config) {
    try {
      // Try unified config format first
      const mainConfig = await loadConfig({ config: flags.config });
      if (mainConfig.oauth2?.server) {
        const oauth2Server = mainConfig.oauth2.server;
        serverConfig = {
          port: flags.port ? parseInt(flags.port, 10) : oauth2Server.port || 3000,
          timeout: (flags.timeout ? parseInt(flags.timeout, 10) : oauth2Server.timeout || 300) * 1000,
          callbackPath: oauth2Server.callbackPath || "/callback",
        };
        logger.debug("Using OAuth2 server config from unified config file");
      }
    } catch {
      logger.debug("Failed to load unified config, trying legacy OAuth2 config format");

      // Fall back to legacy format
      const { oauth2YamlConfigLoader } = await import("../../auth/yamlConfigLoader.js");
      const yamlConfig = oauth2YamlConfigLoader.loadConfig(flags.config);
      const yamlServerConfig = oauth2YamlConfigLoader.getServerConfigFromYaml(yamlConfig);

      // Merge YAML config with command-line flags (flags take precedence)
      serverConfig = {
        port: flags.port ? parseInt(flags.port, 10) : yamlServerConfig.port || 3000,
        timeout: (flags.timeout ? parseInt(flags.timeout, 10) : yamlServerConfig.timeout ? yamlServerConfig.timeout / 1000 : 300) * 1000,
        callbackPath: yamlServerConfig.callbackPath || "/callback",
      };
    }
  }

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

    const databaseAvailable = await initializeDatabaseConnection();
    const credentialData = await prepareCredentialData(tokens, flags, config);

    if (databaseAvailable) {
      await storeCredentialsInDatabase(credentialData, tokens, config);
    } else {
      logCredentialsUnavailable(credentialData, tokens);
    }

    await setupTokenRefreshIfNeeded(tokens, credentialData.accountId, config);
    displaySuccessMessage(credentialData, tokens.expires_in);
  } catch (error) {
    logger.error("Failed to store credentials in database", { error: error instanceof Error ? error.message : String(error) });
    throw new Error(`Failed to store credentials: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const initializeDatabaseConnection = async (): Promise<boolean> => {
  try {
    const { initDatabase, initializeDatabase } = await import("../../db/index.js");
    const databaseConfig = {
      path: "./database.sqlite",
      wal: true,
      timeout: 5000,
    };

    initDatabase(databaseConfig);
    initializeDatabase({ ...databaseConfig, migrationsFolder: "./drizzle" });
    return true;
  } catch (error) {
    logger.error("Database initialization failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(pc.yellow("⚠️  Database unavailable - showing credentials without storing:"));
    return false;
  }
};

const prepareCredentialData = async (
  tokens: OAuth2TokenResponse,
  flags: AuthCommandFlags,
  config: OAuth2Config
): Promise<{
  userId: string;
  accountId: string;
  providerId: string;
  userName: string;
  userEmail: string;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  now: Date;
}> => {
  const { randomUUID } = await import("node:crypto");

  const accessTokenExpiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null;
  const refreshTokenExpiresAt = null; // GitLab refresh tokens typically don't expire

  const userId = randomUUID();
  const accountId = flags["account-id"] || randomUUID();
  const providerId = flags.provider || "gitlab";
  const now = new Date();

  const userInfo = await fetchUserInfoFromOAuth(tokens, config);
  const userName = flags.name || userInfo?.name || `${providerId} User`;
  const userEmail = flags.email || userInfo?.email || `${userId}@${providerId}.local`;

  return {
    userId,
    accountId,
    providerId,
    userName,
    userEmail,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    now,
  };
};

const fetchUserInfoFromOAuth = async (tokens: OAuth2TokenResponse, config: OAuth2Config): Promise<{ name: string; email: string } | null> => {
  try {
    const userResponse = await fetch(`${config.tokenUrl.replace("/oauth/token", "/api/v4/user")}`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/json",
      },
    });

    if (userResponse.ok) {
      const userData = (await userResponse.json()) as any;
      return {
        name: userData.name || userData.username || "Unknown User",
        email: userData["email"] || `${userData.username}@gitlab.local`,
      };
    }
  } catch (error) {
    logger.warn("Failed to fetch user info, using defaults", { error: error instanceof Error ? error.message : String(error) });
  }
  return null;
};

const storeCredentialsInDatabase = async (credentialData: any, tokens: OAuth2TokenResponse, config: OAuth2Config): Promise<void> => {
  const { db } = await import("../../db/index.js");
  const { user, account } = await import("../../db/schema.js");
  const { randomUUID } = await import("node:crypto");
  const { eq } = await import("drizzle-orm");

  // Store user in database
  await db()
    .insert(user)
    .values({
      name: credentialData.userName,
      email: credentialData.userEmail,
      emailVerified: false,
      createdAt: credentialData.now,
      updatedAt: credentialData.now,
    })
    .onConflictDoUpdate({
      target: user.email,
      set: {
        name: credentialData.userName,
        updatedAt: credentialData.now,
      },
    });

  // Get the actual user ID (in case of conflict resolution)
  const [existingUser] = await db().select({ id: user.id }).from(user).where(eq(user.email, credentialData.userEmail)).limit(1);
  const finalUserId = existingUser?.id || credentialData.userId;

  // Store account credentials in database
  await db()
    .insert(account)
    .values({
      id: randomUUID(),
      accountId: credentialData.accountId,
      providerId: credentialData.providerId,
      userId: finalUserId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      accessTokenExpiresAt: credentialData.accessTokenExpiresAt,
      refreshTokenExpiresAt: credentialData.refreshTokenExpiresAt,
      scope: config.scopes.join(" "),
      createdAt: credentialData.now,
      updatedAt: credentialData.now,
    });

  logger.info("OAuth2 authentication successful - credentials stored in database", {
    accountId: credentialData.accountId,
    providerId: credentialData.providerId,
    userName: credentialData.userName,
    userEmail: credentialData.userEmail,
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    expiresAt: credentialData.accessTokenExpiresAt?.toISOString(),
    scopes: config.scopes,
  });
};

const logCredentialsUnavailable = (credentialData: any, tokens: OAuth2TokenResponse): void => {
  logger.info("OAuth2 authentication successful - database unavailable, credentials not stored", {
    accountId: credentialData.accountId,
    providerId: credentialData.providerId,
    userName: credentialData.userName,
    userEmail: credentialData.userEmail,
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    expiresAt: credentialData.accessTokenExpiresAt?.toISOString(),
  });

  // Display credentials for manual storage/use
  console.log(pc.yellow("📋 OAuth2 Credentials (DATABASE UNAVAILABLE):"));
  console.log(pc.dim(`   Access Token: ${tokens.access_token.substring(0, 20)}...`));
  if (tokens.refresh_token) {
    console.log(pc.dim(`   Refresh Token: ${tokens.refresh_token.substring(0, 20)}...`));
  }
};

const setupTokenRefreshIfNeeded = async (tokens: OAuth2TokenResponse, accountId: string, config: OAuth2Config): Promise<void> => {
  if (!tokens.refresh_token || !tokens.expires_in) return;

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
      // Update stored tokens in database would happen here
    }
  );
};

const displaySuccessMessage = (credentialData: any, _expiresIn?: number): void => {
  console.log(pc.green(`✅ Credentials stored in database for: ${pc.bold(credentialData.userName)}`));
  console.log(pc.dim(`   Account ID: ${credentialData.accountId}`));
  console.log(pc.dim(`   Provider: ${credentialData.providerId}`));
  console.log(pc.dim(`   Email: ${credentialData.userEmail}`));

  if (credentialData.accessTokenExpiresAt) {
    console.log(pc.dim(`   Expires: ${credentialData.accessTokenExpiresAt.toLocaleString()}`));
  }
};
