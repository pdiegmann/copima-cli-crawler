# COPIMA CLI Crawler

[![Build and Test](https://github.com/pdiegmann/copima-cli-crawler/actions/workflows/build-test.yml/badge.svg)](https://github.com/pdiegmann/copima-cli-crawler/actions/workflows/build-test.yml)
[![codecov](https://codecov.io/gh/pdiegmann/copima-cli-crawler/branch/main/graph/badge.svg)](https://codecov.io/gh/pdiegmann/copima-cli-crawler)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful command-line tool for extracting and crawling data from GitLab instances via GraphQL and REST APIs.

## 🚀 Quick Start

```bash
# 1. Run interactive setup
copima-cli-crawler setup

# 2. Authenticate with GitLab
copima-cli-crawler auth

# 3. Start crawling
copima-cli-crawler crawl
```

Output will be saved to `./output` directory by default.

## 📚 Documentation

**For complete documentation, guides, and examples, visit the [Wiki](https://github.com/pdiegmann/copima-cli-crawler/wiki).**

### Key Documentation Pages

- **[How-To Guide](https://github.com/pdiegmann/copima-cli-crawler/wiki/How-To-Guide)** - Complete beginner-friendly guide for non-technical users
- **[Quick Start](https://github.com/pdiegmann/copima-cli-crawler/wiki/getting-started-Quick-Start)** - Get up and running in 5 minutes
- **[Installation](https://github.com/pdiegmann/copima-cli-crawler/wiki/getting-started-Installation)** - Detailed installation instructions
- **[Authentication Setup](https://github.com/pdiegmann/copima-cli-crawler/wiki/guides-Authentication-Setup)** - Setting up PAT or OAuth2 authentication
- **[Configuration System](https://github.com/pdiegmann/copima-cli-crawler/wiki/core-concepts-Configuration)** - 5-level configuration hierarchy
- **[Command Reference](https://github.com/pdiegmann/copima-cli-crawler/wiki/guides-Command-Reference)** - Complete CLI command documentation
- **[Architecture Overview](https://github.com/pdiegmann/copima-cli-crawler/wiki/architecture-Overview)** - System design and structure
- **[Troubleshooting](https://github.com/pdiegmann/copima-cli-crawler/wiki/troubleshooting-Common-Issues)** - Common issues and solutions
- **[Changelog](https://github.com/pdiegmann/copima-cli-crawler/wiki/Changelog)** - Release notes and version history

## 📖 What Does This Tool Do?

The COPIMA CLI Crawler systematically extracts comprehensive data from GitLab instances through a four-step crawling process:

### Four-Step Crawling Process

1. **Areas** - Gather all accessible groups and projects
2. **Users** - Collect user information
3. **Resources** - Extract issues, merge requests, labels, milestones, epics, pipelines, etc.
4. **Repository** - Crawl commits, branches, tags, and file contents

### Key Features

- **Resume Support** - Pause and resume crawls without data loss
- **Progress Tracking** - Real-time YAML progress reports
- **Deduplication** - Automatic prevention of duplicate data
- **Custom Callbacks** - Hook into the data processing pipeline
- **Flexible Authentication** - Personal Access Tokens or OAuth2
- **Hierarchical Storage** - Mirror GitLab's group/project structure in JSONL format
- **E2E Testing** - Built-in test framework for validation

## 🎯 Basic Usage

### Main Commands

```bash
# Interactive setup wizard
copima-cli-crawler setup

# Authenticate with GitLab
copima-cli-crawler auth

# Crawl all data (all 4 steps)
copima-cli-crawler crawl

# Crawl specific steps only
copima-cli-crawler crawl --steps areas,users

# Resume an interrupted crawl
copima-cli-crawler crawl --resume true

# Run in dry-run mode (test configuration)
copima-cli-crawler crawl --dry-run true
```

### Individual Step Commands

```bash
# Step 1: Crawl groups and projects
copima-cli-crawler areas

# Step 2: Crawl users
copima-cli-crawler users

# Step 3: Crawl issues, MRs, and other resources
copima-cli-crawler resources

# Step 4: Crawl commits, branches, tags, and files
copima-cli-crawler repository
```

### Configuration & Account Management

```bash
# View current configuration
copima-cli-crawler config:show

# Validate configuration
copima-cli-crawler config:validate

# Add an account with access token
copima-cli-crawler account:add --access-token YOUR_TOKEN

# List all stored accounts
copima-cli-crawler account:list
```

For detailed usage instructions, examples, and troubleshooting, see the **[How-To Guide](https://github.com/pdiegmann/copima-cli-crawler/wiki/How-To-Guide)** and **[Command Reference](https://github.com/pdiegmann/copima-cli-crawler/wiki/guides-Command-Reference)** in the wiki.

## 🔑 Authentication

The crawler supports two authentication methods:

1. **Personal Access Token (PAT)** - Simple token-based auth
   - Pass via `--access-token` flag or `GITLAB_TOKEN` environment variable
   - Best for quick tests and automation

2. **OAuth2** - Secure OAuth2 flow
   - Run `copima-cli-crawler auth` to authenticate via browser
   - Tokens stored and automatically refreshed
   - Best for interactive use

See the **[Authentication Setup Guide](https://github.com/pdiegmann/copima-cli-crawler/wiki/guides-Authentication-Setup)** for detailed instructions.

## 🛠 Technology Stack

- **[Stricli](https://bloomberg.github.io/stricli/)** - CLI framework
- **[Bun](https://bun.sh)** - JavaScript runtime and package manager
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Drizzle ORM](https://orm.drizzle.team/)** - Database ORM with Bun SQLite
- **[Winston](https://github.com/winstonjs/winston)** - Logging framework
- **GraphQL + REST API** - GitLab API integration

## 🧪 Testing

```bash
# Unit tests
bun test

# E2E tests
bun run test:e2e:basic      # Basic test
bun run test:e2e:suite      # Full test suite
bun run test:coverage       # Coverage report
```

See the **[Testing Guide](https://github.com/pdiegmann/copima-cli-crawler/wiki/guides-Testing)** for more information.

## 🚧 Development

```bash
# Install dependencies
bun install

# Development mode
bun run dev

# Build
bun run build

# Lint and format
bun run lint:fix
```

See the **[Development Setup](https://github.com/pdiegmann/copima-cli-crawler/wiki/development-Setup)** guide for detailed development instructions.

## 🚀 Release Process

This project uses an automated release workflow that:

1. **Builds** cross-platform executables (Windows, macOS Intel, macOS ARM64)
2. **Runs** tests with coverage reporting
3. **Updates** the CHANGELOG.md automatically with release information
4. **Creates** a GitHub release with downloadable binaries

### Creating a Release

To create a new release:

1. Update the version in `package.json`:
   ```bash
   # Update version field in package.json
   npm version patch|minor|major
   ```

2. Create and push a git tag:
   ```bash
   git tag v0.2.5
   git push origin v0.2.5
   ```

3. The GitHub Actions workflow will automatically:
   - Build executables for all platforms
   - Update CHANGELOG.md with the new version
   - Create a GitHub release with binaries and checksums
   - Commit the updated CHANGELOG.md back to the main branch

### Changelog Management

The CHANGELOG.md follows [Keep a Changelog](https://keepachangelog.com/) format and is automatically updated during releases with:

- Version number and release date
- Template sections for Added, Fixed, and Changed items
- Version reference links

You can manually update the changelog entry after release to add specific details about what changed in that version.

To manually update the changelog locally:

```bash
bun run scripts/update-changelog.ts <version> [date] [changes]
```

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- **[GitHub Repository](https://github.com/pdiegmann/copima-cli-crawler)**
- **[Issue Tracker](https://github.com/pdiegmann/copima-cli-crawler/issues)**
- **[Wiki Documentation](https://github.com/pdiegmann/copima-cli-crawler/wiki)**

---

# Rules for AI Agents

This section contains rules and constraints for AI agents working with this codebase.

## Must-Use Libraries and Utilities

This project REQUIRES the STRICT USAGE of CERTAIN LIBRARIES AND UTILITIES whenever applicable:

1. **[Stricli](https://bloomberg.github.io/stricli/docs/getting-started/overview)** - For anything interfacing with the usage of this project as CLI tool
2. **Bun** - As runtime and package manager
3. **ESLint and Prettier** - For linting and formatting
4. **[Winston](https://github.com/winstonjs/winston)** - As logging provider with `/src/utils/logger.ts` being the central/default logger
5. **[Picocolors](https://github.com/alexeyraspopov/picocolors)** - For terminal output formatting with colors
6. **[Treeify](https://github.com/notatestuser/treeify)** - For converting JS/TS objects into nicely formatted trees for terminal output
7. **[js-yaml](https://github.com/nodeca/js-yaml)** - For YAML configuration and storage
8. **[Drizzle ORM](https://orm.drizzle.team/)** - For database access with Bun SQLite driver

## Non-Negotiable Assumptions

The following rules MUST always be respected during design and implementation:

1. **Authentication** supports both **Personal Access Tokens (PAT)** and **OAuth2 access tokens**.
   - PATs are simple and never stored - just passed as arguments/environment variables.
   - OAuth2 tokens are stored in the database with account identifiers for automatic refresh.

2. **Refreshing access tokens MUST also update the refresh tokens** in storage.
   - Refresh tokens may be invalidated after use.
   - The refresh token from the refresh response MUST replace the old refresh token.

3. **Both GraphQL and REST APIs MUST be used**.
   - GraphQL is preferred when/where possible.
   - REST is required for commits, file contents, and other REST-only resources.

4. **Libraries and Frameworks MUST be preferred** over custom implementations.
   - Before adding any complex code, verify that no library or framework exists that could simplify the implementation.

5. **Code MUST NOT be duplicated**.
   - "Extended" or "fixed" file variants are forbidden.
   - Existing files MUST be updated in place.
   - Before adding new files, check if similar files already exist that could be used or extended.

6. **Fixes MUST be tested and validated** before they can be accepted.

7. **Errors or incomplete work MUST trigger iterative improvement** until validation succeeds.

8. **Simplicity MUST be prioritized** in all design and code decisions.

## Core Application Responsibilities

The application implements the following core responsibilities:

### 1. Progress Reporting

- Use advanced terminal formatting to display current progress and events
- Write progress to YAML file every second with write-lock (allow read access)
- File represents only the most recent progress, NOT historic timeline
- See: `src/reporting/` for implementation

### 2. Resume Capabilities

- Support resuming interrupted crawls from checkpoint state
- Read resume state to skip already-processed requests
- Maintain state persistence across runs
- See: `src/resume/` for implementation

### 3. Data Processing Callback

- Support hooks/callbacks for custom data processing
- Called for each parsed object with contextual information (host, account ID, resource type)
- Enable filtering, deduplication, and object modification
- See: `src/callback/` for implementation

### 4. JSONL Data Storage

- Store all data in JSONL (JSON Lines) format
- Mirror GitLab's hierarchical structure (groups/projects) in folder structure
- Each resource type in its own JSONL file (e.g., `users.jsonl`, `commits.jsonl`)
- File names must be deterministic and lowercase
- See: `src/storage/` for implementation

### 5. Configuration System

Five-level configuration hierarchy (highest to lowest priority):

1. Command-line arguments
2. Environment variables
3. User configuration file (`~/.config/copima/config.yaml`)
4. Local configuration file (`./copima.yaml`)
5. Built-in defaults

See: `src/config/` for implementation

## API Integration Patterns

### GraphQL Usage (Steps 1-3)

- **Step 1**: Groups and projects
- **Step 2**: Users
- **Step 3**: Common resources (issues, MRs, labels, milestones, etc.)
  - Group-specific: epics, boards, audit events
  - Project-specific: releases, snippets, container registries

### REST Usage (Step 4)

- Repository data: commits, branches, tags, file contents
- Artifacts, job logs
- Security compliance data
- Any resources not available via GraphQL

### Error Handling

- Graceful degradation when GraphQL unavailable
- Automatic fallback to REST endpoints
- Retry logic with exponential backoff
- Comprehensive error logging and context preservation

## Database Schema (Drizzle ORM)

### User Table

- OAuth2 user information
- Ban management and role system

### Account Table

- Links users to OAuth providers
- Stores access tokens and refresh tokens
- Enables automatic token refresh

See: `src/db/schema.ts` for complete schema

## CLI Framework (Stricli)

- **Entry Point**: `src/bin/cli.ts` - Main CLI with authentication logic
- **App Definition**: `src/app.ts` - Route configuration and command mapping
- **Context**: `src/context.ts` - Command context building with API clients
- **Commands**: `src/commands/` - Individual command implementations

## File Organization

- **Core Systems**: `src/storage/`, `src/reporting/`, `src/resume/`, `src/callback/`
- **API Clients**: `src/api/gitlabGraphQLClient.ts`, `src/api/gitlabRestClient.ts`
- **Configuration**: `src/config/`
- **Database**: `src/db/`
- **Authentication**: `src/auth/`
- **Logging**: `src/utils/logger.ts`

## Development Workflow

1. **Authentication First** - Store OAuth tokens or use PAT
2. **Configuration** - Use setup wizard or manual YAML configuration
3. **Testing** - Validate with E2E tests before deployment
4. **Linting** - Run `bun run lint:fix` before committing
5. **Validation** - Ensure all tests pass

## Token Refresh Strategy

**CRITICAL**: When refreshing OAuth2 tokens:

1. Make refresh request with current refresh token
2. Receive new access token AND new refresh token
3. **MUST update both tokens in storage**
4. Old refresh token is invalidated after use
5. Failure to update refresh token breaks future refresh attempts

See: `src/auth/tokenManager.ts` for implementation
