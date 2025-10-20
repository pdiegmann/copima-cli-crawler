# StorageManager API Reference

API reference for storage system that writes JSONL files in hierarchical structure.

## Overview

`HierarchicalStorageManager` manages writing crawled data to JSONL files organized in a hierarchical directory structure.

**Location**: `src/storage/hierarchicalStorage.ts`

## Class: HierarchicalStorageManager

### Constructor

```typescript
new HierarchicalStorageManager(
  config: HierarchicalStorageConfig,
  deduplicationRegistry?: DeduplicationRegistry
)
```

**Parameters:**

- `config.rootDir` (string): Root output directory
- `config.hierarchical` (boolean): Enable hierarchical structure
- `config.fileNaming` (string): Naming convention (lowercase, kebab-case, snake_case)
- `deduplicationRegistry` (DeduplicationRegistry, optional): Registry for deduplication

**Example:**

```typescript
import { HierarchicalStorageManager } from './storage';

const storage = new HierarchicalStorageManager({
  rootDir: './output',
  hierarchical: true,
  fileNaming: 'lowercase',
  compression: 'none',
  prettyPrint: false
});
```

### Methods

#### createHierarchicalPath(area)

Create directory path for a GitLab area.

**Signature:**
```typescript
createHierarchicalPath(area: GitLabArea): string
```

**Parameters:**
- `area.id`: Area ID
- `area.fullPath`: Full path (e.g., 'org/team/project')
- `area.type`: 'group' or 'project'

**Returns:** Absolute path to directory

**Example:**
```typescript
const path = storage.createHierarchicalPath({
  id: '123',
  fullPath: 'org/team/project',
  type: 'project'
});
// Returns: ./output/org/team/project
```

#### writeJSONLToHierarchy(area, resourceType, data, idField)

Write data to JSONL file in hierarchical structure.

**Signature:**
```typescript
async writeJSONLToHierarchy(
  area: GitLabArea,
  resourceType: string,
  data: any[],
  idField?: string
): Promise<void>
```

**Parameters:**
- `area`: GitLab area (group/project)
- `resourceType`: Resource type (users, issues, commits, etc.)
- `data`: Array of objects to write
- `idField`: Field to use for deduplication (default: 'id')

**Example:**
```typescript
await storage.writeJSONLToHierarchy(
  {
    id: '123',
    fullPath: 'org/project',
    type: 'project'
  },
  'issues',
  issuesArray
);
// Writes to: ./output/org/project/issues.jsonl
```

## StorageManager (Lower-Level)

For non-hierarchical storage operations.

### Methods

#### writeJsonlFile(path, data, append, resourceType, idField)

Write data to a JSONL file.

**Signature:**
```typescript
async writeJsonlFile(
  path: string,
  data: any[],
  append: boolean,
  resourceType?: string,
  idField?: string
): Promise<void>
```

**Example:**
```typescript
import { StorageManager } from './storage';

const storage = new StorageManager({ baseDir: './output' });

await storage.writeJsonlFile(
  './output/users.jsonl',
  users,
  false, // overwrite
  'user',
  'id'
);
```

#### readJsonlFile(path)

Read a JSONL file.

**Signature:**
```typescript
async readJsonlFile<T>(path: string): Promise<T[]>
```

**Example:**
```typescript
const users = await storage.readJsonlFile('./output/users.jsonl');
```

## File Format

JSONL (JSON Lines) - one JSON object per line:

```jsonl
{"id":"1","name":"Alice"}
{"id":"2","name":"Bob"}
```

## Deduplication

When deduplication registry is provided, duplicate objects are automatically skipped:

```typescript
import { createDeduplicationRegistry } from './storage';

const registry = createDeduplicationRegistry('./output');
const storage = new HierarchicalStorageManager(config, registry);

// First write
await storage.writeJSONLToHierarchy(area, 'users', users);

// Second write - duplicates skipped
await storage.writeJSONLToHierarchy(area, 'users', moreUsers);
```

## See Also

- [Storage System](../core-concepts/Storage.md)
- [Deduplication](../core-concepts/Deduplication.md)

---

**Last Updated**: 2025-10-20
