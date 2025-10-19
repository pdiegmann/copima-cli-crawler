# Implementation Plan: Fix GitLab Crawler Test Suite

## Overview
Fix the non-functional end-to-end test suite for the GitLab crawler by creating missing test configuration files and example configurations.

The test infrastructure (TestRunner, types, command implementation) is fully functional, but all test configuration files referenced in package.json scripts and documentation are missing. The project needs working test configurations that can validate the complete crawling workflow against the GitLab instance at git.hnnl.eu using the provided personal access token.

## Types
No new type definitions required.

All necessary types already exist in `src/testing/types.ts`:
- `TestConfig`: Complete test configuration structure
- `TestSuite`: Multiple test configurations
- `TestMetadata`, `TestGitLabConfig`, `TestExecutionConfig`, `TestValidationConfig`, `TestCleanupConfig`
- Result types: `TestResult`, `ValidationResults`, `CrawlerExecutionResult`

## Files
Create missing configuration files to enable test execution.

**New files to create:**
1. `examples/unified-config.yaml` - Main test configuration for authentication and basic testing
   - Purpose: Referenced by package.json scripts and CLAUDE.md
   - Contains: GitLab connection config, OAuth2 setup, test validation rules

2. `examples/test-configs/basic-test.yaml` - Simple end-to-end test
   - Purpose: Validate core crawling functionality
   - Contains: Areas + users steps with file validation

3. `examples/test-configs/template-test.yaml` - Template for custom tests
   - Purpose: Documentation and starting point for new tests
   - Contains: Fully commented example configuration

4. `examples/test-configs/dry-run-test.yaml` - Configuration validation test
   - Purpose: Test setup without actual execution
   - Contains: Minimal config for dry-run mode

5. `examples/test-configs/test-suite.yaml` - Multi-test suite
   - Purpose: Comprehensive validation with multiple test scenarios
   - Contains: Suite metadata + array of test configurations

6. `.gitignore` updates - Protect sensitive test data
   - Add: `examples/**/output/`, `examples/**/database.yaml`, `test-tmp/`

**Existing files to modify:**
1. `CLAUDE.md` - Update with correct setup instructions
   - Add: Authentication setup section with actual token usage
   - Update: Test execution examples with working paths

2. `README.md` - Update test configuration section
   - Add: Quick start guide with token setup
   - Update: Examples section with created files

**No files to delete or move.**

## Functions
No function modifications required.

The test runner (`src/testing/testRunner.ts`) is fully functional:
- `runTest()` - Executes single test with configuration
- `runTestSuite()` - Runs multiple tests with parallel/sequential execution
- `loadTestConfig()` - Loads and validates YAML test configs
- `executeCrawler()` - Spawns crawler process with proper environment
- `validateResults()` - Validates files, logs, performance, data quality

The test command (`src/commands/test/impl.ts`) is complete:
- `testImpl()` - Main command handler
- Configuration loading and validation
- Suite vs single test routing
- Comprehensive result reporting

The crawl implementation (`src/commands/crawl/impl.ts`) supports both real and test modes:
- `crawlCommand()` - Main orchestrator
- `areas()`, `users()`, `resources()`, `repository()` - Step implementations
- Mock data generation for test mode
- OAuth2 token management and refresh

## Classes
No class modifications required.

Existing classes are complete and functional:
- `GitLabGraphQLClient` - GraphQL API client with pagination and token refresh
- `TestRunner` - Test execution and validation framework
- `TokenManager` - OAuth2 token management and storage

## Dependencies
No new dependencies required.

All necessary packages are already installed:
- `js-yaml` - YAML configuration file parsing
- `winston` - Logging framework
- `@stricli/core` - CLI framework
- Testing tools already configured (Jest, Bun test)

## Testing
Test the test suite itself using the created configurations.

**Test file validation:**
1. Verify all created YAML files are valid syntax
2. Validate against `TestConfig` and `TestSuite` types
3. Check required fields are present

**Execution validation:**
1. Run dry-run test to validate configuration loading
2. Execute basic test with real GitLab connection
3. Verify test suite execution with parallel mode
4. Validate cleanup operations

**Test commands:**
```bash
# Validate configuration only
bun run test:e2e:dry-run

# Run basic test
bun run test:e2e:basic

# Run template test
bun run test:e2e:template

# Run full test suite
bun run test:e2e:suite
```

**Expected outcomes:**
- All test configurations load without validation errors
- Dry-run completes successfully with no execution
- Basic test connects to GitLab and creates expected JSONL files
- Test suite runs multiple tests and generates report
- Cleanup removes temporary files after successful tests

## Implementation Order
Logical sequence to minimize conflicts and enable iterative testing.

1. **Create examples directory structure**
   - Create `examples/` directory
   - Create `examples/test-configs/` subdirectory
   - Ensures proper organization before file creation

2. **Create unified-config.yaml**
   - Main configuration file referenced by multiple scripts
   - Enables authentication and basic testing
   - Template for other configurations

3. **Create basic-test.yaml**
   - Simplest functional test
   - Validates core crawling workflow
   - Can be tested immediately after creation

4. **Create dry-run-test.yaml**
   - Minimal configuration for validation
   - Tests configuration loading without execution
   - Useful for debugging config issues

5. **Create template-test.yaml**
   - Comprehensive example with comments
   - Serves as documentation
   - Helps users create custom tests

6. **Create test-suite.yaml**
   - Combines multiple test scenarios
   - Demonstrates suite capabilities
   - Final integration test

7. **Update .gitignore**
   - Protect generated test data
   - Prevent sensitive information in git
   - Must be done before running tests

8. **Update CLAUDE.md**
   - Document actual setup process
   - Provide working examples
   - Guide AI assistants in future work

9. **Update README.md**
   - User-facing documentation
   - Quick start guide
   - Complete testing section

10. **Validate all configurations**
    - Run dry-run tests
    - Verify YAML syntax
    - Check type compliance

11. **Execute test suite**
    - Run basic test first
    - Execute full suite
    - Verify all validations pass

12. **Document results**
    - Update any remaining documentation
    - Add troubleshooting tips
    - Create success criteria
