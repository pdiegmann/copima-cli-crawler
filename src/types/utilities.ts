/**
 * Utility function types, security-safe object access patterns, and common helpers
 */

import type { SafeRecord } from "./api.js";

// File operation types for security compliance
export type FileOperationOptions = {
  encoding?: BufferEncoding;
  flag?: string;
  mode?: number;
  signal?: AbortSignal;
};

export type SafeFileOperation<T = void> = (path: string, options?: FileOperationOptions) => Promise<T>;

export type SafeFileOperationSync<T = void> = (path: string, options?: FileOperationOptions) => T;

// Logger function types
export type LogLevel = "error" | "warn" | "info" | "debug";

export type LoggerFunction = (message: string, meta?: SafeRecord) => void;

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

// Progress reporting types
export type ProgressState = SafeRecord<unknown>;

export type ResourceCount = {
  total: number;
  processed: number;
  filtered: number;
  errors: number;
};

export type PerformanceMetrics = {
  requestsPerSecond: number;
  avgResponseTime: number;
  errorRate: number;
};

export type ProgressStats = {
  totalSteps: number;
  completedSteps: number;
  currentStep: string;
  startTime: Date;
  lastUpdate: Date;
  resourceCounts?: Record<string, ResourceCount>;
  performance?: PerformanceMetrics;
};

// Callback management types
export type CallbackFunction<T = SafeRecord, R = SafeRecord> = (context: SafeRecord, data: T) => Promise<R> | R;

export type CallbackConfig = {
  name: string;
  enabled: boolean;
  priority?: number;
  filters?: SafeRecord;
  options?: SafeRecord;
};

// Configuration types
export type ConfigLevel = "system" | "global" | "local" | "environment" | "runtime";

export type ConfigSource = {
  level: ConfigLevel;
  path?: string;
  values: SafeRecord;
};

export type ConfigLoader = {
  load: () => Promise<SafeRecord>;
  save: (config: SafeRecord) => Promise<void>;
  merge: (configs: SafeRecord[]) => SafeRecord;
};

// Type guards and validation functions
export type TypeGuard<T> = (value: unknown) => value is T;

export type ValidationResult<T = SafeRecord> = {
  valid: boolean;
  data?: T;
  errors: string[];
};

export type Validator<T = SafeRecord> = (value: unknown) => ValidationResult<T>;

// Async utility types
export type AsyncRetryOptions = {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryIf?: (error: Error) => boolean;
};

export type AsyncResult<T, E = Error> = {
  success: boolean;
  data?: T;
  error?: E;
};

// Storage and serialization types
export type SerializationFormat = "json" | "jsonl" | "yaml" | "csv";

export type StorageOptions = {
  format: SerializationFormat;
  encoding: BufferEncoding;
  compression?: boolean;
  backup?: boolean;
  maxSize?: number;
};

export type HierarchicalPath = {
  segments: string[];
  full: string;
  relative: string;
};

// Network and HTTP types
export type HttpHeaders = Record<string, string>;

export type RequestOptions = {
  method: string;
  headers: HttpHeaders;
  body?: string | Buffer;
  timeout?: number;
  retry?: AsyncRetryOptions;
};

export type ResponseInfo = {
  status: number;
  statusText: string;
  headers: HttpHeaders;
  url: string;
  redirected: boolean;
};

// Error handling types
export type ErrorLevel = "fatal" | "error" | "warning" | "info";

export type ErrorContext = {
  operation: string;
  timestamp: Date;
  level: ErrorLevel;
  metadata?: SafeRecord;
  stackTrace?: string;
};

export type ErrorHandler<T = void> = (error: Error, context?: ErrorContext) => T;

// Event and subscription types
export type EventListener<T = SafeRecord> = (data: T) => void | Promise<void>;

export type EventSubscription = {
  id: string;
  event: string;
  listener: EventListener;
  once?: boolean;
};

export type EventEmitter = {
  on: <T = SafeRecord>(event: string, listener: EventListener<T>) => EventSubscription;
  off: (subscription: EventSubscription) => void;
  emit: <T = SafeRecord>(event: string, data: T) => void;
  once: <T = SafeRecord>(event: string, listener: EventListener<T>) => EventSubscription;
};

// Data processing and transformation types
export type DataProcessor<TInput = SafeRecord, TOutput = SafeRecord> = (input: TInput, context?: SafeRecord) => Promise<TOutput> | TOutput;

export type DataFilter<T = SafeRecord> = (item: T, context?: SafeRecord) => boolean;

export type DataTransformer<TInput = SafeRecord, TOutput = SafeRecord> = (input: TInput, context?: SafeRecord) => TOutput;

export type PipelineStep<T = SafeRecord> = {
  name: string;
  processor: DataProcessor<T, T>;
  enabled: boolean;
  order: number;
};

export type ProcessingPipeline<T = SafeRecord> = {
  steps: PipelineStep<T>[];
  execute: (data: T[], context?: SafeRecord) => Promise<T[]>;
};
