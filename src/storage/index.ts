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
