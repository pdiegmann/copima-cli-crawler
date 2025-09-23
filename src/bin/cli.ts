#!/usr/bin/env node
import { run } from '@stricli/core';
import { buildContext } from '../context.js';
import { app } from '../app.js';

// Import token manager and authentication utilities
import { TokenManager } from '../auth/tokenManager.js';
import { RefreshTokenManager } from '../auth/refreshTokenManager.js';
import { logger } from '../utils/logger.js';

(async () => {
  try {
    // Initialize token managers
    const tokenManager = new TokenManager();
    const refreshTokenManager = new RefreshTokenManager();

    // Authenticate and ensure valid tokens
    const accessToken = await tokenManager.getAccessToken();
    logger.info('Authentication successful. Access token retrieved.');

    // Proceed with CLI execution
    await run(app, process.argv.slice(2), buildContext(process));
  } catch (error) {
    logger.error('Authentication failed:', error);
    process.exit(1);
  }
})();
await run(app, process.argv.slice(2), buildContext(process));
