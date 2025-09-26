# Test Configuration Examples

This directory contains example YAML configuration files for the GitLab crawler end-to-end testing system.

## Available Test Configurations

### 1. `template-test.yaml`
A complete template with empty/placeholder values that you can copy and fill in with your actual GitLab instance details.

**Usage:**
```bash
# Copy template and fill in your values
cp examples/test-configs/template-test.yaml my-test-config.yaml
# Edit my-test-config.yaml with your GitLab details
# Run your custom test
bun run test:e2e my-test-config.yaml
```

### 2. `dry-run-test.yaml`
A minimal configuration for testing the validation system without requiring actual GitLab credentials.

**Usage:**
```bash
# Validate configuration only (no actual crawling)
bun run test:e2e:dry-run
# This runs: bun run test:e2e examples/test-configs/dry-run-test.yaml --validate-only
```

### 3. `basic-test.yaml`
Example configuration using environment variables for sensitive data.

**Usage:**
```bash
# Set environment variables first
export GITLAB_ACCESS_TOKEN="your_access_token_here"
export GITLAB_REFRESH_TOKEN="your_refresh_token_here"
# Run basic test
bun run test:e2e:basic
```

### 4. `test-suite.yaml`
Comprehensive test suite with multiple test scenarios.

**Usage:**
```bash
# Run complete test suite
bun run test:e2e:suite
```

## Configuration Structure

Each test configuration file contains the following sections:

### `metadata`
- `name`: Human-readable test name
- `description`: Test description
- `version`: Configuration version
- `author`: Test author
- `tags`: Tags for categorization
- `timeout`: Maximum test execution time (milliseconds)

### `gitlab`
- `host`: GitLab instance URL (e.g., "https://gitlab.com")
- `accessToken`: GitLab personal access token
- `refreshToken`: GitLab refresh token (optional)
- `timeout`: API request timeout
- `maxConcurrency`: Maximum concurrent requests
- `oauth2`: OAuth2 configuration (optional)

### `execution`
- `workingDir`: Directory for test execution
- `outputDir`: Output directory for crawler results
- `databasePath`: SQLite database path
- `steps`: Which crawler steps to run (`["areas", "users", "resources", "repository"]`)
- `testResume`: Test resume functionality
- `testCallbacks`: Test callback functionality

### `validation`
- `expectedFiles`: List of expected output files with validation rules
- `logs`: Log validation rules (expected messages, forbidden messages, error limits)
- `performance`: Performance validation (execution time limits)
- `dataQuality`: Data quality validation rules

### `cleanup`
- `cleanOutputDir`: Clean output directory after test
- `cleanDatabase`: Clean database after test
- `cleanLogs`: Clean log files after test
- `keepOnFailure`: Keep files if test fails (for debugging)

## Getting Started

1. **For Configuration Validation Only:**
   ```bash
   bun run test:e2e:dry-run
   ```

2. **For Your GitLab Instance:**
   ```bash
   # Copy template
   cp examples/test-configs/template-test.yaml my-gitlab-test.yaml

   # Edit the file and fill in:
   # - gitlab.host: Your GitLab instance URL
   # - gitlab.accessToken: Your personal access token
   # - gitlab.refreshToken: Your refresh token (if using OAuth2)
   # - execution paths as needed

   # Run your test
   bun run test:e2e my-gitlab-test.yaml
   ```

3. **Using Environment Variables:**
   ```bash
   export GITLAB_ACCESS_TOKEN="glpat-your-token-here"
   export GITLAB_REFRESH_TOKEN="your-refresh-token" # optional
   bun run test:e2e:basic
   ```

## Command Line Options

- `--validate-only`: Only validate configuration, don't run crawler
- `--format <format>`: Output format (html, json, yaml)
- `--output <file>`: Output file path
- `--verbose`: Verbose logging
- `--help`: Show help information

## Environment Variable Substitution

Configuration files support environment variable substitution using `${VARIABLE_NAME}` syntax:

```yaml
gitlab:
  host: "${GITLAB_HOST}"
  accessToken: "${GITLAB_ACCESS_TOKEN}"
  refreshToken: "${GITLAB_REFRESH_TOKEN}"
```

This allows you to keep sensitive credentials out of configuration files.

## Notes

- The system requires proper GitLab credentials to function
- Template files provide complete structure for customization
- Environment variables are recommended for sensitive data
- All test configurations are validated before execution
