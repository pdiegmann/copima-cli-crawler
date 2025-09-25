# Storage Submodule

This module provides storage types and implementations for hierarchical storage, file locking, and storage management.

## Exports

- Storage types: `SerializationFormat`, `StorageOptions`, `HierarchicalPath`
- Storage implementations: `hierarchicalStorage`, `storageManager`, `fileLocker`

## Usage

Import storage utilities or types from this submodule:

```typescript
import { hierarchicalStorage, storageManager, fileLocker } from "./storage/hierarchicalStorage";
import type { StorageOptions } from "./storage";
```

## Responsibilities

- Manage hierarchical and file-based storage
- Provide serialization and backup options
- Ensure safe concurrent file access
