# API Integration

Understanding how COPIMA CLI Crawler integrates with GitLab's GraphQL and REST APIs.

## Dual API Strategy

GitLab provides two primary APIs:

1. **GraphQL API** (v4) - Modern, efficient, flexible
2. **REST API** (v4) - Traditional, comprehensive, well-documented

COPIMA uses **both** APIs strategically to achieve complete data coverage.

## GraphQL API (Primary)

**Usage**: Steps 1, 2, and 3 (Areas, Users, Resources)

### Why GraphQL?

#### Advantages

1. **Efficiency** - Request only needed fields
2. **Batching** - Multiple resources in one query
3. **Type Safety** - Strong schema and validation
4. **Performance** - Fewer round trips
5. **Relationships** - Easy nested data fetching

#### Example

Single query fetching multiple resources:

```graphql
query GetProjectData($projectPath: ID!) {
  project(fullPath: $projectPath) {
    id
    name
    description
    
    # Get issues
    issues {
      nodes {
        id
        title
        state
        author { username }
      }
    }
    
    # Get merge requests
    mergeRequests {
      nodes {
        id
        title
        state
      }
    }
    
    # Get members
    projectMembers {
      nodes {
        id
        accessLevel
        user { username }
      }
    }
  }
}
```

This single request fetches project metadata, issues, merge requests, and members.

### GraphQL Client Implementation

**Location**: `src/api/gitlabGraphQLClient.ts`

```typescript
import { GitLabGraphQLClient } from './api';

const client = new GitLabGraphQLClient(
  'https://gitlab.com',
  'your-access-token'
);

// Execute query
const result = await client.query(QUERY, variables);

// With pagination
const allProjects = await client.fetchAll(
  PROJECTS_QUERY,
  'projects',
  { perPage: 100 }
);
```

### Pagination

GraphQL uses cursor-based pagination:

```graphql
query GetProjects($after: String) {
  projects(first: 100, after: $after) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      name
    }
  }
}
```

The client automatically handles pagination:

```typescript
// Fetches all pages automatically
const allProjects = await client.fetchAllPages(
  PROJECTS_QUERY,
  'projects',
  { first: 100 }
);
```

### Rate Limiting

GraphQL has complexity-based rate limiting:

- Each field has a complexity score
- Total query complexity cannot exceed limit
- Headers provide remaining quota

```typescript
// Check rate limit
const rateLimit = await client.getRateLimit();
console.log(rateLimit.remaining); // Remaining quota
console.log(rateLimit.resetAt);   // Reset time
```

### Error Handling

GraphQL returns partial results with errors:

```json
{
  "data": {
    "project": { "id": "123", "name": "MyProject" }
  },
  "errors": [
    {
      "message": "Field 'secretData' doesn't exist",
      "path": ["project", "secretData"]
    }
  ]
}
```

The client handles this gracefully:

```typescript
const result = await client.query(QUERY, variables);

if (result.errors) {
  logger.warn('Partial errors:', result.errors);
}

// Data is still available
const project = result.data.project;
```

### Schema Introspection

The client uses GitLab's GraphQL schema for type generation:

```bash
# Generate TypeScript types from schema
npm run codegen
```

This creates type-safe query builders:

```typescript
import { GetProjectQuery } from './api/gql/graphql';

const result: GetProjectQuery = await client.query(
  GET_PROJECT_QUERY,
  { projectPath: 'org/project' }
);

// TypeScript knows the shape of result.data
```

## REST API (Secondary)

**Usage**: Step 4 (Repository) and fallback for missing GraphQL features

### Why REST?

Some resources are **only available** via REST:

1. **Commit diffs** - Full diff content
2. **File blobs** - Raw file contents
3. **Repository tree** - Complete file listings
4. **Job artifacts** - CI/CD artifacts
5. **Detailed branches** - Protection rules

### REST Client Implementation

**Location**: `src/api/gitlabRestClient.ts`

```typescript
import { GitLabRestClient } from './api';

const client = new GitLabRestClient(
  'https://gitlab.com',
  'your-access-token'
);

// Fetch commits
const commits = await client.get(
  `/projects/${projectId}/repository/commits`
);

// Fetch file content
const fileContent = await client.get(
  `/projects/${projectId}/repository/files/README.md/raw`,
  { ref: 'main' }
);
```

### Pagination

REST uses offset-based pagination with headers:

```http
GET /api/v4/projects/123/issues?page=1&per_page=100

Response Headers:
X-Total: 450
X-Total-Pages: 5
X-Per-Page: 100
X-Page: 1
X-Next-Page: 2
```

The client handles pagination automatically:

```typescript
// Fetch all pages
const allIssues = await client.fetchAll(
  `/projects/${projectId}/issues`,
  { per_page: 100 }
);
```

### Rate Limiting

REST has request-based rate limiting:

```http
Response Headers:
RateLimit-Limit: 600
RateLimit-Observed: 100
RateLimit-Remaining: 500
RateLimit-Reset: 1635178800
RateLimit-ResetTime: Mon, 25 Oct 2021 12:00:00 GMT
```

The client respects rate limits:

```typescript
// Automatic rate limit handling
const client = new GitLabRestClient(host, token, {
  rateLimit: {
    enabled: true,
    requestsPerSecond: 10
  }
});
```

### Error Handling

REST returns HTTP status codes:

```typescript
try {
  const data = await client.get('/api/v4/projects/999');
} catch (error) {
  if (error.statusCode === 404) {
    console.log('Project not found');
  } else if (error.statusCode === 403) {
    console.log('Access denied');
  } else {
    console.error('API error:', error);
  }
}
```

### Binary Data

REST handles binary file downloads:

```typescript
// Download binary file
const fileBlob = await client.downloadFile(
  `/projects/${projectId}/jobs/${jobId}/artifacts`
);

// Save to disk
fs.writeFileSync('artifacts.zip', fileBlob);
```

## API Selection Strategy

### When to Use GraphQL

✅ **Use GraphQL for:**

- Group/project metadata
- User information
- Issues and merge requests
- Labels and milestones
- Epics and boards
- Members and access levels
- Pipelines (metadata only)
- Any relationship queries

### When to Use REST

✅ **Use REST for:**

- Commit history and diffs
- File contents and blobs
- Repository tree traversal
- Branches and tags (detailed)
- CI/CD artifacts and logs
- Security scans and dependencies
- Any streaming data

### Decision Matrix

| Resource Type        | API      | Reason                          |
|---------------------|----------|---------------------------------|
| Groups              | GraphQL  | Efficient nested queries        |
| Projects            | GraphQL  | Rich metadata                   |
| Users               | GraphQL  | Efficient pagination            |
| Issues              | GraphQL  | Complete in GraphQL             |
| Merge Requests      | GraphQL  | Complete in GraphQL             |
| Labels              | GraphQL  | Simple resource                 |
| Milestones          | GraphQL  | Simple resource                 |
| Epics               | GraphQL  | GraphQL-only feature            |
| Pipelines           | GraphQL  | Metadata sufficient             |
| Commits             | REST     | Diffs not in GraphQL            |
| Branches            | REST     | Details not in GraphQL          |
| Tags                | REST     | Annotated tags need REST        |
| Files               | REST     | Content not in GraphQL          |
| Artifacts           | REST     | REST-only                       |

## Authentication

Both APIs support the same authentication methods:

### Personal Access Token

```http
# GraphQL
POST /api/graphql
Authorization: Bearer glpat-xxxxxxxxxxxxxxxxxxxx

# REST
GET /api/v4/projects
Authorization: Bearer glpat-xxxxxxxxxxxxxxxxxxxx
```

### OAuth2 Access Token

```http
# GraphQL
POST /api/graphql
Authorization: Bearer oauth2-access-token

# REST
GET /api/v4/projects
Authorization: Bearer oauth2-access-token
```

The clients handle authentication automatically:

```typescript
// Same token for both clients
const graphqlClient = new GitLabGraphQLClient(host, token);
const restClient = new GitLabRestClient(host, token);
```

## Performance Optimization

### GraphQL Optimization

#### 1. Field Selection

Request only needed fields:

```graphql
# ❌ Bad - Requests everything
query {
  projects {
    nodes {
      ...ProjectFragment  # Too many fields
    }
  }
}

# ✅ Good - Minimal fields
query {
  projects {
    nodes {
      id
      name
      fullPath
    }
  }
}
```

#### 2. Pagination Size

Balance between request count and response size:

```typescript
// Too small - many requests
await client.fetchAll(QUERY, 'projects', { first: 10 });

// Too large - timeout risk
await client.fetchAll(QUERY, 'projects', { first: 1000 });

// Optimal
await client.fetchAll(QUERY, 'projects', { first: 100 });
```

#### 3. Query Batching

Combine related queries:

```graphql
query GetMultipleProjects($paths: [ID!]!) {
  project1: project(fullPath: $paths[0]) { ...data }
  project2: project(fullPath: $paths[1]) { ...data }
  project3: project(fullPath: $paths[2]) { ...data }
}
```

### REST Optimization

#### 1. Pagination Parameters

```typescript
// Optimal page size
const OPTIMAL_PAGE_SIZE = 100;

const response = await client.get('/api/v4/issues', {
  per_page: OPTIMAL_PAGE_SIZE
});
```

#### 2. Conditional Requests

Use ETags to avoid re-fetching unchanged data:

```typescript
const etag = cache.getETag('/api/v4/project/123');

const response = await client.get('/api/v4/project/123', {
  headers: { 'If-None-Match': etag }
});

if (response.status === 304) {
  // Use cached data
  return cache.getData('/api/v4/project/123');
}
```

#### 3. Parallel Requests

Fetch multiple resources concurrently:

```typescript
const projectIds = [123, 456, 789];

const projectData = await Promise.all(
  projectIds.map(id => 
    client.get(`/api/v4/projects/${id}`)
  )
);
```

## Error Recovery

### Retry Strategy

Both clients implement exponential backoff:

```typescript
const client = new GitLabRestClient(host, token, {
  retry: {
    attempts: 3,
    delay: 1000,        // Initial delay (ms)
    backoff: 2,         // Exponential multiplier
    statusCodes: [429, 502, 503, 504]
  }
});
```

### Graceful Degradation

Handle missing features gracefully:

```typescript
try {
  const epics = await graphqlClient.fetchEpics(groupPath);
} catch (error) {
  if (error.message.includes("Field 'epics' doesn't exist")) {
    logger.warn('Epics not available (requires Premium/Ultimate)');
    return [];
  }
  throw error;
}
```

## Monitoring and Logging

### Request Logging

```typescript
const client = new GitLabGraphQLClient(host, token, {
  logging: {
    requests: true,
    responses: true,
    errors: true
  }
});
```

Logs:
```
[GraphQL] Request: query GetProjects { ... }
[GraphQL] Response: 200 OK (145ms)
[GraphQL] Fetched 50 projects
```

### Performance Metrics

```typescript
const metrics = client.getMetrics();

console.log({
  totalRequests: metrics.requestCount,
  avgResponseTime: metrics.avgResponseTime,
  errorRate: metrics.errorRate,
  rateLimitHits: metrics.rateLimitHits
});
```

## Best Practices

### 1. API Version Locking

```yaml
# config.yaml
gitlab:
  apiVersion: "v4"  # Lock to specific version
```

### 2. Timeout Configuration

```typescript
const client = new GitLabRestClient(host, token, {
  timeout: 30000  // 30 seconds
});
```

### 3. Connection Pooling

```typescript
const client = new GitLabGraphQLClient(host, token, {
  pool: {
    maxConnections: 10,
    keepAlive: true
  }
});
```

### 4. Error Boundaries

```typescript
async function fetchWithErrorBoundary<T>(
  fetcher: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fetcher();
  } catch (error) {
    logger.error('API request failed:', error);
    return fallback;
  }
}
```

### 5. Response Validation

```typescript
import { z } from 'zod';

const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string()
});

const response = await client.get('/api/v4/projects/123');
const project = ProjectSchema.parse(response);
```

## Testing API Integration

### Mock GraphQL Responses

```typescript
import { mockGraphQLClient } from './__mocks__/graphqlClient';

jest.mock('./api/gitlabGraphQLClient');

test('fetches projects', async () {
  mockGraphQLClient.query.mockResolvedValue({
    data: {
      projects: {
        nodes: [{ id: '1', name: 'Test' }]
      }
    }
  });
  
  const projects = await fetchProjects();
  expect(projects).toHaveLength(1);
});
```

### Mock REST Responses

```typescript
import fetchMock from 'jest-fetch-mock';

beforeEach(() => {
  fetchMock.resetMocks();
});

test('fetches commits', async () {
  fetchMock.mockResponseOnce(JSON.stringify([
    { id: 'abc123', message: 'Initial commit' }
  ]));
  
  const commits = await client.get('/api/v4/projects/1/commits');
  expect(commits).toHaveLength(1);
});
```

## Summary

- **GraphQL** is primary for efficiency and type safety
- **REST** fills gaps where GraphQL is limited
- Both APIs use same authentication
- Clients handle pagination, rate limiting, and errors automatically
- Optimization focuses on field selection and batch sizes
- Comprehensive error recovery and monitoring

---

**API Integration Version**: 1.0.0  
**Last Updated**: 2025-10-19
