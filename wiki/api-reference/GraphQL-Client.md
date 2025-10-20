# GitLabGraphQLClient API Reference

Complete API reference for the GraphQL client used to interact with GitLab's GraphQL API.

## Overview

`GitLabGraphQLClient` is the primary interface for making GraphQL requests to GitLab. It handles authentication, pagination, token refresh, and error handling.

**Location**: `src/api/gitlabGraphQLClient.ts`

## Class: GitLabGraphQLClient

### Constructor

```typescript
new GitLabGraphQLClient(
  baseUrl: string,
  accessToken: string,
  options?: {
    refreshToken?: string;
    oauth2?: {
      clientId: string;
      clientSecret: string;
      tokenEndpoint?: string;
    };
  }
)
```

**Parameters:**

- `baseUrl` (string): GitLab instance URL
- `accessToken` (string): Personal Access Token or OAuth2 access token
- `options` (object, optional):
  - `refreshToken` (string): OAuth2 refresh token
  - `oauth2` (object): OAuth2 configuration
    - `clientId` (string): OAuth2 client ID
    - `clientSecret` (string): OAuth2 client secret
    - `tokenEndpoint` (string): Token endpoint URL

**Example:**

```typescript
import { GitLabGraphQLClient } from './api';

const client = new GitLabGraphQLClient(
  'https://gitlab.com',
  'glpat-xxxxxxxxxxxxxxxxxxxx'
);
```

### Methods

#### query<T>(query, variables)

Execute a GraphQL query.

**Signature:**
```typescript
async query<T>(
  query: DocumentNode | string,
  variables?: Record<string, any>
): Promise<T>
```

**Parameters:**
- `query`: GraphQL query (DocumentNode or string)
- `variables`: Query variables (optional)

**Returns:** Promise resolving to query result

**Example:**
```typescript
const result = await client.query(USERS_QUERY, {
  first: 100
});
```

#### fetchAllPages<T>(query, path, variables, maxPages)

Automatically paginate through all pages.

**Signature:**
```typescript
async fetchAllPages<T>(
  query: DocumentNode | string,
  path: string,
  variables?: Record<string, any>,
  maxPages?: number
): Promise<T[]>
```

**Returns:** Array of all items from all pages

**Example:**
```typescript
const allUsers = await client.fetchAllPages(
  USERS_QUERY,
  'users',
  { first: 100 }
);
```

## See Also

- [REST Client API](REST-Client.md)
- [API Integration](../architecture/API-Integration.md)

---

**Last Updated**: 2025-10-20
