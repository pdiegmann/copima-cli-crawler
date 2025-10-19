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

// Export deduplication registry
export { DeduplicationRegistry, createDeduplicationRegistry } from "./deduplicationRegistry.js";
export type { DeduplicationRegistryConfig, RegistryEntry } from "./deduplicationRegistry.js";

// Export storage managers
export { StorageManager, createStorageManager } from "./storageManager.js";
export { HierarchicalStorageManager, createHierarchicalStorageManager } from "./hierarchicalStorage.js";
export type { HierarchicalStorageConfig, GitLabArea } from "./hierarchicalStorage.js";
