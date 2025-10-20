# Testing Guide

Complete guide to testing and validating COPIMA CLI Crawler configurations and functionality.

## Overview

COPIMA includes comprehensive testing capabilities:

- **Unit Tests** - Test individual components
- **Integration Tests** - Test component interactions
- **E2E Tests** - Test complete workflows
- **Configuration Tests** - Validate configs before running
- **Dry-Run Mode** - Test without actual crawling

## E2E Testing System

### Test Configuration Format

E2E tests use YAML configuration files in `examples/test-configs/`:

```yaml
# test-config.yaml
test:
  name: "My Test"
  timeout: 300  # seconds
  
  # Cleanup behavior
  cleanup:
    enabled: true
    onFailure: "keep"    # keep, remove
    onSuccess: "remove"  # remove, keep

# GitLab connection
gitlab:
  host: "https://git.example.com"
  apiVersion: "v4"
  token: "your-test-token"

# Output settings
output:
  rootDir: "./test-output"

# Steps to test
test:
  steps:
    - name: "areas"
      enabled: true
    - name: "users"
      enabled: true

# Validation rules
test:
  validation:
    groups:
      minCount: 1
      requiredFields: ["id", "name", "fullPath"]
    
    users:
      minCount: 1
      requiredFields: ["id", "username", "name"]
```

### Running E2E Tests

```bash
# Run specific test
copima-cli-crawler test examples/unified-config.yaml

# Run test suite
copima-cli-crawler test examples/test-configs/test-suite.yaml

# Dry-run test (no API calls)
copima-cli-crawler test examples/test-configs/dry-run-test.yaml
```

### Available Test Configurations

#### 1. Basic Test (`examples/unified-config.yaml`)

Tests basic functionality:
- Crawls areas and users
- Validates output files
- Tests PAT authentication

```bash
bun run test:e2e:basic
```

#### 2. Dry-Run Test (`examples/test-configs/dry-run-test.yaml`)

Tests without API calls:
- Validates configuration
- Tests command parsing
- Checks file structure

```bash
bun run test:e2e:dry-run
```

#### 3. Repository Test (`examples/test-configs/repository-test.yaml`)

Tests repository crawling:
- Commits, branches, tags
- REST API integration

```bash
bun run test:e2e:repository
```

#### 4. Full Test Suite (`examples/test-configs/test-suite.yaml`)

Runs multiple tests sequentially:
- All test configurations
- Comprehensive validation

```bash
bun run test:e2e:suite
```

## Creating Custom Tests

### Step 1: Create Test Configuration

```yaml
# my-test.yaml
test:
  name: "Custom Test"
  timeout: 600
  cleanup:
    enabled: true
    onSuccess: "remove"
    onFailure: "keep"

gitlab:
  host: "https://gitlab.com"
  token: "${env.GITLAB_TOKEN}"

output:
  rootDir: "./test-output/my-test"

test:
  steps:
    - name: "areas"
      enabled: true
      
  validation:
    projects:
      minCount: 5
      maxCount: 100
      requiredFields:
        - id
        - name
        - fullPath
        - visibility
```

### Step 2: Run Your Test

```bash
copima-cli-crawler test my-test.yaml
```

### Step 3: Review Results

Test output includes:
- Pass/fail status
- Validation results
- Error messages
- Output files (if kept)

## Validation Rules

### Field Validation

```yaml
validation:
  users:
    requiredFields:
      - id
      - username
      - name
    optionalFields:
      - email
      - publicEmail
```

### Count Validation

```yaml
validation:
  projects:
    minCount: 1        # At least 1 project
    maxCount: 1000     # At most 1000 projects
```

### Custom Validation

Create custom validator:

```javascript
// validators/my-validator.js
export function validate(data, config) {
  const errors = [];
  
  // Custom validation logic
  data.forEach(item => {
    if (!item.id) {
      errors.push(`Missing id field`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

## Mock Testing

### Mock Mode

Use mock tokens for testing without API calls:

```yaml
gitlab:
  token: "mock_token_12345"  # Starts with "mock_" or "test_"
```

Mock mode:
- No API requests made
- Generates sample data
- Tests command parsing and file operations

### Mock Data Generation

```javascript
// __mocks__/mockData.js
export const mockProjects = [
  {
    id: "1",
    name: "Test Project 1",
    fullPath: "org/project1"
  },
  {
    id: "2",
    name: "Test Project 2",
    fullPath: "org/project2"
  }
];
```

## Unit Testing

### Testing Components

```typescript
// src/storage/storageManager.test.ts
import { describe, it, expect } from '@jest/globals';
import { StorageManager } from './storageManager';

describe('StorageManager', () => {
  it('should write JSONL file', async () => {
    const storage = new StorageManager({ baseDir: './test-output' });
    
    await storage.writeJsonlFile(
      './test-output/test.jsonl',
      [{ id: '1', name: 'Test' }],
      false
    );
    
    const data = await storage.readJsonlFile('./test-output/test.jsonl');
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Test');
  });
});
```

### Running Unit Tests

```bash
# All tests
bun run test

# Watch mode
bun run test:watch

# Coverage
bun run test:coverage

# Specific test file
bun test src/storage/storageManager.test.ts
```

## Integration Testing

### Testing API Clients

```typescript
// src/api/gitlabGraphQLClient.test.ts
import { jest } from '@jest/globals';
import { GitLabGraphQLClient } from './gitlabGraphQLClient';

describe('GitLabGraphQLClient', () => {
  it('should fetch projects', async () => {
    const client = new GitLabGraphQLClient(
      'https://gitlab.com',
      'test-token'
    );
    
    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          projects: {
            nodes: [{ id: '1', name: 'Test' }]
          }
        }
      })
    });
    
    const result = await client.fetchProjects();
    expect(result).toHaveLength(1);
  });
});
```

## Dry-Run Mode

### What is Dry-Run?

Dry-run mode:
- Validates configuration
- Tests authentication
- Checks connectivity
- **Does not** crawl data
- **Does not** write files

### Using Dry-Run

```bash
# Test configuration without crawling
copima-cli-crawler crawl --dry-run

# Test specific steps
copima-cli-crawler crawl --steps areas --dry-run

# Test with config file
copima-cli-crawler crawl --config test.yaml --dry-run
```

### Dry-Run Output

```
[INFO] Running in dry-run mode
[INFO] Validating configuration...
✓ Configuration valid
[INFO] Testing authentication...
✓ Authentication successful
[INFO] Testing connectivity...
✓ Connected to GitLab (v16.5.0)
[INFO] Dry-run completed successfully
[INFO] No data was crawled or written
```

## Test Helpers

### Creating Test Data

```typescript
// src/testing/fixtures.ts
export const mockUser = {
  id: "gid://gitlab/User/1",
  username: "testuser",
  name: "Test User",
  email: "test@example.com"
};

export const mockProject = {
  id: "gid://gitlab/Project/1",
  name: "Test Project",
  fullPath: "org/test-project"
};
```

### Setup and Teardown

```typescript
describe('MyFeature', () => {
  let testDir: string;
  
  beforeEach(async () => {
    // Setup test directory
    testDir = './test-output-' + Date.now();
    await fs.mkdir(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  it('should work', async () => {
    // Test code
  });
});
```

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        
      - name: Install dependencies
        run: bun install
        
      - name: Run tests
        run: bun run test
        
      - name: Run lint
        run: bun run lint
        
      - name: Run E2E tests
        run: bun run test:e2e:dry-run
```

## Best Practices

### 1. Test Early and Often

```bash
# Before committing
bun run test && bun run lint
```

### 2. Use Dry-Run for Quick Validation

```bash
# Quick config validation
copima-cli-crawler crawl --config myconfig.yaml --dry-run
```

### 3. Test with Small Datasets First

```yaml
# Test config with limited scope
gitlab:
  host: "https://gitlab.com"
  
test:
  steps:
    - name: "areas"
      enabled: true
  
  validation:
    projects:
      maxCount: 10  # Limit to 10 projects
```

### 4. Keep Test Configurations

```
examples/
├── test-configs/
│   ├── local-dev.yaml
│   ├── ci-test.yaml
│   └── staging-test.yaml
```

### 5. Clean Up Test Data

```yaml
test:
  cleanup:
    enabled: true
    onSuccess: "remove"
```

## Troubleshooting Tests

### Test Failures

Check:
- Test timeout (increase if needed)
- GitLab connectivity
- Token validity
- Output directory permissions

### Flaky Tests

Common causes:
- Network issues
- Rate limiting
- GitLab server load
- Timing issues

Solutions:
- Increase timeouts
- Add retries
- Use mock mode
- Run tests serially

### Mock Mode Issues

If mock mode fails:
- Verify token format (`mock_` or `test_` prefix)
- Check mock data generation
- Review test configuration

## See Also

- [Configuration Reference](../guides/Configuration-Reference.md)
- [Troubleshooting](../troubleshooting/Common-Issues.md)
- [Development Setup](../development/Setup.md)

---

**Last Updated**: 2025-10-20
