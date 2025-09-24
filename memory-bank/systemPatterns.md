# System Architecture and Non-Negotiable Patterns

The following rules are foundational to the project's design and must be adhered to without exception.

### Abstract Workflow

The application's core workflow for crawling resources is organized into a four-step process:

1.  **Gather available areas** from the GitLab instance, including groups and projects.
2.  **Gather all available users**.
3.  **Iterate over all areas** to gather common group/project resources (e.g., members, labels) and specific resources for each.
4.  **Cover REST-only resources** such as repository-level details and other global data.

The API Schema Mapping in the `README.md` serves as the canonical specification for this workflow.

---

### Core Responsibilities

The application must implement the following core responsibilities in addition to the crawling workflow:

- **Progress Reporting**: The app should use advanced terminal formatting and constantly write a YAML-formatted progress report to a file. This file should only contain the most recent progress and be readable by other processes.
- **Resume Capabilities**: The application must be able to resume a previously started job by reading the saved state and skipping requests that have already been handled.
- **Data Processing Callback**: The application must support a configurable "hook" or "callback" that can be used to filter, deduplicate, and modify each parsed object before storage.
- **JSONL Data Storage**: All processed data must be stored in JSONL files. The folder structure for these files must mirror the hierarchical structure of the areas (groups and projects) from the GitLab API. Each resource type must have its own deterministic, lowercase file within each directory (e.g., `users.jsonl` vs. `Users.jsonl`).
- **Configuration**: The app should support a five-level configuration hierarchy in descending order of precedence:
  1.  Arguments passed to the application.
  2.  Environment variables.
  3.  A YAML configuration file in the user's home configuration directory.
  4.  A YAML configuration file in the current working directory.
  5.  Built-time defaults from a YAML configuration file in the project's root directory.

## Authentication

- **OAuth2 Access Tokens**: Authentication must be exclusively handled using OAuth2 access tokens.
- **Token Refreshing**: When an access token is refreshed, the new refresh token received in the response must be used to replace the old one in the database. Note that the old refresh token may be invalidated after use.

## API Usage

- **Dual API Support**: The application must support both GraphQL and REST APIs.
- **GraphQL Preference**: GraphQL is the preferred method for interacting with APIs wherever possible.
- **REST Requirement**: REST APIs are required for specific resources, such as fetching commits and file contents, which may not be fully supported by a GraphQL endpoint.

## Data Processing

- **Callback Hook**: The application must support a configurable data processing callback. This callback will be invoked for each parsed object and will receive contextual information (e.g., host, account ID, resource type).
- **Callback Functionality**: The callback must be able to:
  - Control whether an object is stored (e.g., for filtering or deduplication).
  - Modify the object's properties (e.g., changing values or adding/removing properties).

## Data Storage

- **JSONL Format**: All processed data must be stored in JSONL (JSON Lines) files to enable a lightweight and efficient write process.
- **Hierarchical Folder Structure**: Data must be saved in a folder structure that mirrors the hierarchical organization of the source API (e.g., GitLab's groups and projects). This structure will be contained within a user-provided root directory.
- **Deterministic File Names**: Within each directory, each resource type must be stored in its own dedicated, lowercase JSONL file (e.g., `users.jsonl` not `Users.jsonl`). This ensures file names are consistent and avoids duplicates.

## Configuration

The application must support five levels of configuration, in descending order of precedence:

1.  Arguments passed directly to the application.
2.  Environment variables.
3.  A YAML configuration file in the user's home configuration directory (e.g., `~/.config/copima`).
4.  A YAML configuration file in the current working directory.
5.  Built-time defaults derived from a YAML configuration file in the project's root directory.
