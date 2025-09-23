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
      "endpoints": [
        "/projects/:id/vulnerabilities",
        "/projects/:id/dependencies",
        "/projects/:id/packages",
        "/projects/:id/compliance_frameworks"
      ],
      "notes": "REST only; GraphQL does not expose."
    }
  }
}
```

## Data processing and storage

The application must implement the following **core responsibilities** in addition to crawling:

1. **Progress Reporting**: The app should use advanced terminal formatting techniques to display the current progress as well as events or logs. More importantly, it should provide the current progress (potentially something like the amount of progressed resources or similar if a true progress is unknown) in form of a file that the progress report in YAML-format is written to every second or so. The app should constantly keep a write-lock of this file but allow for other processes to read from the file. The file should always represent only the most recent progress, NOT be an historic timeline.
2. **Resume Capabilities**: Similar to the above feature, the app should support resuming work it started before. Given the same GitLab instance, the app should first read the to-be-resumed state to know which requests can be skipped because they have already been handled.
3. **Data Processing Callback**: For customized data cleaning the app should support a "hook" or "callback" that can be tapped into that is being called for each parsed object (and the contextual information such as host, account id of the authentication credentials, resource type etc.) which can control if an object is being stored at all or not (i.e., filtering and deduplication) and can modify the object (e.g., changing properties' values, adding or removing properties).
4. **JSONL data storage**: All processed data should be stored in JSONL-files which enables lightweight write processes. The data should be stored in a folder structure that mirrors the hierarchical structure of the areas (i.e., GitLab's groups and projects) beneath a provided "root" directory. Within each such directory, each resource type must be stored in its own JSONL file (e.g., `users.jsonl`, `commits.jsonl`). File names must be deterministic and lowercase to avoid duplicates (e.g., `users.jsonl` not `Users.jsonl`).
5. **Configuration**: The app should support three different ways of configuration in descending level of importance/weight:
  1. Arguments passed to the app
  2. Environment variables
  3. YAML-based configuration file in the user's home configuration directory (e.g., ~/.config/copima)
  4. YAML-based configuration file in the current working directory
  5. Built-time defaults derived from a YAML-based configuration file in the project's root directory