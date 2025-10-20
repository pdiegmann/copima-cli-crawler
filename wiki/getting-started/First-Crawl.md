# Your First Crawl - Step by Step

This guide walks you through running your first GitLab data crawl in detail.

## Overview

In this guide, you will:
1. Prepare your GitLab access credentials
2. Configure the crawler
3. Run a test crawl on a small dataset
4. Inspect the output
5. Run a full crawl

**Estimated Time**: 15-30 minutes

## Step 1: Prepare GitLab Credentials

### Option A: Personal Access Token (Simplest)

1. Log in to your GitLab instance
2. Go to **User Settings** → **Access Tokens**
3. Create a new token with scopes:
   - `api` - Full API access
   - `read_api` - Read-only API access
   - `read_repository` - Read repository data
4. Copy the token (you won't see it again!)
5. Save it securely

```bash
# Set as environment variable
export GITLAB_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx"
```

### Option B: OAuth2 (Advanced)

1. Go to your GitLab instance **Admin Area** → **Applications**
2. Create a new application:
   - **Name**: COPIMA Crawler
   - **Redirect URI**: `http://localhost:3000/callback`
   - **Scopes**: `api`, `read_api`, `read_repository`
3. Save the **Application ID** and **Secret**

## Step 2: Configure the Crawler

### Interactive Setup (Recommended)

Run the setup wizard:

```bash
copima-cli-crawler setup
```

You'll be asked:

```
? GitLab instance URL: https://gitlab.com
? Authentication method: Personal Access Token
? Personal Access Token: glpat-xxxxxxxxxxxxxxxxxxxx
? Output directory: ./output
? Enable verbose logging? No
? Configuration file location: ./copima.yaml
```

The wizard creates a `copima.yaml` file.

### Manual Configuration

Create `copima.yaml`:

```yaml
# GitLab connection
gitlab:
  host: "https://gitlab.com"
  apiVersion: "v4"
  token: "glpat-xxxxxxxxxxxxxxxxxxxx"
  sslVerify: true

# Output settings
output:
  rootDir: "./output"
  format: "jsonl"
  deduplication:
    enabled: true

# Logging
logging:
  level: "info"
  format: "pretty"

# Crawl behavior
crawl:
  # Steps to execute (areas, users, resources, repository)
  steps:
    - areas
    - users
    - resources
    - repository
  
  # Resume from checkpoint if interrupted
  resume: true
  
  # Rate limiting (requests per second)
  rateLimit:
    enabled: true
    requestsPerSecond: 10
```

## Step 3: Validate Configuration

Test your configuration before crawling:

```bash
# Validate config file
copima-cli-crawler config:validate

# View resolved configuration
copima-cli-crawler config:show

# Test authentication (dry-run)
copima-cli-crawler crawl --dry-run
```

Expected output:
```
✓ Configuration valid
✓ Authentication successful
✓ Connected to GitLab instance: https://gitlab.com
✓ Dry-run completed successfully
```

## Step 4: Run a Test Crawl

Start with a limited crawl to test everything works:

### Crawl Only Groups and Projects

```bash
copima-cli-crawler crawl --steps areas
```

You'll see output like:
```
[INFO] Starting crawl: areas
[INFO] Authenticating with GitLab...
[INFO] Connected to: https://gitlab.com (GitLab 16.5.0)
[INFO] Fetching groups...
[INFO] Found 5 groups
[INFO] Fetching projects...
[INFO] Found 12 projects
[INFO] Writing to: ./output/
[INFO] Crawl completed in 45 seconds
```

### Check the Output

```bash
# List output files
ls -lR output/

# View groups
cat output/groups.jsonl | jq '.'

# Count projects
wc -l output/projects.jsonl

# View first project
head -1 output/projects.jsonl | jq '.'
```

### Add Users Step

```bash
copima-cli-crawler crawl --steps areas,users
```

This adds user data:
```bash
# View users
cat output/users.jsonl | jq '.username'

# Count users
wc -l output/users.jsonl
```

## Step 5: Run a Full Crawl

Now run all four steps:

```bash
copima-cli-crawler crawl
```

This executes:
1. **Step 1: Areas** - Groups and projects
2. **Step 2: Users** - All users
3. **Step 3: Resources** - Issues, MRs, labels, milestones, pipelines
4. **Step 4: Repository** - Commits, branches, tags, files

### Monitor Progress

In a separate terminal, watch the progress:

```bash
# Watch progress file
watch -n 1 cat output/progress.yaml

# Or follow logs
tail -f copima-crawler.log
```

Progress file shows:
```yaml
step: resources
phase: issues
progress:
  totalGroups: 5
  processedGroups: 3
  totalProjects: 12
  processedProjects: 8
  currentProject: my-org/my-project
  totalIssues: 150
  processedIssues: 95
stats:
  startTime: 2025-10-19T10:00:00Z
  elapsedSeconds: 320
  estimatedRemainingSeconds: 180
```

### Handle Interruptions

If the crawl is interrupted (Ctrl+C, network issue, etc.):

```bash
# Resume from last checkpoint
copima-cli-crawler crawl --resume true
```

The crawler will:
- Load the progress state
- Skip already-processed resources
- Continue from where it stopped

## Step 6: Inspect the Full Output

After completion, explore the data:

```bash
# Output structure
tree -L 3 output/

# Example output:
# output/
# ├── .copima-registry.json
# ├── progress.yaml
# ├── users.jsonl
# ├── my-group/
# │   ├── groups.jsonl
# │   ├── members.jsonl
# │   ├── labels.jsonl
# │   ├── issues.jsonl
# │   └── my-project/
# │       ├── projects.jsonl
# │       ├── issues.jsonl
# │       ├── merge_requests.jsonl
# │       ├── commits.jsonl
# │       └── branches.jsonl
```

### Analyze the Data

```bash
# Total data size
du -sh output/

# Count records by type
find output -name "*.jsonl" -exec wc -l {} \; | sort -n

# View specific data
cat output/my-group/my-project/issues.jsonl | jq '.[] | {title, state, author}'

# Find all open issues
find output -name "issues.jsonl" -exec cat {} \; | jq 'select(.state == "opened")'
```

## Understanding the Output Structure

### File Format: JSONL

Each line is a valid JSON object:

```jsonl
{"id":"gid://gitlab/User/1","username":"john_doe","name":"John Doe"}
{"id":"gid://gitlab/User/2","username":"jane_smith","name":"Jane Smith"}
```

### Hierarchical Organization

The output mirrors GitLab's structure:

```
output/
├── users.jsonl              # Global: all users
├── top-level-group/         # Top-level group
│   ├── groups.jsonl         # Group metadata
│   ├── members.jsonl        # Group members
│   ├── labels.jsonl         # Group labels
│   ├── subgroup/            # Nested subgroup
│   │   └── ...
│   └── project/             # Project in group
│       ├── projects.jsonl   # Project metadata
│       ├── issues.jsonl     # Project issues
│       └── ...
```

### Special Files

- **`.copima-registry.json`** - Deduplication tracking (don't delete!)
- **`progress.yaml`** - Current progress state
- **`copima-crawler.log`** - Detailed logs (if enabled)

## Common First Crawl Issues

### Authentication Failures

**Error**: "401 Unauthorized"

**Solutions**:
- Check token hasn't expired
- Verify token has correct scopes (api, read_api)
- Confirm GitLab host URL is correct

### Permission Errors

**Error**: "403 Forbidden" for certain resources

**Solution**: This is normal - your user doesn't have access to those resources. The crawler continues with accessible resources.

### Slow Crawl Speed

**Issue**: Crawl seems very slow

**Solutions**:
- Increase rate limit: `--rate-limit 20`
- Check network latency to GitLab instance
- Large instances with many resources take time (this is normal)

### Out of Disk Space

**Error**: "ENOSPC: no space left on device"

**Solutions**:
- Check available disk space: `df -h`
- Use a different output directory with more space
- Crawl specific groups/projects only
- Clean up old output directories

### Memory Issues

**Error**: "JavaScript heap out of memory"

**Solutions**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
copima-cli-crawler crawl
```

## Next Steps

Congratulations! You've completed your first crawl. Now explore:

1. **[Command Reference](../guides/Command-Reference.md)** - Learn all commands
2. **[Configuration Reference](../guides/Configuration-Reference.md)** - Advanced config options
3. **[Resume & Recovery](../guides/Resume-Recovery.md)** - Handle long-running crawls
4. **[Custom Callbacks](../guides/Custom-Callbacks.md)** - Process data during crawl
5. **[Four-Step Process](../architecture/Crawling-Process.md)** - Deep dive into crawling

## Tips for Production Use

### 1. Use Dedicated Output Directories

```bash
# Organize by date
copima-cli-crawler crawl --output ./output/2025-10-19

# Organize by instance
copima-cli-crawler crawl --output ./output/gitlab-production
```

### 2. Enable Comprehensive Logging

```yaml
logging:
  level: "debug"
  file: "./logs/copima-crawler.log"
```

### 3. Use Resume for Large Instances

```bash
# Always enable resume for large crawls
copima-cli-crawler crawl --resume true
```

### 4. Schedule Regular Crawls

```bash
# Add to crontab for daily crawls
0 2 * * * /usr/local/bin/copima-cli-crawler crawl --config /etc/copima/config.yaml
```

### 5. Monitor Progress

```bash
# Watch progress in real-time
watch -n 2 'cat output/progress.yaml | grep -E "(step|phase|progress)"'
```

## Summary Checklist

After completing your first crawl, you should have:

- [x] Created and validated configuration
- [x] Successfully authenticated with GitLab
- [x] Run test crawl (areas only)
- [x] Run full crawl (all steps)
- [x] Inspected output structure
- [x] Understood JSONL format
- [x] Know how to resume interrupted crawls

You're now ready to use COPIMA CLI Crawler for production data extraction!

---

**First Crawl Guide Version**: 1.0.0  
**Last Updated**: 2025-10-19
