// Logger function types and configuration

export type LogLevel = "error" | "warn" | "info" | "debug";

export type LoggerFunction = (message: string, meta?: Record<string, unknown>) => void;

export type Logger = {
  error: LoggerFunction;
  warn: LoggerFunction;
  info: LoggerFunction;
  debug: LoggerFunction;
  log: LoggerFunction;
};

export type LoggerConfig = {
  level?: LogLevel;
  format?: "json" | "simple" | "combined";
  transports?: string[];
  filename?: string;
  maxSize?: number;
  maxFiles?: number;
};

// Re-export logger functions
export { createLogger, logger } from "./logger";
