# Deduplication

Preventing duplicate data writes across multiple crawl runs.

## Overview

The deduplication system prevents the same resource from being written multiple times when:

- Re-running crawl steps
- Running multiple overlapping crawls
- Users/labels/milestones appear in multiple groups/projects
- Resuming interrupted crawls

## Why Deduplication?

### The Problem

Without deduplication:

```bash
# First run: Crawl groups A and B
copima crawl --steps resources
# Writes user Alice to:
# - output/groupA/members.jsonl
# - output/groupB/members.jsonl

# Second run: Crawl group C
copima crawl --steps resources
# Writes user Alice again to:
# - output/groupC/members.jsonl

# Result: Alice appears 3 times in different files!
```

### The Solution

With deduplication:

```bash
# First run
copima crawl --steps resources
# Writes Alice once, tracks in registry

# Second run
copima crawl --steps resources
# Skips Alice (already written), updates registry

# Result: Alice appears only once, in first location
```

## How It Works

### Architecture

```
Data Flow with Deduplication:

1. Fetch Resource from API
   ↓
2. Check Deduplication Registry
   ├─► Already Written? → Skip (log skip)
   └─► Not Written? → Continue
       ↓
3. Write to JSONL File
   ↓
4. Mark as Written in Registry
   ↓
5. Persist Registry to Disk
```

### Components

#### 1. DeduplicationRegistry

**Location**: `src/storage/deduplicationRegistry.ts`

Tracks which resources have been written:

```typescript
import { createDeduplicationRegistry } from './storage';

const registry = createDeduplicationRegistry('./output');

// Check if resource was written
const wasWritten = registry.isWritten('user', 'gid://gitlab/User/123');

// Mark resource as written
registry.markWritten('user', {
  id: 'gid://gitlab/User/123',
  resourceType: 'user',
  filePath: './output/users.jsonl',
  writtenAt: new Date()
});

// Save registry to disk
await registry.save();
```

#### 2. Storage Integration

**Location**: `src/storage/storageManager.ts`, `src/storage/hierarchicalStorage.ts`

Storage managers automatically use deduplication:

```typescript
// Write with automatic deduplication
await storage.writeJsonlFile(
  './output/users.jsonl',
  users,
  false,        // append mode
  'user',       // resource type for deduplication
  'id'          // ID field name
);

// Only new users are written
// Already-written users are skipped
```

## Registry Format

### File Location

```
output/
└── .copima-registry.json
```

### Structure

```json
{
  "users": {
    "gid://gitlab/User/123": {
      "id": "gid://gitlab/User/123",
      "resourceType": "users",
      "filePath": "/absolute/path/output/users.jsonl",
      "writtenAt": "2025-10-19T10:00:00.000Z"
    },
    "gid://gitlab/User/456": {
      "id": "gid://gitlab/User/456",
      "resourceType": "users",
      "filePath": "/absolute/path/output/users.jsonl",
      "writtenAt": "2025-10-19T10:00:15.000Z"
    }
  },
  "projects": {
    "gid://gitlab/Project/789": {
      "id": "gid://gitlab/Project/789",
      "resourceType": "projects",
      "filePath": "/absolute/path/output/org/team/project/projects.jsonl",
      "writtenAt": "2025-10-19T10:01:00.000Z"
    }
  },
  "issues": {
    "gid://gitlab/Issue/111": {
      "id": "gid://gitlab/Issue/111",
      "resourceType": "issues",
      "filePath": "/absolute/path/output/org/project/issues.jsonl",
      "writtenAt": "2025-10-19T10:02:00.000Z"
    }
  }
}
```

### Registry Properties

Each entry contains:

- **id**: Unique resource identifier (GitLab GID)
- **resourceType**: Type of resource (user, project, issue, etc.)
- **filePath**: Absolute path where resource was written
- **writtenAt**: Timestamp of write operation

## Supported Resource Types

Deduplication works for all resource types:

### Core Resources

- `user` - Users
- `group` - Groups
- `project` - Projects

### Group/Project Resources

- `member` - Members (deduplicated across groups/projects)
- `label` - Labels
- `milestone` - Milestones
- `issue` - Issues
- `merge_request` - Merge requests

### Premium/Ultimate

- `epic` - Epics
- `board` - Issue boards

### Repository

- `commit` - Git commits
- `branch` - Branches
- `tag` - Tags
- `tree_item` - Repository tree items

### CI/CD

- `pipeline` - CI/CD pipelines
- `job` - Pipeline jobs

### Security

- `vulnerability` - Vulnerabilities
- `dependency` - Dependencies
- `package` - Packages

## Configuration

### Enable/Disable Deduplication

```yaml
output:
  deduplication:
    # Enable deduplication (default: true)
    enabled: true
    
    # Custom registry path (optional)
    registryPath: "./output/.copima-registry.json"
```

### Disable via CLI

```bash
# Disable for single run
copima crawl --no-deduplication

# Or via environment variable
export COPIMA_OUTPUT_DEDUPLICATION_ENABLED=false
copima crawl
```

## Usage Examples

### Normal Usage (Automatic)

```bash
# First crawl
copima crawl --steps areas,users
# Writes all groups, projects, users
# Registry tracks all written resources

# Second crawl (same steps)
copima crawl --steps areas,users
# Skips already-written resources
# Only writes new/updated resources
```

### Multiple Step Runs

```bash
# Run step by step
copima crawl --steps areas
# Writes groups, projects

copima crawl --steps users
# Writes users

copima crawl --steps resources
# Writes issues, MRs, labels, etc.
# Members are deduplicated (users already written)
```

### Resume After Interruption

```bash
# Start crawl
copima crawl
# ... interrupted at 50% ...

# Resume
copima crawl --resume true
# Skips already-written resources
# Continues from checkpoint
```

## Statistics

### View Deduplication Stats

At the end of each crawl:

```
[INFO] Deduplication statistics:
[INFO]   users: 0 duplicates skipped (145 written)
[INFO]   projects: 0 duplicates skipped (23 written)
[INFO]   members: 892 duplicates skipped (1200 written)
[INFO]   labels: 45 duplicates skipped (150 written)
[INFO]   issues: 12 duplicates skipped (2500 written)
[INFO] Total: 949 duplicates prevented
```

### Programmatic Access

```typescript
import { getDeduplicationStats } from './commands/crawl/storageFactory';

const stats = getDeduplicationStats();

console.log({
  totalSkipped: stats.totalSkipped,
  totalWritten: stats.totalWritten,
  byResourceType: stats.byType
});
```

## Performance Impact

### Memory Usage

- **Registry in memory**: ~100-500 KB for 10,000 resources
- **Lookup time**: O(1) hash map lookup
- **CPU overhead**: Negligible (<1% of total time)

### Disk I/O

- **Registry reads**: Once at startup
- **Registry writes**: After each batch (every ~100 resources)
- **Write overhead**: ~1-2ms per batch

### Benchmark

| Resources | Without Dedup | With Dedup | Savings |
|-----------|--------------|------------|---------|
| 10,000    | 45 MB        | 30 MB      | 33%     |
| 100,000   | 450 MB       | 300 MB     | 33%     |
| 1,000,000 | 4.5 GB       | 3.0 GB     | 33%     |

*Savings assume ~33% overlap (typical for members across groups)*

## Guarantees

### No False Positives

The system **never skips data that hasn't been successfully written**:

1. Resources marked as written **only after** successful write to disk
2. Registry persisted **after** file write completes
3. Failed writes **do not** update registry
4. Registry loaded before each crawl step

### Data Integrity

- **Atomic operations**: Registry uses atomic file writes
- **In-memory cache**: Synced with disk state
- **Corruption detection**: Invalid registry treated as empty (starts fresh)
- **Consistency**: Registry and JSONL files stay synchronized

## Managing the Registry

### Clear Registry

```bash
# Remove registry file
rm output/.copima-registry.json

# Next crawl will start with empty registry
# (All resources will be written again)
```

### Inspect Registry

```bash
# View registry
cat output/.copima-registry.json | jq '.'

# Count resources by type
cat output/.copima-registry.json | jq 'to_entries | map({key: .key, count: (.value | length)})'

# Find specific resource
cat output/.copima-registry.json | jq '.users."gid://gitlab/User/123"'
```

### Manual Registry Editing

```bash
# Remove specific resource from registry
cat output/.copima-registry.json | \
  jq 'del(.users."gid://gitlab/User/123")' > temp.json
mv temp.json output/.copima-registry.json

# Next crawl will re-write that resource
```

### Registry Recovery

If registry is corrupted:

```bash
# Backup corrupted registry
mv output/.copima-registry.json output/.copima-registry.json.bak

# Rebuild from JSONL files (feature planned)
# For now, delete and start fresh
rm output/.copima-registry.json
```

## Advanced Usage

### Custom ID Field

By default, deduplication uses the `id` field. Specify custom field:

```typescript
await storage.writeJsonlFile(
  './output/custom.jsonl',
  data,
  false,
  'custom',
  'customId'  // Use customId field for deduplication
);
```

### Selective Deduplication

```typescript
// Deduplicate only specific resource types
const registry = createDeduplicationRegistry('./output', {
  enabledTypes: ['user', 'project']  // Only deduplicate users and projects
});
```

### Cross-Directory Deduplication (Not Supported)

**Current limitation**: Deduplication works per output directory only.

```bash
# Different output dirs = separate registries
copima crawl --output ./output1
copima crawl --output ./output2

# No deduplication between output1/ and output2/
```

**Workaround**: Use same output directory.

## Best Practices

### 1. Keep Registry Between Runs

```bash
# ❌ Don't delete registry between runs
rm output/.copima-registry.json
copima crawl

# ✅ Keep registry for deduplication
copima crawl  # Registry persists automatically
```

### 2. Backup Registry with Output

```bash
# Include registry in backups
tar -czf backup.tar.gz output/

# Registry is critical for deduplication
```

### 3. Monitor Deduplication Stats

```bash
# Review stats at end of crawl
# High duplicate counts = deduplication working well
# Example: "members: 892 duplicates skipped"
```

### 4. Clean Slate When Needed

```bash
# For fresh crawl without deduplication
rm -rf output/
copima crawl

# Or disable deduplication temporarily
copima crawl --no-deduplication
```

### 5. Verify Registry Size

```bash
# Check registry size
ls -lh output/.copima-registry.json

# Typical sizes:
# - 10K resources: ~500 KB
# - 100K resources: ~5 MB
# - 1M resources: ~50 MB
```

## Troubleshooting

### Registry Not Working

**Symptom**: Same resources written multiple times

**Checks**:

```bash
# 1. Verify deduplication is enabled
copima config:show | grep deduplication

# 2. Check registry exists
ls -la output/.copima-registry.json

# 3. Verify registry is not empty
cat output/.copima-registry.json | jq 'keys'

# 4. Check logs for deduplication messages
grep "duplicate" copima.log
```

### Registry Growing Too Large

**Symptom**: .copima-registry.json is very large (>100 MB)

**Solutions**:

```bash
# 1. Clear old entries (manual)
# Keep only recent entries

# 2. Start fresh if needed
rm output/.copima-registry.json

# 3. Use smaller output scopes
copima crawl --steps areas,users  # Fewer resources
```

### Registry Corruption

**Symptom**: "Invalid JSON" or parse errors

**Solutions**:

```bash
# 1. Validate JSON
cat output/.copima-registry.json | jq '.' > /dev/null

# 2. If invalid, start fresh
mv output/.copima-registry.json output/.copima-registry.json.bak
# Next run creates new registry
```

## Debug Logging

Enable debug logging to see deduplication in action:

```yaml
logging:
  level: "debug"
```

Output:
```
[DEBUG] Deduplication check: user gid://gitlab/User/123
[DEBUG] Resource already written, skipping
[DEBUG] Batch: 150 items → 142 items (8 duplicates skipped)
[DEBUG] Registry updated: 142 new entries
[DEBUG] Registry saved to disk
```

## Future Enhancements

Planned improvements:

1. **Cross-Directory Deduplication** - Deduplicate across multiple output directories
2. **Smart Refresh** - Update only changed resources
3. **Registry Compression** - Reduce registry file size
4. **TTL Support** - Time-based entry expiration
5. **Distributed Registry** - Multi-node crawling support

## Summary

- **Automatic**: Works automatically with default configuration
- **Efficient**: O(1) lookups, minimal overhead
- **Safe**: No false positives, guarantees data integrity
- **Persistent**: Registry survives across runs
- **Comprehensive**: Supports all resource types
- **Configurable**: Can be disabled or customized

Deduplication is a key feature that makes COPIMA efficient and reliable for repeated crawls.

---

**Deduplication Guide Version**: 1.0.0  
**Last Updated**: 2025-10-19
