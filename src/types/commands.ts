/**
 * Command handler type definitions and argument interfaces
 */

import type { SafeRecord } from "./api.js";

// Base command types
export type CommandArgs = {
  positionals: string[];
  flags: SafeRecord;
};

export type CommandContext = {
  config: SafeRecord;
  logger: {
    info: (message: string, meta?: SafeRecord) => void;
    error: (message: string, error?: Error | SafeRecord) => void;
    warn: (message: string, meta?: SafeRecord) => void;
    debug: (message: string, meta?: SafeRecord) => void;
  };
  [key: string]: unknown;
};

export type CommandHandler = (args: CommandArgs, context?: CommandContext) => Promise<void>;

// Specific command argument types
export type CrawlCommandFlags = {
  output?: string;
  format?: "json" | "jsonl" | "yaml";
  verbose?: boolean;
  resume?: boolean;
  maxRetries?: number;
  concurrency?: number;
} & SafeRecord;

export type AccountCommandFlags = {
  format?: "json" | "yaml" | "table";
  verbose?: boolean;
} & SafeRecord;

export type ConfigCommandFlags = {
  global?: boolean;
  local?: boolean;
  list?: boolean;
  get?: string;
  set?: string;
  unset?: string;
  edit?: boolean;
} & SafeRecord;

// Command result types
export type CommandResult<T = SafeRecord> = {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
};

// Function signature types for command implementations
export type CrawlAreasHandler = (flags: CrawlCommandFlags) => Promise<void>;
export type CrawlUsersHandler = (flags: CrawlCommandFlags) => Promise<void>;
export type CrawlResourcesHandler = (flags: CrawlCommandFlags) => Promise<void>;
export type CrawlRepositoryHandler = (flags: CrawlCommandFlags) => Promise<void>;

export type AccountInfoHandler = (flags: AccountCommandFlags) => Promise<void>;
export type AccountLoginHandler = (flags: AccountCommandFlags) => Promise<void>;
export type AccountLogoutHandler = (flags: AccountCommandFlags) => Promise<void>;

export type ConfigGetHandler = (flags: ConfigCommandFlags) => Promise<void>;
export type ConfigSetHandler = (flags: ConfigCommandFlags) => Promise<void>;
export type ConfigListHandler = (flags: ConfigCommandFlags) => Promise<void>;
export type ConfigEditHandler = (flags: ConfigCommandFlags) => Promise<void>;

// Auth command types
export type AuthCommandFlags = {
  provider?: string; // OAuth2 provider (gitlab, github, etc.)
  scopes?: string[]; // OAuth2 scopes to request
  port?: number; // Preferred port for callback server
  "client-id"?: string; // OAuth2 client ID
  "client-secret"?: string; // OAuth2 client secret
  "redirect-uri"?: string; // Custom redirect URI
  timeout?: number; // Timeout in seconds for auth flow
  "account-id"?: string; // Account identifier for storage
  name?: string; // Display name for account
} & SafeRecord;

export type AuthFlowHandler = (flags: AuthCommandFlags) => Promise<void>;
