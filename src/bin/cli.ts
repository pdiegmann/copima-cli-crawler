#!/usr/bin/env node
import { run } from "@stricli/core";
import { app } from "../app";
import { TokenManager } from "../auth/tokenManager";
import { buildContext } from "../context";
import { createLogger } from "../logging";

const logger = createLogger("CLI");

type CommandContext = {
  args: string[];
  command: string;
  accessTokenArg: string | null;
};

type AuthenticationResult = {
  requiresAuth: boolean;
  hasToken: boolean;
  isTestMode: boolean;
};

class CLICommandClassifier {
  private static readonly LOCAL_COMMANDS = [
    "test", // Test runner
    "account:list", // List local accounts
    "account:remove", // Remove local account
    "config:show", // Show local config
    "config:set", // Set local config
    "config:unset", // Unset local config
    "config:validate", // Validate local config
    "install", // Install completion
    "uninstall", // Uninstall completion
    "auth", // OAuth2 authentication
  ] as const;

  private static readonly TEST_TOKEN_IDENTIFIER = "6ddd12445d257e18b7358f37c29a1a8a7efb17accd4b5fa726efa7b038748587";

  static parseCommandContext(args: string[]): CommandContext {
    const command = args.length > 0 ? args[0]! : "";
    const accessTokenArg = args.find((arg) => arg.startsWith("--access-token=")) || (args.includes("--access-token") ? (args[args.indexOf("--access-token") + 1] ?? null) : null);

    return { args, command, accessTokenArg };
  }

  static classifyAuthentication(context: CommandContext): AuthenticationResult {
    const { args, command, accessTokenArg } = context;

    const isHelpCommand = args.includes("--help") || args.includes("-h") || args.length === 0;
    const isLocalCommand = this.LOCAL_COMMANDS.includes(command as any);
    const hasToken = Boolean(accessTokenArg);
    const isTestMode = Boolean(accessTokenArg && (accessTokenArg.startsWith("test_") || accessTokenArg.includes("test") || accessTokenArg === this.TEST_TOKEN_IDENTIFIER));

    const requiresAuth = !isLocalCommand && !hasToken && !isHelpCommand;

    return { requiresAuth, hasToken, isTestMode };
  }

  static shouldSkipAuthError(context: CommandContext, auth: AuthenticationResult): boolean {
    const isHelpCommand = context.args.includes("--help") || context.args.includes("-h") || context.args.length === 0;
    const isLocalCommand = this.LOCAL_COMMANDS.includes(context.command as any);

    return isLocalCommand || auth.isTestMode || isHelpCommand;
  }
}

class DatabaseAuthenticator {
  private logger = createLogger("DatabaseAuth");

  async attemptDatabaseAuthentication(): Promise<void> {
    try {
      const { initDatabase } = await import("../db/connection.js");
      const { initializeDatabase } = await import("../db/migrate.js");

      let db;
      try {
        initializeDatabase({ path: "./database.sqlite", wal: true });
        db = initDatabase({ path: "./database.sqlite", wal: true });
      } catch {
        this.logger.warn("Database initialization failed - database may not be available");
        return;
      }

      if (!db) return;

      const tokenManager = new TokenManager(db);
      const accessToken = await tokenManager.getAccessToken("default");

      if (accessToken) {
        this.logger.info("Authentication successful. Access token retrieved from database.");
        process.argv.push("--access-token", accessToken);
      } else {
        this.logger.warn("No valid access token found in database. Please run 'copima auth' to authenticate.");
      }
    } catch (error) {
      this.logger.warn("Failed to retrieve access token from database:", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.logger.warn("Please run 'copima auth' to authenticate or provide --access-token manually.");
    }
  }
}

const main = async (): Promise<void> => {
  try {
    const context = CLICommandClassifier.parseCommandContext(process.argv.slice(2));
    const auth = CLICommandClassifier.classifyAuthentication(context);

    if (auth.requiresAuth) {
      const authenticator = new DatabaseAuthenticator();
      await authenticator.attemptDatabaseAuthentication();
    }

    await run(app, process.argv.slice(2), buildContext(process));
  } catch (error) {
    const context = CLICommandClassifier.parseCommandContext(process.argv.slice(2));
    const auth = CLICommandClassifier.classifyAuthentication(context);

    if (CLICommandClassifier.shouldSkipAuthError(context, auth)) {
      logger.warn("Skipping global authentication for local command, test mode, or help");
      await run(app, process.argv.slice(2), buildContext(process));
    } else {
      logger.error("Authentication failed:", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  }
};

await main();
