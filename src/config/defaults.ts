import type { Config } from './types.js';

/**
 * Built-time default configuration.
 * This is the lowest priority level in the configuration hierarchy.
 */
export const defaultConfig: Config = {
  gitlab: {
    host: '',
    accessToken: '',
    refreshToken: undefined,
    timeout: 30000, // 30 seconds
    maxConcurrency: 5,
    rateLimit: 600, // 600 requests per minute (GitLab.com default)
  },

  database: {
    path: './database.sqlite',
    walMode: true,
    timeout: 5000, // 5 seconds
  },

  output: {
    rootDir: './output',
    fileNaming: 'lowercase',
    prettyPrint: false,
    compression: 'none',
  },

  logging: {
    level: 'info',
    format: 'combined',
    file: undefined,
    console: true,
    colors: true,
  },

  progress: {
    enabled: true,
    file: './progress.yaml',
    interval: 1000, // 1 second
    detailed: false,
  },

  resume: {
    enabled: true,
    stateFile: './resume-state.yaml',
    autoSaveInterval: 5000, // 5 seconds
  },
};
