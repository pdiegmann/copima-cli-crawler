# Deduplication System

## Overview

The deduplication system prevents duplicate data from being written across multiple crawl steps. This is particularly important because:

- Users appear in member lists across multiple groups/projects
- Labels, milestones, and other resources may be shared
- Re-running crawl steps shouldn't duplicate existing data
- Large GitLab instances can have significant data overlap

## Architecture

### Components

1. **DeduplicationRegistry** (`src/storage/deduplicationRegistry.ts`)
   - Central tracking system for written resource IDs
   - File-based persistence (`.copima-registry.json`)
   - Resource-type namespaced (users, projects, groups, etc.)
   - Thread-safe in-memory caching

2. **StorageManager** (`src/storage/storageManager.ts`)
   - Enhanced `writeJsonlFile()` method
   - Filters duplicates before writing
   - Automatically marks written resources

3. **HierarchicalStorageManager** (`src/storage/hierarchicalStorage.ts`)
   - Enhanced `writeJSONLToHierarchy()` method
   - Same deduplication logic as StorageManager
   - Supports custom ID fields

4. **StorageFactory** (`src/commands/crawl/storageFactory.ts`)
   - Factory functions for creating storage managers with deduplication
   - Shared registry management across crawl steps
   - Statistics collection and reporting

## Usage

### Configuration

Deduplication is **enabled by default**. Configure it in your config file:

```yaml
output:
  rootDir: ./output
  deduplication:
    enabled: true # default: true
    registryPath: ./output/.copima-registry.json # optional, auto-generated if not specified
```

To disable deduplication:

```yaml
output:
  deduplication:
    enabled: false
```

### Automatic Usage

The deduplication system works automatically when using the crawl commands:

```bash
# Run a complete crawl with deduplication
copima crawl --host https://gitlab.example.com --token YOUR_TOKEN

# Deduplication works across multiple step runs
copima crawl --steps areas
copima crawl --steps users    # Won't duplicate users already written
copima crawl --steps resources  # Won't duplicate members/labels/etc
```

### Programmatic Usage

When writing custom crawl logic:

```typescript
import { createStorageManagerWithDeduplication } from './commands/crawl/storageFactory';
import { loadConfig } from './config/loader';

const config = await loadConfig();
const storageManager = createStorageManagerWithDeduplication(config);

// Write data with automatic deduplication
const users = [...]; // your user data
const filePath = storageManager.createHierarchicalPath('users', []);

// The 4th parameter enables deduplication for 'user' resource type
// The 5th parameter specifies the ID field (default: 'id')
storageManager.writeJsonlFile(filePath, users, false, 'user', 'id');
```

## How It Works

### Write Flow

1. **Before Write**: Check registry for already-written IDs
2. **Filter**: Remove items with IDs that exist in registry
3. **Write**: Write only new items to file
4. **Mark**: Add written IDs to registry
5. **Persist**: Save registry to disk

### Registry Structure

```json
{
  "users": {
    "gid://gitlab/User/123": {
      "id": "gid://gitlab/User/123",
      "resourceType": "users",
      "filePath": "/output/users.jsonl",
      "writtenAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "projects": {
    "gid://gitlab/Project/456": {
      "id": "gid://gitlab/Project/456",
      "resourceType": "projects",
      "filePath": "/output/group1/subgroup1/project.jsonl",
      "writtenAt": "2024-01-15T10:31:00.000Z"
    }
  }
}
```

## Supported Resource Types

The following resource types are automatically deduplicated:

- `user` - GitLab users
- `group` - GitLab groups
- `project` - GitLab projects
- `member` - Group/project members
- `label` - Labels
- `release` - Project releases
- `pipeline` - CI/CD pipelines
- `milestone` - Milestones
- `issue` - Issues
- `merge_request` - Merge requests
- `snippet` - Code snippets
- `board` - Issue boards
- `tag` - Git tags
- `discussion` - Discussions/comments
- `epic` - Epics (Premium/Ultimate)
- `branch` - Repository branches
- `commit` - Git commits
- `tree_item` - Repository tree items
- `dependency` - Dependencies
- `vulnerability` - Security vulnerabilities
- `package` - Package registry packages

## Statistics and Monitoring

At the end of each crawl, deduplication statistics are logged:

```
[INFO] Deduplication statistics: { users: 145, projects: 23, members: 892 }
[INFO] Total resources deduplicated: 1060
```

You can also query statistics programmatically:

```typescript
import { getDeduplicationStats } from "./commands/crawl/storageFactory";

const stats = getDeduplicationStats();
if (stats) {
  console.log("Resources deduplicated:", stats);
}
```

## Guarantees

### No False Positives

The system is designed to **never skip data that hasn't been successfully written**:

1. Resources are marked as written **only after** successful write to disk
2. Registry is persisted **after** file write completes
3. Failed writes do not update the registry
4. Registry is loaded before each crawl step

### Data Integrity

- Registry is atomic - uses full file rewrite
- In-memory cache synced with disk state
- Registry corruption is detected and handled gracefully (starts fresh)

## Performance

### Memory Usage

- Registry kept in memory during crawl
- Typical registry size: ~100-500 KB for 10,000 resources
- Memory usage scales with number of unique resources

### Disk I/O

- Registry read once at startup
- Registry written after each resource batch
- Minimal overhead: ~1ms per batch write

### Deduplication Check

- O(1) lookup time (hash map based)
- Negligible CPU overhead

## Troubleshooting

### Clearing the Registry

If you need to start fresh (e.g., after a failed crawl):

```bash
# Remove the registry file
rm output/.copima-registry.json

# Or clear it programmatically
```

```typescript
import { createDeduplicationRegistry } from "./storage/deduplicationRegistry";

const registry = createDeduplicationRegistry("./output");
registry.clearAll();
registry.save();
```

### Disable Deduplication Temporarily

```bash
# Add to config or environment
export COPIMA_OUTPUT_DEDUPLICATION_ENABLED=false
```

### Debug Logging

Enable debug logging to see deduplication in action:

```yaml
logging:
  level: debug
```

You'll see messages like:

```
[DEBUG] Skipping duplicate user: gid://gitlab/User/123
[DEBUG] Deduplication: 150 -> 142 items (8 duplicates skipped)
```

## Limitations

1. **Single Registry**: One registry per output directory
2. **No Cross-Directory**: Deduplication doesn't work across different output directories
3. **ID Field Required**: Resources must have an ID field (configurable)
4. **No Partial Updates**: Entire objects are written, not field-level merging

## Best Practices

1. **Keep Registry**: Don't delete `.copima-registry.json` between crawl runs
2. **Backup Registry**: Include registry in your backup strategy
3. **Monitor Stats**: Review deduplication stats to understand data overlap
4. **Test Mode**: Test with deduplication disabled first for new crawl logic
5. **Clean Output**: If you want fresh data, delete both output dir and registry

## Testing

The deduplication system includes comprehensive tests:

```bash
# Run all deduplication tests
npm test -- deduplicationRegistry.test.ts

# Test integration with storage managers
npm test -- storageManager.test.ts
npm test -- hierarchicalStorage.test.ts
```

## Future Enhancements

Potential improvements for future versions:

1. **Distributed Registry**: Support for multi-node crawling
2. **Smart Refresh**: Update only changed resources
3. **Compression**: Compress registry for large instances
4. **Analytics**: Detailed deduplication analytics and reports
5. **TTL**: Time-based expiry for stale entries
