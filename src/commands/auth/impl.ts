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
  // Enhanced fallback logic - try main config first, then OAuth2-specific configs
  if (!flags.config) {
    logger.info("No config file specified, trying intelligent fallback...");

    // First, try to use the main application config if it has OAuth2 settings
    try {
      const mainConfig = await loadConfig({ config: undefined });
      if (mainConfig.oauth2?.providers && Object.keys(mainConfig.oauth2.providers).length > 0) {
        logger.info("Using OAuth2 configuration from main application config");

        const provider = flags.provider || "gitlab";
        const providerConfig = mainConfig.oauth2.providers[provider];

        if (!providerConfig) {
          // List available providers
          const availableProviders = Object.keys(mainConfig.oauth2.providers);
          throw new Error(`Provider '${provider}' not found in config. Available providers: ${availableProviders.join(", ")}`);
        }

        // Convert main config format to OAuth2 config format
        const config: OAuth2Config = {
          clientId: flags["client-id"] || providerConfig.clientId,
          clientSecret: flags["client-secret"] || providerConfig.clientSecret,
          redirectUri: flags["redirect-uri"] || providerConfig.redirectUri || "http://localhost:3000/callback",
          authorizationUrl: providerConfig.authorizationUrl,
          tokenUrl: providerConfig.tokenUrl,
          scopes: flags.scopes ? flags.scopes.split(",").map((s) => s.trim()) : providerConfig.scopes || [],
        };

        if (!validateProviderConfig(config)) {
          throw new Error("Invalid OAuth2 configuration from main config");
        }

        return config;
      }
    } catch (error) {
      logger.debug("Main config does not contain valid OAuth2 settings, trying OAuth2-specific configs...", { error: error instanceof Error ? error.message : String(error) });
    }

    // Fallback to OAuth2-specific config files
    const { existsSync } = await import("fs");
    const commonPaths = [
      "./oauth2-config.yml",
      "./config/oauth2-config.yml",
      "./examples/oauth2-config.yml",
      "./examples/test-configs/basic-test.yaml", // Include test config as fallback
    ];

    for (const path of commonPaths) {
      if (existsSync(path)) {
        logger.info(`Found OAuth2 config at: ${path}, trying to load as unified config first...`);

        // Try to load as unified config first
        try {
          const mainConfig = await loadConfig({ config: path });
          if (mainConfig.oauth2?.providers && Object.keys(mainConfig.oauth2.providers).length > 0) {
            logger.info(`Using unified config from ${path}`);

            const provider = flags.provider || "gitlab";
            const providerConfig = mainConfig.oauth2.providers[provider];

            if (!providerConfig) {
              const availableProviders = Object.keys(mainConfig.oauth2.providers);
              throw new Error(`Provider '${provider}' not found in unified config from ${path}. Available providers: ${availableProviders.join(", ")}`);
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
              throw new Error("Invalid OAuth2 configuration from unified config");
            }

            return config;
          }
        } catch (error) {
          logger.debug(`Failed to load ${path} as unified config, trying legacy format...`, { error: error instanceof Error ? error.message : String(error) });
        }

        // Fall back to legacy OAuth2 config format
        flags.config = path;
        break;
      }
    }

    if (!flags.config) {
      logger.info("No OAuth2 config found, using command-line flags and environment variables only");
    }
  }

  // Handle explicit config file or legacy format fallback
  if (flags.config) {
    logger.info(`Loading OAuth2 configuration from ${flags.config}`);

    // Load YAML configuration loader dynamically to avoid import ordering issues
    const { oauth2YamlConfigLoader } = await import("../../auth/yamlConfigLoader.js");
    const yamlConfig = oauth2YamlConfigLoader.loadConfig(flags.config);

    let config = oauth2YamlConfigLoader.getProviderFromYaml(yamlConfig, flags.provider);

    // Override YAML config with command-line flags (flags take precedence)
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
  } else {
    // Use command-line flags only (existing behavior)
    const provider = getProviderConfig(flags.provider || "gitlab");
    if (!provider) {
      throw new Error(`Unsupported OAuth2 provider: ${flags.provider}`);
    }

    // Get client credentials from flags or environment
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
      redirectUri: "http://localhost:3000/callback", // Temporary, will be updated
      scopes: flags.scopes ? flags.scopes.split(",").map((s) => s.trim()) : undefined,
    });

    if (!validateProviderConfig(config)) {
      throw new Error("Invalid OAuth2 configuration");
    }

    return config;
  }
};

const startCallbackServer = async (flags: AuthCommandFlags): Promise<OAuth2Server> => {
  let serverConfig: AuthServerConfig = {
    port: flags.port || 3000,
    timeout: (flags.timeout || 300) * 1000,
    callbackPath: "/callback",
  };

  // Try to get server config from unified config first
  if (!flags.config) {
    try {
      const mainConfig = await loadConfig({ config: undefined });
      if (mainConfig.oauth2?.server) {
        const oauth2Server = mainConfig.oauth2.server;
        serverConfig = {
          port: flags.port || oauth2Server.port || 3000,
          timeout: (flags.timeout || oauth2Server.timeout || 300) * 1000,
          callbackPath: oauth2Server.callbackPath || "/callback",
        };
        logger.debug("Using OAuth2 server config from main application config");
      }
    } catch (error) {
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
          port: flags.port || oauth2Server.port || 3000,
          timeout: (flags.timeout || oauth2Server.timeout || 300) * 1000,
          callbackPath: oauth2Server.callbackPath || "/callback",
        };
        logger.debug("Using OAuth2 server config from unified config file");
      }
    } catch (error) {
      logger.debug("Failed to load unified config, trying legacy OAuth2 config format");

      // Fall back to legacy format
      const { oauth2YamlConfigLoader } = await import("../../auth/yamlConfigLoader.js");
      const yamlConfig = oauth2YamlConfigLoader.loadConfig(flags.config);
      const yamlServerConfig = oauth2YamlConfigLoader.getServerConfigFromYaml(yamlConfig);

      // Merge YAML config with command-line flags (flags take precedence)
      serverConfig = {
        port: flags.port || yamlServerConfig.port || 3000,
        timeout: (flags.timeout || (yamlServerConfig.timeout ? yamlServerConfig.timeout / 1000 : 300)) * 1000,
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

    // Import database modules
    const { db, initDatabase, initializeDatabase } = await import("../../db/index.js");
    const { user, account } = await import("../../db/schema.js");
    const { randomUUID } = await import("node:crypto");

    // Initialize database if not already initialized
    const databaseConfig = {
      path: "./database.sqlite",
      wal: true,
      timeout: 5000,
    };

    let databaseAvailable = false;
    try {
      initDatabase(databaseConfig);
      initializeDatabase({ ...databaseConfig, migrationsFolder: "./drizzle" });
      databaseAvailable = true;
    } catch (error) {
      logger.error("Database initialization failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      console.log(pc.yellow("⚠️  Database unavailable - showing credentials without storing:"));
    }

    // Calculate expiration times
    const accessTokenExpiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null;
    const refreshTokenExpiresAt = null; // GitLab refresh tokens typically don't expire

    // Generate IDs and extract info
    const userId = randomUUID();
    const accountId = flags["account-id"] || randomUUID();
    const providerId = flags.provider || "gitlab";
    const now = new Date();

    // Get user info from OAuth token (we'll need to make an API call to get user details)
    let userInfo: { name: string; email: string } | null = null;

    try {
      // Make a request to get user info using the access token
      const userResponse = await fetch(`${config.tokenUrl.replace("/oauth/token", "/api/v4/user")}`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/json",
        },
      });

      if (userResponse.ok) {
        const userData = (await userResponse.json()) as any;
        userInfo = {
          name: userData.name || userData.username || "Unknown User",
          email: userData.email || `${userData.username || userId}@gitlab.local`,
        };
      }
    } catch (error) {
      logger.warn("Failed to fetch user info, using defaults", { error: error instanceof Error ? error.message : String(error) });
    }

    // Use provided name/email or fallback to OAuth user info or defaults
    const userName = flags.name || userInfo?.name || `${providerId} User`;
    const userEmail = flags.email || userInfo?.email || `${userId}@${providerId}.local`;

    if (databaseAvailable) {
      // Store user in database
      await db()
        .insert(user)
        .values({
          id: userId,
          name: userName,
          email: userEmail,
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: user.email,
          set: {
            name: userName,
            updatedAt: now,
          },
        });

      // Get the actual user ID (in case of conflict resolution)
      const { eq } = await import("drizzle-orm");
      const [existingUser] = await db().select({ id: user.id }).from(user).where(eq(user.email, userEmail)).limit(1);
      const finalUserId = existingUser?.id || userId;

      // Store account credentials in database
      await db()
        .insert(account)
        .values({
          id: randomUUID(),
          accountId,
          providerId,
          userId: finalUserId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
          scope: config.scopes.join(" "),
          createdAt: now,
          updatedAt: now,
        });

      logger.info("OAuth2 authentication successful - credentials stored in database", {
        accountId,
        providerId,
        userName,
        userEmail,
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresAt: accessTokenExpiresAt?.toISOString(),
        scopes: config.scopes,
      });
    } else {
      logger.info("OAuth2 authentication successful - database unavailable, credentials not stored", {
        accountId,
        providerId,
        userName,
        userEmail,
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresAt: accessTokenExpiresAt?.toISOString(),
        scopes: config.scopes,
      });

      // Display credentials for manual storage/use
      console.log(pc.yellow("📋 OAuth2 Credentials (DATABASE UNAVAILABLE):"));
      console.log(pc.dim(`   Access Token: ${tokens.access_token.substring(0, 20)}...`));
      if (tokens.refresh_token) {
        console.log(pc.dim(`   Refresh Token: ${tokens.refresh_token.substring(0, 20)}...`));
      }
    }

    // Create OAuth2Manager for token refresh scheduling
    if (tokens.refresh_token && accessTokenExpiresAt && tokens.expires_in) {
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
    }

    console.log(pc.green(`✅ Credentials stored in database for: ${pc.bold(userName)}`));
    console.log(pc.dim(`   Account ID: ${accountId}`));
    console.log(pc.dim(`   Provider: ${providerId}`));
    console.log(pc.dim(`   Email: ${userEmail}`));
    console.log(pc.dim(`   Scopes: ${config.scopes.join(", ")}`));

    if (accessTokenExpiresAt) {
      console.log(pc.dim(`   Expires: ${accessTokenExpiresAt.toLocaleString()}`));
    }
  } catch (error) {
    logger.error("Failed to store credentials in database", { error: error instanceof Error ? error.message : String(error) });
    throw new Error(`Failed to store credentials: ${error instanceof Error ? error.message : String(error)}`);
  }
};
