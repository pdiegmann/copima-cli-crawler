# GitLabRestClient API Reference

Complete API reference for the REST client used to interact with GitLab's REST API v4.

## Overview

`GitLabRestClient` provides access to GitLab resources only available via REST API, including commits, file contents, and repository data.

**Location**: `src/api/gitlabRestClient.ts`

## Class: GitLabRestClient

### Constructor

```typescript
new GitLabRestClient(
  baseUrl: string,
  accessToken: string,
  options?: {
    timeout?: number;
    retries?: number;
  }
)
```

**Parameters:**

- `baseUrl` (string): GitLab instance URL
- `accessToken` (string): Authentication token
- `options` (object, optional):
  - `timeout` (number): Request timeout in ms (default: 30000)
  - `retries` (number): Max retry attempts (default: 3)

**Example:**

```typescript
import { GitLabRestClient } from './api';

const client = new GitLabRestClient(
  'https://gitlab.com',
  'glpat-xxxxxxxxxxxxxxxxxxxx',
  { timeout: 60000 }
);
```

### Methods

#### get(endpoint, params)

Make a GET request to the REST API.

**Signature:**
```typescript
async get<T>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T>
```

**Example:**
```typescript
const project = await client.get('/projects/123');
```

#### getAll(endpoint, params)

Get all pages of a paginated endpoint.

**Signature:**
```typescript
async getAll<T>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T[]>
```

**Example:**
```typescript
const commits = await client.getAll(
  '/projects/123/repository/commits'
);
```

#### getCommits(projectId, options)

Get commits for a project.

**Signature:**
```typescript
async getCommits(
  projectId: string | number,
  options?: {
    ref?: string;
    since?: string;
    until?: string;
    per_page?: number;
  }
): Promise<Commit[]>
```

**Example:**
```typescript
const commits = await client.getCommits('123', {
  ref: 'main',
  per_page: 100
});
```

#### getBranches(projectId)

Get branches for a project.

**Example:**
```typescript
const branches = await client.getBranches('123');
```

#### getFile(projectId, filePath, ref)

Get file contents from repository.

**Example:**
```typescript
const readme = await client.getFile(
  '123',
  'README.md',
  'main'
);
```

## See Also

- [GraphQL Client API](GraphQL-Client.md)
- [API Integration](../architecture/API-Integration.md)

---

**Last Updated**: 2025-10-20
