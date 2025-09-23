# General Rules

The following rules are in addition to all "common sense" or "default" rules.

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

# Project Introduction

This project is aimed at crawling all accessible resources (e.g., groups, projects, repositories) from a GitLab instance via the GraphQL and REST APIs. For authentication, oAuth credentials (access and refresh tokens) are provided, as well as the GitLab instance's host.

## Core Responsibilities

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

## Crawling

Details on the crawling process can be found, if necessary, in the [Crawling Process document](02-crwaling-process.md)