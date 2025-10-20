# Configuration System

Comprehensive guide to configuring COPIMA CLI Crawler.

## Overview

COPIMA uses a **5-level configuration hierarchy** that merges settings from multiple sources, allowing flexible configuration for different use cases.

## Configuration Hierarchy

Settings are resolved in this order (highest to lowest priority):

```
1. CLI Arguments          (--flag value)
   ↓ overwrites
2. Environment Variables  (COPIMA_* or GITLAB_*)
   ↓ overwrites
3. User Config File      (~/.config/copima/config.yaml)
   ↓ overwrites
4. Local Config File     (./copima.yaml)
   ↓ overwrites
5. Built-in Defaults     (src/config/defaults.ts)
```

### Example

```bash
# Built-in default
gitlab.apiVersion = "v4"

# Local config (./copima.yaml)
gitlab.host = "https://gitlab.com"

# User config (~/.config/copima/config.yaml)
gitlab.token = "glpat-user-token"

# Environment variable
export GITLAB_HOST="https://gitlab.example.com"

# CLI argument (highest priority)
--host https://gitlab.custom.com

# Final value: https://gitlab.custom.com
```

## Configuration File Format

COPIMA uses YAML for configuration files:

**File**: `copima.yaml` or `~/.config/copima/config.yaml`

```yaml
# GitLab Connection
gitlab:
  host: "https://gitlab.com"
  apiVersion: "v4"
  token: "glpat-xxxxxxxxxxxxxxxxxxxx"
  sslVerify: true
  timeout: 30000

# Output Settings
output:
  rootDir: "./output"
  format: "jsonl"
  deduplication:
    enabled: true
    registryPath: "./output/.copima-registry.json"

# Logging Configuration
logging:
  level: "info"
  format: "pretty"
  file: "./logs/copima.log"
  console: true

# Crawl Behavior
crawl:
  steps:
    - areas
    - users
    - resources
    - repository
  
  resume: true
  
  rateLimit:
    enabled: true
    requestsPerSecond: 10
  
  parallel:
    enabled: false
    maxConcurrency: 5

# OAuth2 Configuration
oauth2:
  providers:
    gitlab:
      clientId: "${env.GITLAB_CLIENT_ID}"
      clientSecret: "${env.GITLAB_CLIENT_SECRET}"
      redirectUri: "http://localhost:3000/callback"
      authorizationUrl: "https://gitlab.com/oauth/authorize"
      tokenUrl: "https://gitlab.com/oauth/token"
      scopes:
        - api
        - read_api

# Step-Specific Configuration
areas:
  includeArchived: false
  includePersonal: true

users:
  includeBlocked: false
  includeExternal: true

resources:
  issues:
    includeNotes: true
    includeClosed: true
  
  mergeRequests:
    includeNotes: true
    includeMerged: true

repository:
  commits:
    enabled: true
    maxDepth: 1000
    includeDiffs: false
  
  branches:
    enabled: true
    includeProtected: true
  
  files:
    enabled: false
    include:
      - "*.md"
      - "*.txt"
    exclude:
      - "*.bin"
      - "*.exe"

# Progress Reporting
progress:
  enabled: true
  updateInterval: 1000
  file: "./output/progress.yaml"

# Resume Configuration
resume:
  enabled: true
  checkpointInterval: 100
  stateFile: "./output/.resume-state.yaml"
```

## Configuration Sections

### 1. GitLab Connection

```yaml
gitlab:
  # GitLab instance URL (required)
  host: "https://gitlab.com"
  
  # API version (v4 is current)
  apiVersion: "v4"
  
  # Personal Access Token
  token: "glpat-xxxxxxxxxxxxxxxxxxxx"
  
  # Or OAuth2 account ID
  accountId: "my-gitlab-account"
  
  # SSL/TLS verification
  sslVerify: true
  
  # Request timeout (milliseconds)
  timeout: 30000
  
  # Proxy settings (optional)
  proxy:
    enabled: true
    host: "proxy.company.com"
    port: 8080
    auth:
      username: "user"
      password: "${env.PROXY_PASSWORD}"
```

### 2. Output Settings

```yaml
output:
  # Root directory for output
  rootDir: "./output"
  
  # Output format (jsonl is the only supported format currently)
  format: "jsonl"
  
  # Hierarchical storage
  hierarchical: true
  
  # Deduplication
  deduplication:
    enabled: true
    registryPath: "./output/.copima-registry.json"
  
  # File naming
  naming:
    lowercase: true
    sanitize: true
```

### 3. Logging

```yaml
logging:
  # Log level: error, warn, info, debug
  level: "info"
  
  # Format: pretty, json, simple
  format: "pretty"
  
  # Log to file
  file: "./logs/copima.log"
  
  # Log to console
  console: true
  
  # Colorize output
  colors: true
  
  # Timestamp format
  timestamp: "ISO"
```

### 4. Crawl Behavior

```yaml
crawl:
  # Steps to execute
  steps:
    - areas
    - users
    - resources
    - repository
  
  # Resume from checkpoint
  resume: true
  
  # Rate limiting
  rateLimit:
    enabled: true
    requestsPerSecond: 10
    burstSize: 20
  
  # Parallel processing (experimental)
  parallel:
    enabled: false
    maxConcurrency: 5
  
  # Retry configuration
  retry:
    enabled: true
    maxAttempts: 3
    backoff: "exponential"
    initialDelay: 1000
```

### 5. OAuth2 Providers

```yaml
oauth2:
  providers:
    gitlab:
      clientId: "your-client-id"
      clientSecret: "your-client-secret"
      redirectUri: "http://localhost:3000/callback"
      authorizationUrl: "https://gitlab.com/oauth/authorize"
      tokenUrl: "https://gitlab.com/oauth/token"
      scopes:
        - api
        - read_api
      
      # Optional: Custom authorization parameters
      authorizationParams:
        prompt: "consent"
        access_type: "offline"
```

### 6. Step-Specific Settings

```yaml
areas:
  # Include archived groups/projects
  includeArchived: false
  
  # Include personal namespaces
  includePersonal: true
  
  # Filter by visibility
  visibility: ["public", "internal", "private"]

users:
  # Include blocked users
  includeBlocked: false
  
  # Include external users
  includeExternal: true
  
  # Include bots
  includeBots: true

resources:
  # Issue configuration
  issues:
    includeNotes: true
    includeClosed: true
    includeDescriptions: true
  
  # Merge request configuration
  mergeRequests:
    includeNotes: true
    includeMerged: true
    includeDiffs: false
  
  # Label configuration
  labels:
    includeGroupLabels: true
    includeProjectLabels: true

repository:
  # Commit configuration
  commits:
    enabled: true
    maxDepth: 1000
    includeDiffs: false
    includeStats: true
  
  # Branch configuration
  branches:
    enabled: true
    includeProtected: true
    includeMerged: true
  
  # Tag configuration
  tags:
    enabled: true
    includeMessages: true
  
  # File tree configuration
  files:
    enabled: false
    maxDepth: 10
    include:
      - "*.md"
      - "*.txt"
      - "LICENSE"
    exclude:
      - "*.bin"
      - "*.exe"
      - "node_modules/*"
```

## Environment Variables

All configuration can be set via environment variables using the prefix `COPIMA_` or `GITLAB_`:

### Common Variables

```bash
# GitLab connection
export GITLAB_HOST="https://gitlab.com"
export GITLAB_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx"
export GITLAB_API_VERSION="v4"

# Output
export COPIMA_OUTPUT_ROOT_DIR="./output"
export COPIMA_OUTPUT_DEDUPLICATION_ENABLED="true"

# Logging
export COPIMA_LOG_LEVEL="debug"
export COPIMA_LOG_FILE="./logs/copima.log"

# Crawl
export COPIMA_CRAWL_RESUME="true"
export COPIMA_CRAWL_RATE_LIMIT_REQUESTS_PER_SECOND="10"

# OAuth2
export GITLAB_CLIENT_ID="your-client-id"
export GITLAB_CLIENT_SECRET="your-client-secret"

# SSL
export NODE_TLS_REJECT_UNAUTHORIZED="0"  # Disable SSL verification
```

### Naming Convention

Environment variables follow this pattern:

```
COPIMA_<SECTION>_<SUBSECTION>_<KEY>=value
```

Examples:

```bash
# gitlab.host
GITLAB_HOST="https://gitlab.com"

# output.deduplication.enabled
COPIMA_OUTPUT_DEDUPLICATION_ENABLED="true"

# logging.level
COPIMA_LOG_LEVEL="info"

# crawl.rateLimit.requestsPerSecond
COPIMA_CRAWL_RATE_LIMIT_REQUESTS_PER_SECOND="10"
```

## CLI Arguments

All configuration can be overridden via CLI arguments:

```bash
copima-cli-crawler crawl \
  --host https://gitlab.com \
  --token glpat-xxx \
  --output ./my-output \
  --log-level debug \
  --resume true \
  --steps areas,users \
  --rate-limit 20
```

### Common Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `--host` | string | GitLab instance URL |
| `--token` | string | Personal Access Token |
| `--account-id` | string | OAuth2 account identifier |
| `--output` | string | Output directory |
| `--config` | string | Config file path |
| `--log-level` | string | Logging level |
| `--verbose` | boolean | Enable verbose logging |
| `--resume` | boolean | Resume from checkpoint |
| `--steps` | string | Comma-separated steps |
| `--rate-limit` | number | Requests per second |
| `--dry-run` | boolean | Test without crawling |

## Template Variables

Configuration values support template interpolation:

### Environment Variables

```yaml
gitlab:
  token: "${env.GITLAB_TOKEN}"

oauth2:
  providers:
    gitlab:
      clientId: "${env.GITLAB_CLIENT_ID}"
      clientSecret: "${env.GITLAB_CLIENT_SECRET}"
```

### Home Directory

```yaml
output:
  rootDir: "${home}/gitlab-data"

logging:
  file: "${home}/.local/share/copima/logs/crawler.log"
```

### Current Working Directory

```yaml
output:
  rootDir: "${cwd}/output"

database:
  path: "${cwd}/database.yaml"
```

### Date/Time

```yaml
output:
  rootDir: "./output-${date:YYYY-MM-DD}"

logging:
  file: "./logs/copima-${date:YYYY-MM-DD}.log"
```

## Configuration Validation

### Validate Configuration

```bash
# Validate current configuration
copima-cli-crawler config:validate

# Validate specific file
copima-cli-crawler config:validate --config ./copima.yaml
```

Output:
```
✓ Configuration valid
✓ GitLab connection settings valid
✓ Output directory writable
✓ OAuth2 configuration valid
✓ No conflicts detected
```

### Common Validation Errors

**Missing Required Fields**:
```
✗ gitlab.host is required
✗ gitlab.token or gitlab.accountId must be provided
```

**Invalid Values**:
```
✗ logging.level must be one of: error, warn, info, debug
✗ crawl.rateLimit.requestsPerSecond must be > 0
```

**File System Issues**:
```
✗ output.rootDir does not exist and cannot be created
✗ logging.file directory is not writable
```

## Interactive Setup Wizard

### Basic Setup

```bash
copima-cli-crawler setup
```

Interactive prompts:
```
? GitLab instance URL: https://gitlab.com
? Authentication method: 
  ❯ Personal Access Token
    OAuth2
? Personal Access Token: *********************
? Output directory: ./output
? Enable verbose logging? No
? Save configuration to: ./copima.yaml
```

### Full Setup

```bash
copima-cli-crawler setup --full
```

Additional prompts:
```
? API version: v4
? Enable SSL verification? Yes
? Request timeout (seconds): 30
? Enable rate limiting? Yes
? Requests per second: 10
? Enable resume capability? Yes
? Log level: info
? Log to file? Yes
? Log file path: ./logs/copima.log
```

## Managing Multiple Configurations

### Project-Specific Configurations

```bash
# Development
copima-cli-crawler crawl --config ./dev.yaml

# Staging
copima-cli-crawler crawl --config ./staging.yaml

# Production
copima-cli-crawler crawl --config ./prod.yaml
```

### Configuration Profiles

```yaml
# base.yaml
gitlab:
  apiVersion: "v4"
  timeout: 30000

logging:
  format: "pretty"
```

```yaml
# dev.yaml
include: ./base.yaml

gitlab:
  host: "https://gitlab-dev.example.com"
  token: "${env.DEV_TOKEN}"

logging:
  level: "debug"
```

```yaml
# prod.yaml
include: ./base.yaml

gitlab:
  host: "https://gitlab.example.com"
  accountId: "prod-account"

logging:
  level: "info"
```

## Configuration File Locations

### Search Order

COPIMA searches for configuration files in this order:

1. Path specified by `--config` flag
2. `./copima.yaml` (current directory)
3. `~/.config/copima/config.yaml` (user config)
4. `/etc/copima/config.yaml` (system config, Linux only)

### Custom Location

```bash
# Specify custom config file
copima-cli-crawler crawl --config /path/to/custom.yaml

# Or via environment variable
export COPIMA_CONFIG_FILE="/path/to/custom.yaml"
copima-cli-crawler crawl
```

## Configuration Management Commands

### Show Current Configuration

```bash
# Show resolved configuration
copima-cli-crawler config:show

# Show specific section
copima-cli-crawler config:show --section gitlab

# Show as JSON
copima-cli-crawler config:show --format json
```

### Set Configuration Value

```bash
# Set a value
copima-cli-crawler config:set --key gitlab.host --value https://gitlab.com

# Set nested value
copima-cli-crawler config:set --key logging.level --value debug

# Set in specific file
copima-cli-crawler config:set --key gitlab.token --value glpat-xxx --config ./copima.yaml
```

### Unset Configuration Value

```bash
# Remove a value
copima-cli-crawler config:unset --key gitlab.token

# Remove from specific file
copima-cli-crawler config:unset --key gitlab.token --config ./copima.yaml
```

## Best Practices

### 1. Use Local Config for Project Settings

```yaml
# ./copima.yaml - Committed to version control
gitlab:
  host: "https://gitlab.company.com"
  apiVersion: "v4"

output:
  rootDir: "./output"

logging:
  level: "info"
```

### 2. Use User Config for Credentials

```yaml
# ~/.config/copima/config.yaml - Not in version control
gitlab:
  token: "glpat-xxxxxxxxxxxxxxxxxxxx"

oauth2:
  providers:
    gitlab:
      clientId: "your-client-id"
      clientSecret: "your-client-secret"
```

### 3. Use Environment Variables for CI/CD

```bash
# .gitlab-ci.yml or similar
export GITLAB_TOKEN="${CI_JOB_TOKEN}"
export COPIMA_OUTPUT_ROOT_DIR="${CI_PROJECT_DIR}/output"
copima-cli-crawler crawl
```

### 4. Template Sensitive Data

```yaml
# Don't hardcode secrets
gitlab:
  token: "glpat-actual-token"  # ❌ Bad

# Use templates
gitlab:
  token: "${env.GITLAB_TOKEN}"  # ✅ Good
```

### 5. Validate Before Running

```bash
# Always validate first
copima-cli-crawler config:validate && copima-cli-crawler crawl
```

## Summary

- **5-level hierarchy**: CLI args → env vars → user config → local config → defaults
- **YAML format**: Human-readable configuration files
- **Environment variables**: Full configuration via `COPIMA_*` prefix
- **Template variables**: Dynamic values with `${env.VAR}`, `${home}`, etc.
- **Validation**: Built-in validation with helpful error messages
- **Interactive setup**: Wizard for easy configuration
- **Multiple profiles**: Support for dev/staging/prod configs

---

**Configuration System Version**: 1.0.0  
**Last Updated**: 2025-10-19
