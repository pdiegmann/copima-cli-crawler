# Important Preface

## Must-Use Libraries and Utilities

This project REQUIRES the STRICT USAGE of CERTAIN LIBRARIES AND UTILITIES whenever applicable:

1. [strictly](https://bloomberg.github.io/stricli/docs/getting-started/overview) for anything interfacing with the usage of this project as CLI tool
2. Bun as runtime and package manager
3. ESLint and Prettier for linting and formatting
4. [winston](https://github.com/winstonjs/winston) as logging provider with /src/utils/logger.ts being the central/default logger
5. [picocolors](https://github.com/alexeyraspopov/picocolors) for terminal output formatting with colors
6. [treeify](https://github.com/notatestuser/treeify) for converting JS/TS objects into nicely formatted trees for terminal output
7. [drizzle-orm](https://orm.drizzle.team/docs/overview) for database access and as ORM with Bun's integrated sqlite driver

## Non-Negotiable Assumptions

The following rules MUST always be respected during design and implementation:

1. Authentication MUST use **OAuth2 access tokens** only.
2. Refreshing access tokens MUST also update the refresh tokens in the database.
   - Refresh tokens may be invalidated after use.
   - The refresh token from the refresh response MUST replace the old refresh token.
3. Both GraphQL and REST APIs MUST be used.
   - GraphQL is preferred when/where possible.
   - REST is required for commits, file contents, and other REST-only resources.
4. Libraries and Frameworks MUST be preferred over custom implementations. Before adding any complex code, make sure that no library or framework exists that could be used to simplify the implementation.
5. Code MUST NOT be duplicated.
   - "Extended" or "fixed" file variants are forbidden.
   - Existing files MUST be updated in place.
   - Before adding new files, you MUST check if similar files already exist that could be used or extended.
6. Fixes MUST be tested and validated before they can be accepted.
7. Errors or incomplete work MUST trigger iterative improvement until validation succeeds.
8. Simplicity MUST be prioritized in all design and code decisions.

## Account and Credentials Database Schema

```ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  banExpires: integer("ban_expires", { mode: "timestamp" }),
  banned: integer("banned", { mode: "boolean" }),
  banReason: text("ban_reason"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  id: text("id").primaryKey(),
  image: text("image"),
  name: text("name").notNull(),
  role: text("role"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const account = sqliteTable("account", {
  accessToken: text("access_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  accountId: text("account_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  id: text("id").primaryKey(),
  idToken: text("id_token"),
  password: text("password"),
  providerId: text("provider_id").notNull(),
  refreshToken: text("refresh_token"),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});
```

# Project Introduction

This project is aimed at crawling all accessible resources (e.g., groups, projects, repositories) from a GitLab instance via the GraphQL and REST APIs. For authentication, oAuth credentials (access and refresh tokens) are provided, as well as the GitLab instance's host.

## 📚 Documentation

- **[HOW_TO.md](HOW_TO.md)** - **Start here!** Complete beginner-friendly guide for using this tool
- **README.md** (this file) - Technical documentation for developers and advanced users
- **[docs/](docs/)** - Additional technical documentation

## 🚀 Quick Start

If you're new to this tool or want step-by-step instructions, see the **[HOW_TO.md](HOW_TO.md)** guide.

For experienced users, here's a quick start:

```bash
# 1. Run interactive setup
copima-cli-crawler setup

# 2. Authenticate
copima-cli-crawler auth

# 3. Crawl GitLab data
copima-cli-crawler crawl
```

## 📖 Basic CLI Usage

### Main Crawl Command

```bash
# Crawl all data (all 4 steps)
copima-cli-crawler crawl

# Crawl specific steps only
copima-cli-crawler crawl --steps areas,users

# Resume an interrupted crawl
copima-cli-crawler crawl --resume true

# Specify output directory
copima-cli-crawler crawl --output ./my-data

# Run in dry-run mode (test configuration)
copima-cli-crawler crawl --dry-run true
```

### Individual Step Commands

You can also run each crawling step individually:

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

### Configuration Management

```bash
# Interactive setup wizard
copima-cli-crawler setup

# View current configuration
copima-cli-crawler config:show

# Set a configuration value
copima-cli-crawler config:set --key gitlab.host --value https://gitlab.com

# Validate configuration
copima-cli-crawler config:validate
```

### Account Management

```bash
# Add an account with access token
copima-cli-crawler account:add --access-token YOUR_TOKEN

# List all stored accounts
copima-cli-crawler account:list

# Authenticate with OAuth2
copima-cli-crawler auth
```

### Common Options

| Option | Description | Example |
|--------|-------------|---------|
| `--host` | GitLab instance URL | `--host https://gitlab.com` |
| `--access-token` | Access token for authentication | `--access-token glpat-xxx...` |
| `--output` | Output directory for data | `--output ./my-data` |
| `--steps` | Comma-separated steps to run | `--steps areas,users` |
| `--resume` | Resume from last checkpoint | `--resume true` |
| `--verbose` | Enable detailed logging | `--verbose true` |
| `--help` | Show help for any command | `--help` |

For complete usage instructions, examples, and troubleshooting, see **[HOW_TO.md](HOW_TO.md)**.

## Abstract Workflow

The resources to be crawled are organized into four major steps.

- Steps **1–3** are handled via **GraphQL** (preferred when available).
- Step **4** covers **REST-only resources**.
- The JSON schema mapping in the next (sub-)section ["API Schema Mapping"](#api-schema-mapping) gives the exact correspondence between steps and GitLab API resource types.

**Step 1 – Gather available areas**

- Groups (`groups`, `group`)
- Projects (`projects`, `project`)

**Step 2 – Gather all available users**

- Users (`users`, `user`)

**Step 3 – Iterate over all areas**

- Common resources for groups/projects (members, labels, issues, MRs, etc.)
- Group-specific resources (epic hierarchy, boards, audit events, etc.)
- Project-specific resources (metadata, pipelines, releases, snippets, etc.)

**Step 4 – REST-only resources**

- Repository-level details (branches, commits, tags, file blobs, etc.)
- Global REST-only data (artifacts, job logs, dependency lists, etc.)
- Specialized REST-only domains (security, compliance, package registries, etc.)

## API Schema Mapping

The following JSON structure maps each crawling step to its corresponding
GraphQL types, fields, or REST endpoints.
This acts as the **canonical specification** for the implementation.

```json
{
  "steps": {
    "areas": {
      "graphql_types": ["Group", "Project"],
      "fields": ["id", "fullPath", "name", "visibility", "description", "createdAt", "updatedAt"],
      "notes": "Always available in GraphQL."
    },
    "users": {
      "graphql_types": ["User"],
      "fields": ["id", "username", "name", "publicEmail", "createdAt"],
      "notes": "Standard; some fields restricted by permissions."
    },
    "step_3_1_common_group_project": {
      "memberships": {
        "graphql_types": ["Group.members", "Project.members"],
        "fields": ["accessLevel", "user", "createdAt"],
        "notes": "Permissions required."
      },
      "labels": {
        "graphql_types": ["Label"],
        "fields": ["id", "title", "color", "description"],
        "notes": "Available in GraphQL."
      },
      "milestones": {
        "graphql_types": ["Milestone"],
        "fields": ["id", "title", "dueDate", "state", "createdAt"],
        "notes": "Available in GraphQL."
      },
      "issues": {
        "graphql_types": ["Issue"],
        "fields": ["id", "iid", "title", "state", "author", "assignees", "labels", "createdAt", "updatedAt"],
        "notes": "Available in GraphQL."
      },
      "merge_requests": {
        "graphql_types": ["MergeRequest"],
        "fields": ["id", "iid", "title", "state", "author", "assignees", "labels", "createdAt", "updatedAt", "headPipeline"],
        "notes": "Available; some CI-related fields limited."
      },
      "epics_work_items": {
        "graphql_types": ["Epic", "WorkItem"],
        "fields": ["id", "iid", "title", "state", "author", "createdAt", "updatedAt"],
        "notes": "Conditional: requires feature enabled."
      },
      "custom_emoji": {
        "graphql_types": ["CustomEmoji"],
        "fields": ["id", "name", "url"],
        "notes": "GraphQL support present."
      },
      "award_reactions": {
        "graphql_types": ["AwardEmoji"],
        "fields": ["id", "name", "user"],
        "notes": "GraphQL support present."
      },
      "pipeline_metadata": {
        "graphql_types": ["Pipeline"],
        "fields": ["id", "status", "ref", "createdAt", "finishedAt", "duration"],
        "notes": "Limited details; jobs/artifacts require REST."
      }
    },
    "step_3_2_group_specific": {
      "epic_hierarchy": {
        "graphql_types": ["Epic"],
        "fields": ["id", "title", "parent", "children"],
        "notes": "Conditional on feature flag."
      },
      "boards": {
        "graphql_types": ["Board", "BoardList"],
        "fields": ["id", "name", "lists"],
        "notes": "Available in GraphQL."
      },
      "ci_cd_variables": {
        "graphql_types": ["CiVariable"],
        "fields": ["key", "value", "environmentScope"],
        "notes": "Sensitive; permission-restricted."
      },
      "audit_events": {
        "graphql_types": ["AuditEvent"],
        "fields": ["id", "action", "author", "createdAt"],
        "notes": "Edition/feature-dependent."
      },
      "discussions_notes": {
        "graphql_types": ["Discussion", "Note"],
        "fields": ["id", "author", "body", "createdAt"],
        "notes": "Partially supported in GraphQL."
      }
    },
    "step_3_3_project_specific": {
      "releases_tags": {
        "graphql_types": ["Release", "Tag"],
        "fields": ["id", "name", "tagName", "releasedAt", "description"],
        "notes": "Releases supported; tags limited."
      },
      "container_registries": {
        "graphql_types": ["ContainerRepository"],
        "fields": ["id", "name", "path"],
        "notes": "Conditional; permissions required."
      },
      "snippets": {
        "graphql_types": ["Snippet"],
        "fields": ["id", "title", "author", "createdAt"],
        "notes": "Supported in GraphQL."
      }
    }
  },
  "rest_only": {
    "commits": {
      "endpoint": "/projects/:id/repository/commits",
      "fields": ["sha", "message", "parents", "stats", "diffs"],
      "notes": "Not in GraphQL."
    },
    "branches": {
      "endpoint": "/projects/:id/repository/branches",
      "fields": ["name", "merged", "protected", "commit"],
      "notes": "GraphQL limited; REST complete."
    },
    "tags": {
      "endpoint": "/projects/:id/repository/tags",
      "fields": ["name", "commit", "message"],
      "notes": "REST required for annotated tags."
    },
    "repository_tree": {
      "endpoint": "/projects/:id/repository/tree",
      "fields": ["path", "type", "size"],
      "notes": "GraphQL does not expose blobs or raw contents."
    },
    "file_blobs": {
      "endpoint": "/projects/:id/repository/blobs/:sha",
      "fields": ["content", "encoding"],
      "notes": "REST only."
    },
    "artifacts": {
      "endpoint": "/projects/:id/jobs/:job_id/artifacts",
      "fields": ["file", "logs"],
      "notes": "REST only."
    },
    "security_compliance_packages": {
      "endpoints": ["/projects/:id/vulnerabilities", "/projects/:id/dependencies", "/projects/:id/packages", "/projects/:id/compliance_frameworks"],
      "notes": "REST only; GraphQL does not expose."
    }
  }
}
```

## Core Responsibilities

The application must implement the following **core responsibilities** in addition to crawling:

1. **Progress Reporting**: The app should use advanced terminal formatting techniques to display the current progress as well as events or logs. More importantly, it should provide the current progress (potentially something like the amount of progressed resources or similar if a true progress is unknown) in form of a file that the progress report in YAML-format is written to every second or so. The app should constantly keep a write-lock of this file but allow for other processes to read from the file. The file should always represent only the most recent progress, NOT be an historic timeline.
2. **Resume Capabilities**: Similar to the above feature, the app should support resuming work it started before. Given the same GitLab instance, the app should first read the to-be-resumed state to know which requests can be skipped because they have already been handled.
3. **Data Processing Callback**: For customized data cleaning the app should support a "hook" or "callback" that can be tapped into that is being called for each parsed object (and the contextual information such as host, account id of the authentication credentials, resource type etc.) which can control if an object is being stored at all or not (i.e., filtering and deduplication) and can modify the object (e.g., changing properties' values, adding or removing properties).
4. **JSONL data storage**: All processed data should be stored in JSONL-files which enables lightweight write processes. The data should be stored in a folder structure that mirrors the hierarchical structure of the areas (i.e., GitLab's groups and projects) beneath a provided "root" directory. Within each such directory, each resource type must be stored in its own JSONL file (e.g., `users.jsonl`, `commits.jsonl`). File names must be deterministic and lowercase to avoid duplicates (e.g., `users.jsonl` not `Users.jsonl`).
5. **Configuration**: The app should support three different ways of configuration in descending level of importance/weight:
6. Arguments passed to the app
7. Environment variables
8. YAML-based configuration file in the user's home configuration directory (e.g., ~/.config/copima)
9. YAML-based configuration file in the current working directory
10. Built-time defaults derived from a YAML-based configuration file in the project's root directory

## Interactive Configuration Setup

The CLI ships with an interactive setup wizard that guides you through the configuration process. Launch it with:

```bash
copima-cli-crawler config:setup
# or simply
copima-cli-crawler setup
```

### Setup Wizard Features

- **`--config`** - Specify a configuration file path (default: `./copima.yaml` or `~/.config/copima/config.yaml`)
- **`--full`** - Re-prompt for all values, not just missing ones (default: true)

The wizard will:
1. Prompt for GitLab instance URL
2. Configure authentication (OAuth2 or Personal Access Token)
3. Set output directory and other options
4. Automatically launch the OAuth2 authentication flow (if configured)
5. Save the configuration file

### Configuration Priority (Highest to Lowest)

1. Command-line arguments (e.g., `--host https://gitlab.com`)
2. Environment variables (e.g., `GITLAB_HOST=https://gitlab.com`)
3. User configuration file (`~/.config/copima/config.yaml`)
4. Local configuration file (`./copima.yaml`)
5. Built-in defaults

### Example: Manual Configuration

If you prefer not to use the wizard, you can create a `copima.yaml` file manually:

```yaml
gitlab:
  host: "https://gitlab.com"
  apiVersion: "v4"
  
output:
  directory: "./output"
  format: "jsonl"

logging:
  level: "info"
  
oauth:
  clientId: "your-client-id"
  clientSecret: "your-client-secret"
  redirectUri: "http://localhost:8080/callback"
```

For complete configuration documentation, see [HOW_TO.md](HOW_TO.md).

## Testing and Validation

The project includes comprehensive E2E testing capabilities to validate the crawler functionality.

### Available Test Configurations

The `examples/` directory contains several test configurations:

1. **unified-config.yaml** - Basic E2E test with PAT authentication
   - Tests: areas + users steps
   - Auth: Personal Access Token
   - Instance: git.hnnl.eu
   - Cleanup: Remove on success, keep on failure

2. **test-configs/dry-run-test.yaml** - Mock execution without API calls
   - Tests: areas + users + resources steps
   - Auth: Mock token (no real API calls)
   - Cleanup: Remove on success, keep on failure

3. **test-configs/template-test.yaml** - Full configuration example
   - Tests: All steps with comprehensive validation
   - Auth: Personal Access Token
   - Shows: All available configuration options

4. **test-configs/test-suite.yaml** - Test suite orchestration
   - Runs: Multiple tests sequentially
   - Contains: Dry-run + Basic + Template tests

### Running Tests

```bash
# Basic E2E test (areas + users)
bun run test:e2e:basic

# Dry-run test (mock mode)
bun run test:e2e:dry-run

# Template test (full configuration)
bun run test:e2e:template

# Full test suite
bun run test:e2e:suite

# Run specific test configuration
bun run src/bin/cli.ts test examples/unified-config.yaml

# Unit tests
bun test                    # Bun test runner
bun run test               # Jest test suite
bun run test:watch         # Jest watch mode
bun run test:coverage      # Test coverage report
```

### Test Configuration Structure

```yaml
# GitLab connection
gitlab:
  host: "git.hnnl.eu"
  apiVersion: "v4"
  token: "your-access-token"
  sslVerify: true

# Test configuration
test:
  name: "Test Name"
  timeout: 300
  cleanup:
    enabled: true
    onFailure: "keep"
    onSuccess: "remove"

  steps:
    - name: "areas"
      enabled: true
    - name: "users"
      enabled: true

  validation:
    groups:
      minCount: 1
      requiredFields: ["id", "name", "fullPath"]
    users:
      minCount: 1
      requiredFields: ["id", "username", "email"]
```

### Test Modes

- **Real Mode**: Uses actual GitLab API with valid access token
- **Mock Mode**: Simulates API calls without connecting to GitLab (token starts with "mock_" or "test_")

### Validation

Tests validate:
- Output file existence and format (JSONL)
- Minimum record counts per resource type
- Required fields presence in each record
- Data structure integrity
- Cleanup behavior (success vs. failure)
