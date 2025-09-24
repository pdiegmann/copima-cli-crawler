#!/usr/bin/env node
import { run } from "@stricli/core";
import { app } from "../app.js";
import { RefreshTokenManager } from "../auth/refreshTokenManager.js";
import { TokenManager } from "../auth/tokenManager.js";
import { buildContext } from "../context.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("CLI");

const main = async (): Promise<void> => {
  try {
    // Initialize token managers
    const tokenManager = new TokenManager();

    const _refreshTokenManager = new RefreshTokenManager();

    // Authenticate and ensure valid tokens

    const _accessToken = await tokenManager.getAccessToken();
    logger.info("Authentication successful. Access token retrieved.");

    // Proceed with CLI execution
    await run(app, process.argv.slice(2), buildContext(process));
  } catch (error) {
    logger.error("Authentication failed:", error);
    process.exit(1);
  }
};

await main();
