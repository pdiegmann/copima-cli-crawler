# Command Reference

Complete reference for all COPIMA CLI Crawler commands.

## Command Overview

```bash
copima-cli-crawler <command> [options]
```

### Available Commands

| Command | Description |
|---------|-------------|
| `crawl` | Run complete crawl (all steps) |
| `areas` | Crawl groups and projects (step 1) |
| `users` | Crawl users (step 2) |
| `resources` | Crawl issues, MRs, labels, etc. (step 3) |
| `repository` | Crawl commits, branches, files (step 4) |
| `auth` | Authenticate with OAuth2 |
| `account:add` | Add account manually |
| `account:list` | List stored accounts |
| `account:remove` | Remove account |
| `account:refresh` | Refresh account tokens |
| `config:show` | Show current configuration |
| `config:set` | Set configuration value |
| `config:unset` | Remove configuration value |
| `config:validate` | Validate configuration |
| `setup` | Interactive setup wizard |
| `test` | Run E2E tests |
| `install` | Install shell completion |
| `--help` | Show help for any command |
| `--version` | Show version information |

## Main Commands

### crawl

Run a complete crawl of all steps.

```bash
copima-cli-crawler crawl [options]
```

**Options:**

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--host` | string | GitLab instance URL | - |
| `--token` | string | Personal Access Token | - |
| `--account-id` | string | OAuth2 account ID | - |
| `--output` | string | Output directory | `./output` |
| `--config` | string | Config file path | `./copima.yaml` |
| `--steps` | string | Comma-separated steps | `areas,users,resources,repository` |
| `--resume` | boolean | Resume from checkpoint | `true` |
| `--dry-run` | boolean | Test without crawling | `false` |
| `--verbose` | boolean | Enable verbose logging | `false` |
| `--log-level` | string | Log level (error/warn/info/debug) | `info` |
| `--rate-limit` | number | Requests per second | `10` |

**Examples:**

```bash
# Full crawl with PAT
copima-cli-crawler crawl --host https://gitlab.com --token glpat-xxx

# Specific steps only
copima-cli-crawler crawl --steps areas,users

# Resume interrupted crawl
copima-cli-crawler crawl --resume true

# Dry run to test configuration
copima-cli-crawler crawl --dry-run

# Verbose logging
copima-cli-crawler crawl --verbose --log-level debug
```

### areas

Crawl groups and projects (Step 1).

```bash
copima-cli-crawler areas [options]
```

**Options:** Same as `crawl` command

**Additional Options:**

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--include-archived` | boolean | Include archived projects | `false` |
| `--include-personal` | boolean | Include personal namespaces | `true` |

**Examples:**

```bash
# Crawl all groups and projects
copima-cli-crawler areas

# Include archived projects
copima-cli-crawler areas --include-archived
```

### users

Crawl all users (Step 2).

```bash
copima-cli-crawler users [options]
```

**Options:** Same as `crawl` command

**Additional Options:**

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--include-blocked` | boolean | Include blocked users | `false` |
| `--include-bots` | boolean | Include bot users | `true` |

**Examples:**

```bash
# Crawl all active users
copima-cli-crawler users

# Include blocked users
copima-cli-crawler users --include-blocked
```

### resources

Crawl issues, MRs, labels, milestones, etc. (Step 3).

```bash
copima-cli-crawler resources [options]
```

**Options:** Same as `crawl` command

**Examples:**

```bash
# Crawl all resources
copima-cli-crawler resources

# With resume enabled
copima-cli-crawler resources --resume true
```

### repository

Crawl commits, branches, tags, and files (Step 4).

```bash
copima-cli-crawler repository [options]
```

**Options:** Same as `crawl` command

**Additional Options:**

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--commits-depth` | number | Max commits per branch | `1000` |
| `--include-diffs` | boolean | Include commit diffs | `false` |

**Examples:**

```bash
# Crawl repository data
copima-cli-crawler repository

# Limit commit history
copima-cli-crawler repository --commits-depth 100

# Include commit diffs
copima-cli-crawler repository --include-diffs
```

## Authentication Commands

### auth

Authenticate using OAuth2 flow.

```bash
copima-cli-crawler auth [options]
```

**Options:**

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--config` | string | Config file with OAuth2 settings | `./copima.yaml` |
| `--account-id` | string | Account identifier | Auto-generated |
| `--port` | number | Local server port | `3000` |
| `--no-browser` | boolean | Don't open browser automatically | `false` |

**Examples:**

```bash
# OAuth2 authentication flow
copima-cli-crawler auth

# Use specific account ID
copima-cli-crawler auth --account-id my-gitlab

# Manual browser flow
copima-cli-crawler auth --no-browser

# Use different port
copima-cli-crawler auth --port 8080
```

### account:add

Manually add an account with tokens.

```bash
copima-cli-crawler account:add [options]
```

**Options:**

| Option | Type | Description | Required |
|--------|------|-------------|----------|
| `--account-id` | string | Account identifier | Yes |
| `--access-token` | string | OAuth2 access token | Yes |
| `--refresh-token` | string | OAuth2 refresh token | Yes |

**Examples:**

```bash
copima-cli-crawler account:add \
  --account-id my-gitlab \
  --access-token oauth2_access_token \
  --refresh-token oauth2_refresh_token
```

### account:list

List all stored accounts.

```bash
copima-cli-crawler account:list [options]
```

**Options:**

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--verbose` | boolean | Show detailed information | `false` |

**Examples:**

```bash
# List accounts
copima-cli-crawler account:list

# With details
copima-cli-crawler account:list --verbose
```

### account:remove

Remove a stored account.

```bash
copima-cli-crawler account:remove [options]
```

**Options:**

| Option | Type | Description | Required |
|--------|------|-------------|----------|
| `--account-id` | string | Account identifier | Yes |

**Examples:**

```bash
copima-cli-crawler account:remove --account-id my-gitlab
```

### account:refresh

Manually refresh account tokens.

```bash
copima-cli-crawler account:refresh [options]
```

**Options:**

| Option | Type | Description | Required |
|--------|------|-------------|----------|
| `--account-id` | string | Account identifier | Yes |

**Examples:**

```bash
copima-cli-crawler account:refresh --account-id my-gitlab
```

## Configuration Commands

### config:show

Display current configuration.

```bash
copima-cli-crawler config:show [options]
```

**Options:**

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--format` | string | Output format (yaml/json) | `yaml` |
| `--section` | string | Show specific section | All |

**Examples:**

```bash
# Show all configuration
copima-cli-crawler config:show

# Show as JSON
copima-cli-crawler config:show --format json

# Show specific section
copima-cli-crawler config:show --section gitlab
```

### config:set

Set a configuration value.

```bash
copima-cli-crawler config:set [options]
```

**Options:**

| Option | Type | Description | Required |
|--------|------|-------------|----------|
| `--key` | string | Configuration key (dot notation) | Yes |
| `--value` | string | Value to set | Yes |
| `--config` | string | Config file to update | `./copima.yaml` |

**Examples:**

```bash
# Set GitLab host
copima-cli-crawler config:set --key gitlab.host --value https://gitlab.com

# Set log level
copima-cli-crawler config:set --key logging.level --value debug

# Update user config
copima-cli-crawler config:set --key gitlab.token --value glpat-xxx --config ~/.config/copima/config.yaml
```

### config:unset

Remove a configuration value.

```bash
copima-cli-crawler config:unset [options]
```

**Options:**

| Option | Type | Description | Required |
|--------|------|-------------|----------|
| `--key` | string | Configuration key to remove | Yes |
| `--config` | string | Config file to update | `./copima.yaml` |

**Examples:**

```bash
# Remove token
copima-cli-crawler config:unset --key gitlab.token

# Remove from user config
copima-cli-crawler config:unset --key gitlab.token --config ~/.config/copima/config.yaml
```

### config:validate

Validate configuration.

```bash
copima-cli-crawler config:validate [options]
```

**Options:**

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--config` | string | Config file to validate | `./copima.yaml` |

**Examples:**

```bash
# Validate current config
copima-cli-crawler config:validate

# Validate specific file
copima-cli-crawler config:validate --config ./prod.yaml
```

### setup

Interactive setup wizard.

```bash
copima-cli-crawler setup [options]
```

**Alias:** `config:setup`

**Options:**

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--config` | string | Config file to create/update | `./copima.yaml` |
| `--full` | boolean | Prompt for all values | `false` |

**Examples:**

```bash
# Basic setup
copima-cli-crawler setup

# Full setup with all options
copima-cli-crawler setup --full

# Create user config
copima-cli-crawler setup --config ~/.config/copima/config.yaml
```

## Testing Commands

### test

Run end-to-end tests.

```bash
copima-cli-crawler test <test-config> [options]
```

**Arguments:**

| Argument | Type | Description | Required |
|----------|------|-------------|----------|
| `test-config` | string | Path to test YAML config | Yes |

**Options:**

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--dry-run` | boolean | Test configuration only | `false` |

**Examples:**

```bash
# Run basic test
copima-cli-crawler test examples/unified-config.yaml

# Test configuration without execution
copima-cli-crawler test examples/test-config.yaml --dry-run
```

## Utility Commands

### install

Install shell completion.

```bash
copima-cli-crawler install [options]
```

**Options:**

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--bash` | boolean | Install bash completion | `false` |

**Examples:**

```bash
# Install bash completion
copima-cli-crawler install --bash
source ~/.bashrc
```

### --help

Show help for any command.

```bash
copima-cli-crawler --help
copima-cli-crawler <command> --help
```

**Examples:**

```bash
# General help
copima-cli-crawler --help

# Command-specific help
copima-cli-crawler crawl --help
copima-cli-crawler auth --help
```

### --version

Show version information.

```bash
copima-cli-crawler --version
```

## Global Options

These options work with all commands:

| Option | Type | Description |
|--------|------|-------------|
| `--help` | boolean | Show help |
| `--version` | boolean | Show version |
| `--config` | string | Config file path |
| `--verbose` | boolean | Verbose output |
| `--log-level` | string | Logging level |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `2` | Configuration error |
| `3` | Authentication error |
| `4` | Network error |
| `5` | File system error |

## Environment Variables

See [Configuration](../core-concepts/Configuration.md) for full list.

**Common variables:**

```bash
export GITLAB_HOST="https://gitlab.com"
export GITLAB_TOKEN="glpat-xxx"
export COPIMA_OUTPUT_ROOT_DIR="./output"
export COPIMA_LOG_LEVEL="info"
```

---

**Command Reference Version**: 1.0.0  
**Last Updated**: 2025-10-19
