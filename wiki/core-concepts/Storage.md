# Storage System

Understanding how COPIMA stores crawled data in a hierarchical JSONL structure.

## Overview

COPIMA uses a **hierarchical JSONL** storage system that:

- Mirrors GitLab's group/project structure on disk
- Stores each resource type in separate JSONL files
- Prevents duplicate data writes via deduplication
- Supports atomic, thread-safe file operations

## Storage Architecture

### Hierarchical Structure

The output directory mirrors the GitLab organizational hierarchy:

```
output/
├── .copima-registry.json          # Deduplication registry
├── progress.yaml                  # Current progress state
├── users.jsonl                    # Global: all users
│
├── top-level-group/               # Top-level group
│   ├── groups.jsonl              # This group's metadata
│   ├── members.jsonl             # Group members
│   ├── labels.jsonl              # Group labels
│   ├── milestones.jsonl          # Group milestones
│   ├── issues.jsonl              # Group-level issues
│   ├── merge_requests.jsonl      # Group-level MRs
│   ├── epics.jsonl               # Group epics (if enabled)
│   │
│   ├── subgroup-1/               # Nested subgroup
│   │   ├── groups.jsonl          # Subgroup metadata
│   │   ├── members.jsonl         # Subgroup members
│   │   └── ...
│   │
│   └── project-1/                # Project in group
│       ├── projects.jsonl        # Project metadata
│       ├── members.jsonl         # Project members
│       ├── labels.jsonl          # Project labels
│       ├── issues.jsonl          # Project issues
│       ├── merge_requests.jsonl  # Project merge requests
│       ├── pipelines.jsonl       # CI/CD pipelines
│       ├── releases.jsonl        # Project releases
│       ├── commits.jsonl         # Git commits
│       ├── branches.jsonl        # Git branches
│       └── tags.jsonl            # Git tags
│
└── another-group/                # Another top-level group
    └── ...
```

### Why Hierarchical?

**Advantages**:

1. **Intuitive Navigation** - Easy to find specific group/project data
2. **Scalability** - No single huge file to manage
3. **Partial Processing** - Process specific groups independently
4. **Natural Organization** - Matches GitLab's structure
5. **Selective Backup** - Back up specific subtrees

## JSONL Format

### What is JSONL?

**JSONL** (JSON Lines) is a format where each line is a valid JSON object:

```jsonl
{"id":"gid://gitlab/User/1","username":"alice","name":"Alice Smith"}
{"id":"gid://gitlab/User/2","username":"bob","name":"Bob Jones"}
{"id":"gid://gitlab/User/3","username":"charlie","name":"Charlie Brown"}
```

### Why JSONL?

**Advantages over regular JSON arrays**:

1. **Streaming** - Process line-by-line without loading entire file
2. **Append-Only** - Add records without re-writing whole file
3. **Fault-Tolerant** - Partial files are still valid
4. **Line-Addressable** - Each record is independent
5. **Efficient** - Low memory footprint for large datasets

**Example comparison**:

```json
// Regular JSON (all-or-nothing)
{
  "users": [
    {"id": 1, "name": "Alice"},
    {"id": 2, "name": "Bob"}
  ]
}
```

```jsonl
// JSONL (line-by-line)
{"id":1,"name":"Alice"}
{"id":2,"name":"Bob"}
```

### Reading JSONL

```bash
# View with cat
cat users.jsonl

# Pretty-print first record
head -1 users.jsonl | jq '.'

# Pretty-print all records
cat users.jsonl | jq '.'

# Filter records
cat users.jsonl | jq 'select(.state == "active")'

# Count records
wc -l users.jsonl

# Process with grep
grep "username.*alice" users.jsonl
```

### Processing JSONL

**JavaScript/Node.js**:

```javascript
import fs from 'fs';
import readline from 'readline';

const stream = fs.createReadStream('users.jsonl');
const rl = readline.createInterface({ input: stream });

for await (const line of rl) {
  const user = JSON.parse(line);
  console.log(user.username);
}
```

**Python**:

```python
import json

with open('users.jsonl', 'r') as f:
    for line in f:
        user = json.loads(line)
        print(user['username'])
```

**Shell (jq)**:

```bash
# Extract all usernames
cat users.jsonl | jq -r '.username'

# Filter and transform
cat users.jsonl | jq 'select(.state == "active") | {id, name}'

# Convert to CSV
cat users.jsonl | jq -r '[.id, .username, .name] | @csv'
```

## Storage Manager

### HierarchicalStorageManager

**Location**: `src/storage/hierarchicalStorage.ts`

The primary storage interface for crawled data:

```typescript
import { HierarchicalStorageManager } from './storage';

const storage = new HierarchicalStorageManager({
  rootDir: './output',
  deduplication: {
    enabled: true,
    registry: deduplicationRegistry
  }
});

// Create hierarchical path
const path = storage.createHierarchicalPath(
  'issues',
  ['org', 'team', 'project']
);
// Result: ./output/org/team/project/issues.jsonl

// Write data
await storage.writeJSONLToHierarchy(
  'issues',
  ['org', 'team', 'project'],
  issuesData,
  { resourceType: 'issue', idField: 'id' }
);
```

### StorageManager

**Location**: `src/storage/storageManager.ts`

Low-level storage operations:

```typescript
import { StorageManager } from './storage';

const storage = new StorageManager({
  baseDir: './output'
});

// Write JSONL file
await storage.writeJsonlFile(
  './output/users.jsonl',
  users,
  false,  // append
  'user', // resource type for deduplication
  'id'    // ID field
);

// Read JSONL file
const users = await storage.readJsonlFile('./output/users.jsonl');

// Append to JSONL file
await storage.appendJsonlFile('./output/users.jsonl', newUsers);
```

## File Naming Conventions

### Resource Type to Filename

COPIMA uses **deterministic, lowercase** filenames:

```typescript
resourceType → filename

"user"          → "users.jsonl"
"group"         → "groups.jsonl"
"project"       → "projects.jsonl"
"issue"         → "issues.jsonl"
"merge_request" → "merge_requests.jsonl"
"label"         → "labels.jsonl"
"milestone"     → "milestones.jsonl"
"epic"          → "epics.jsonl"
"pipeline"      → "pipelines.jsonl"
"release"       → "releases.jsonl"
"commit"        → "commits.jsonl"
"branch"        → "branches.jsonl"
"tag"           → "tags.jsonl"
```

### Path Sanitization

Group and project paths are sanitized for file systems:

```typescript
// GitLab path → File system path
"org/team"              → "org/team"
"org/my-project"        → "org/my-project"
"org/team/sub.group"    → "org/team/sub.group"
"org/project:special"   → "org/project_special"  // : replaced
"org/project*test"      → "org/project_test"     // * replaced
```

**Sanitization rules**:

- Replace `:`, `*`, `?`, `"`, `<`, `>`, `|` with `_`
- Preserve `/` for hierarchy
- Preserve `.`, `-`, `_` in names
- Lowercase (configurable)

## Atomic Operations

### File Locking

**Location**: `src/storage/fileLocker.ts`

COPIMA uses file locking to prevent corruption:

```typescript
import { FileLocker } from './storage';

const locker = new FileLocker();

// Acquire write lock
const lock = await locker.acquireWriteLock('./output/users.jsonl');

try {
  // Perform file operations
  await fs.writeFile('./output/users.jsonl', data);
} finally {
  // Always release lock
  await locker.releaseLock(lock);
}
```

### Write Strategy

**Atomic writes** using temp files:

```typescript
async function atomicWrite(path: string, data: string) {
  const tempPath = `${path}.tmp`;
  
  // Write to temp file
  await fs.writeFile(tempPath, data);
  
  // Atomic rename
  await fs.rename(tempPath, path);
}
```

This ensures:
- No partial writes visible to readers
- File corruption prevented
- Concurrent reads safe during writes

## Directory Structure Management

### Automatic Directory Creation

Directories are created automatically as needed:

```typescript
// Writing to deeply nested path
await storage.writeJSONLToHierarchy(
  'issues',
  ['org', 'team', 'subgroup', 'project']
);

// Automatically creates:
// ./output/org/
// ./output/org/team/
// ./output/org/team/subgroup/
// ./output/org/team/subgroup/project/
```

### Directory Permissions

```bash
# Directories: rwxr-xr-x (755)
drwxr-xr-x  org/

# Files: rw-r--r-- (644)
-rw-r--r--  users.jsonl
```

## Special Files

### .copima-registry.json

**Purpose**: Deduplication tracking

**Location**: `{outputDir}/.copima-registry.json`

**Format**:
```json
{
  "users": {
    "gid://gitlab/User/123": {
      "id": "gid://gitlab/User/123",
      "resourceType": "users",
      "filePath": "/output/users.jsonl",
      "writtenAt": "2025-10-19T10:00:00.000Z"
    }
  },
  "projects": {
    "gid://gitlab/Project/456": {
      "id": "gid://gitlab/Project/456",
      "resourceType": "projects",
      "filePath": "/output/org/project/projects.jsonl",
      "writtenAt": "2025-10-19T10:05:00.000Z"
    }
  }
}
```

**Usage**: See [Deduplication](Deduplication.md) for details.

### progress.yaml

**Purpose**: Current crawl progress

**Location**: `{outputDir}/progress.yaml`

**Format**:
```yaml
step: resources
phase: issues
currentGroup: org/team
currentProject: org/team/project
progress:
  totalGroups: 10
  processedGroups: 5
  totalProjects: 50
  processedProjects: 23
stats:
  startTime: 2025-10-19T10:00:00.000Z
  elapsedSeconds: 320
```

**Usage**: See [Progress Reporting](Progress-Reporting.md) for details.

### .resume-state.yaml

**Purpose**: Resume checkpoint data

**Location**: `{outputDir}/.resume-state.yaml`

**Format**:
```yaml
step: resources
checkpoint:
  processedGroups:
    - org/team1
    - org/team2
  processedProjects:
    - org/team1/project1
    - org/team1/project2
  lastProcessedResource:
    type: issue
    id: gid://gitlab/Issue/789
timestamp: 2025-10-19T10:15:00.000Z
```

**Usage**: See [Resume Capabilities](Resume.md) for details.

## Storage Configuration

```yaml
output:
  # Root directory for all output
  rootDir: "./output"
  
  # Enable hierarchical organization
  hierarchical: true
  
  # File naming
  naming:
    # Use lowercase filenames
    lowercase: true
    # Sanitize paths for filesystem
    sanitize: true
  
  # Deduplication
  deduplication:
    enabled: true
    registryPath: "./output/.copima-registry.json"
  
  # File permissions (octal)
  permissions:
    directories: 0755
    files: 0644
```

## Best Practices

### 1. Keep Registry File

```bash
# ❌ Don't delete registry between runs
rm output/.copima-registry.json

# ✅ Keep registry for deduplication
# (It prevents re-writing same data)
```

### 2. Backup Entire Output Directory

```bash
# Backup includes all special files
tar -czf backup-$(date +%Y%m%d).tar.gz output/
```

### 3. Use Appropriate Disk Space

```bash
# Check space before crawling
df -h ./output

# Monitor during crawl
watch -n 10 'du -sh output/'
```

### 4. Process JSONL Incrementally

```javascript
// ❌ Don't load entire file into memory
const data = JSON.parse(fs.readFileSync('large.jsonl'));

// ✅ Process line-by-line
const stream = fs.createReadStream('large.jsonl');
const rl = readline.createInterface({ input: stream });
for await (const line of rl) {
  const record = JSON.parse(line);
  processRecord(record);
}
```

### 5. Validate JSONL Files

```bash
# Check if JSONL is valid
cat users.jsonl | jq -e '.' > /dev/null && echo "Valid" || echo "Invalid"

# Fix invalid JSONL
cat users.jsonl | jq -c '.' > users.jsonl.fixed
```

## Troubleshooting

### "ENOSPC: no space left on device"

```bash
# Check available space
df -h

# Check output directory size
du -sh output/

# Clean up old outputs
rm -rf old-output-*/

# Or use different drive
--output /mnt/large-drive/output
```

### Corrupted JSONL File

```bash
# Find corrupted lines
cat users.jsonl | jq -e '.' 2>&1 | grep "parse error"

# Remove corrupted lines
cat users.jsonl | jq -c '.' 2>/dev/null > users.jsonl.clean
mv users.jsonl.clean users.jsonl
```

### Permission Denied

```bash
# Check directory permissions
ls -ld output/

# Fix permissions
chmod 755 output/
chmod 644 output/*.jsonl

# Check ownership
chown -R $USER:$USER output/
```

### Missing Directories

```bash
# Recreate directory structure manually if needed
mkdir -p output/org/team/project
```

### Registry Corruption

```bash
# Backup corrupted registry
mv output/.copima-registry.json output/.copima-registry.json.bak

# Start fresh (will re-deduplicate on next run)
# Registry is automatically recreated
```

## Performance

### Disk I/O

**Write Performance**:
- Append-only writes: ~1-2 MB/s
- Typical record: 1-2 KB
- ~500-1000 records/second sustained

**Read Performance**:
- Sequential reads: ~100-200 MB/s
- Line-by-line parsing: ~10,000-50,000 records/second

### Space Usage

**Typical Sizes**:

| Resource Type  | Records | Size per Record | Total Size |
|---------------|---------|-----------------|------------|
| Users         | 10,000  | 1 KB           | 10 MB      |
| Groups        | 1,000   | 2 KB           | 2 MB       |
| Projects      | 5,000   | 3 KB           | 15 MB      |
| Issues        | 100,000 | 2 KB           | 200 MB     |
| Commits       | 500,000 | 1 KB           | 500 MB     |
| Total         | -       | -              | ~727 MB    |

### Optimization

**For Large Datasets**:

```yaml
output:
  # Use SSD for better I/O
  rootDir: "/mnt/ssd/output"
  
  # Disable features if not needed
  deduplication:
    enabled: false  # Faster writes
  
  # Batch writes
  writeBuffer:
    enabled: true
    size: 100  # Records to buffer before flush
```

## Summary

- **Hierarchical JSONL** storage mirrors GitLab structure
- **Atomic operations** prevent file corruption
- **Deduplication** prevents duplicate data writes
- **Special files** (.copima-registry.json, progress.yaml) track state
- **Line-by-line processing** enables streaming and efficiency
- **Deterministic naming** ensures consistency

---

**Storage System Version**: 1.0.0  
**Last Updated**: 2025-10-19
