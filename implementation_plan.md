# Implementation Plan

A comprehensive implementation plan to align the codebase with memory-bank requirements, focusing on core responsibilities, proper library usage, and missing features.

This plan addresses critical gaps between the current codebase and the memory-bank specifications, including YAML progress reporting, proper OAuth2 implementation, complete resume capabilities, hierarchical data storage, and mandatory library compliance. The implementation will ensure full adherence to the 4-step GitLab crawling workflow, proper configuration hierarchy, and robust error handling throughout the system.

## Types

Type system enhancements for improved OAuth2 support, YAML progress reporting, and callback management.

### New Type Definitions

```typescript
// OAuth2 Token Management Types
export interface OAuth2RefreshRequest {
  refreshToken: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
}

export interface OAuth2RefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

// Progress Reporting Types (YAML Format)
export interface ProgressMetadata {
  startTime: Date;
  lastUpdate: Date;
  currentStep: string;
  completedSteps: number;
  totalSteps: number;
  estimatedTimeRemaining?: number;
}

export interface YAMLProgressReport {
  metadata: ProgressMetadata;
  stats: ProgressStats;
  performance: PerformanceMetrics;
  resources: Record<string, ResourceCount>;
  errors: Array<{
    timestamp: Date;
    step: string;
    message: string;
    recoverable: boolean;
  }>;
}

// Resume State Types
export interface CrawlState {
  stepId: string;
  resourceType: string;
  processedIds: Set<string>;
  lastProcessedId?: string;
  metadata: Record<string, unknown>;
}

export interface ResumeState {
  sessionId: string;
  startTime: Date;
  lastUpdateTime: Date;
  completedSteps: string[];
  currentStep?: string;
  stepStates: Record<string, CrawlState>;
  globalMetadata: Record<string, unknown>;
}

// Enhanced Callback Types
export interface CallbackResult<T = any> {
  data?: T;
  skip?: boolean;
  metadata?: Record<string, unknown>;
}

export type ProcessingCallback<T = any, R = T> = (
  context: CallbackContext,
  data: T
) => Promise<CallbackResult<R> | R | false> | CallbackResult<R> | R | false;
```

### Modified Type Definitions

```typescript
// Enhanced Config Types
export interface Config {
  // ... existing config fields
  oauth2: {
    enabled: boolean;
    clientId?: string;
    clientSecret?: string;
    tokenEndpoint?: string;
    refreshThreshold: number; // seconds before expiry to refresh
    maxRetries: number;
  };
  callbacks: {
    enabled: boolean;
    modulePath?: string;
    inlineCallback?: ProcessingCallback;
    options: {
      failOnError: boolean;
      logFiltered: boolean;
      batchSize: number;
    };
  };
  storage: {
    rootDir: string;
    fileNaming: "lowercase" | "kebab-case" | "snake_case";
    hierarchical: boolean;
    compression: "none" | "gzip" | "brotli";
    prettyPrint: boolean;
  };
}

// Enhanced API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    nextPageToken?: string;
  };
}
```

## Files

Comprehensive file modifications to implement missing core responsibilities and fix existing issues.

### New Files to Create

- **`src/utils/yamlProgressReporter.ts`** - YAML-based progress reporting system with file locking
- **`src/utils/enhancedResumeManager.ts`** - Complete resume capability implementation
- **`src/utils/hierarchicalStorage.ts`** - GitLab hierarchy-aware storage manager
- **`src/auth/oauth2Manager.ts`** - Full OAuth2 implementation with automatic token refresh
- **`src/crawlers/step1AreasCollector.ts`** - Dedicated Step 1 implementation (groups/projects)
- **`src/crawlers/step2UsersCollector.ts`** - Dedicated Step 2 implementation (users)
- **`src/crawlers/step3ResourcesCollector.ts`** - Dedicated Step 3 implementation (common/specific resources)
- **`src/crawlers/step4RepositoryCollector.ts`** - Dedicated Step 4 implementation (REST-only resources)
- **`src/crawlers/crawlerOrchestrator.ts`** - Master orchestrator for 4-step workflow
- **`src/utils/fileLocker.ts`** - File locking utility for progress reports
- **`src/validation/configValidator.ts`** - Enhanced configuration validation
- **`config/defaults.yaml`** - YAML-based default configuration file

### Existing Files to Modify

- **`src/config/loader.ts`** - Fix user config path to support both `~/.config/copima.yaml` and `~/.config/copima/config.yaml`
- **`src/utils/progressReporter.ts`** - Replace with YAML format, add file locking, implement proper error handling
- **`src/utils/resumeManager.ts`** - Complete implementation with proper state persistence and recovery
- **`src/utils/callbackManager.ts`** - Enhanced error handling and improved callback interface
- **`src/auth/tokenManager.ts`** - Fix import issues and integrate with OAuth2Manager
- **`src/auth/refreshTokenManager.ts`** - Integrate with new OAuth2Manager
- **`src/commands/crawl/impl.ts`** - Replace with orchestrator-based approach using dedicated step collectors
- **`src/api/gitlabRestClient.ts`** - Fix fetch import issues and add proper error handling
- **`src/api/gitlabGraphQLClient.ts`** - Add pagination support and enhanced error recovery
- **`src/utils/storageManager.ts`** - Replace with hierarchical storage implementation
- **`src/config/types.ts`** - Add new type definitions and enhance existing ones
- **`src/config/defaults.ts`** - Update with new configuration options
- **`package.json`** - Add missing `js-yaml` dependency for YAML processing

### Configuration Files

- **`.copima.defaults.yaml`** - Project root default configuration in YAML format
- **`src/config/schema.json`** - Configuration validation schema

## Functions

Function-level changes for core feature implementation and bug fixes.

### New Functions

**OAuth2Manager (`src/auth/oauth2Manager.ts`)**
- `refreshAccessToken(refreshToken: string): Promise<OAuth2RefreshResponse>` - Automatic token refresh
- `isTokenExpired(token: OAuth2TokenResponse): boolean` - Token expiry validation
- `scheduleTokenRefresh(token: OAuth2TokenResponse): void` - Proactive token refresh scheduling

**YAMLProgressReporter (`src/utils/yamlProgressReporter.ts`)**
- `writeYAMLProgress(data: YAMLProgressReport): Promise<void>` - Thread-safe YAML writing
- `lockProgressFile(): Promise<FileLock>` - File locking implementation
- `unlockProgressFile(lock: FileLock): Promise<void>` - File unlocking

**HierarchicalStorage (`src/utils/hierarchicalStorage.ts`)**
- `createHierarchicalPath(area: GitLabArea): string` - Generate hierarchical directory structure
- `writeJSONLToHierarchy(area: GitLabArea, resourceType: string, data: any[]): Promise<void>` - Hierarchy-aware JSONL writing
- `ensureDirectoryStructure(path: string): Promise<void>` - Recursive directory creation

**EnhancedResumeManager (`src/utils/enhancedResumeManager.ts`)**
- `saveStepState(stepId: string, state: CrawlState): Promise<void>` - Granular step state persistence
- `loadStepState(stepId: string): Promise<CrawlState | null>` - Step state recovery
- `markStepComplete(stepId: string): Promise<void>` - Step completion tracking
- `canSkipResource(stepId: string, resourceId: string): boolean` - Resource skip validation

**CrawlerOrchestrator (`src/crawlers/crawlerOrchestrator.ts`)**
- `executeCrawlWorkflow(config: Config): Promise<CrawlResult>` - Master workflow execution
- `validateStepPrerequisites(stepId: string): Promise<boolean>` - Step dependency validation
- `handleStepError(stepId: string, error: Error): Promise<void>` - Centralized error handling

### Modified Functions

**ConfigLoader.loadUserConfigFile() (`src/config/loader.ts`)**
- Add support for both `~/.config/copima.yaml` and `~/.config/copima/config.yaml`
- Implement proper error handling for missing directories

**ProgressReporter.writeProgress() (`src/utils/progressReporter.ts`)**
- Replace JSON.stringify with yaml.dump
- Add file locking mechanism
- Implement proper error recovery

**CallbackManager.processObject() (`src/utils/callbackManager.ts`)**
- Support new CallbackResult interface
- Add enhanced error handling with metadata preservation
- Implement batching optimization

**TokenManager.refreshAccessToken() (`src/auth/tokenManager.ts`)**
- Fix import issues (`import logger from` vs `import { logger }`)
- Add proper error type handling
- Integrate with OAuth2Manager

**GitLabRestClient.request() (`src/api/gitlabRestClient.ts`)**
- Fix node-fetch import issues
- Add retry logic with exponential backoff
- Implement proper error serialization

### Removed Functions

**CrawlImpl.crawlAll() (`src/commands/crawl/impl.ts`)**
- Replace with CrawlerOrchestrator.executeCrawlWorkflow()
- Remove hardcoded console.log statements
- Eliminate duplicate functionality

## Classes

Class-level modifications for improved architecture and functionality.

### New Classes

**OAuth2Manager (`src/auth/oauth2Manager.ts`)**
- Comprehensive OAuth2 token lifecycle management
- Automatic token refresh scheduling
- Integration with existing TokenManager

**YAMLProgressReporter (`src/utils/yamlProgressReporter.ts`)**
- Thread-safe YAML progress reporting
- File locking implementation
- Enhanced error recovery

**HierarchicalStorageManager (`src/utils/hierarchicalStorage.ts`)**
- GitLab hierarchy-aware file organization
- Deterministic file naming
- Compression support

**CrawlerOrchestrator (`src/crawlers/crawlerOrchestrator.ts`)**
- Master coordinator for 4-step workflow
- Step dependency management
- Centralized error handling and recovery

**Step Collectors (4 classes)**
- `AreasCollector` - Step 1: Groups and projects
- `UsersCollector` - Step 2: All users
- `ResourcesCollector` - Step 3: Common and specific resources
- `RepositoryCollector` - Step 4: REST-only repository data

### Modified Classes

**ConfigLoader (`src/config/loader.ts`)**
- Enhanced user config file resolution
- Support for multiple configuration file locations
- Improved validation and error handling

**CallbackManager (`src/utils/callbackManager.ts`)**
- Enhanced callback result handling
- Improved error recovery mechanisms
- Batch processing optimization

**GitLabRestClient (`src/api/gitlabRestClient.ts`)**
- Fix import statement issues
- Add retry mechanisms
- Improve error handling and logging

**ProgressReporter (`src/utils/progressReporter.ts`)**
- Convert from JSON to YAML output format
- Add file locking capabilities
- Implement proper TypeScript error handling

### Removed Classes

None - all existing classes will be enhanced rather than removed.

## Dependencies

Package and library updates to meet memory-bank requirements.

### New Dependencies

```json
{
  "js-yaml": "^4.1.0",
  "lockfile": "^1.0.4"
}
```

**js-yaml** - Required for YAML progress report generation and configuration file parsing
**lockfile** - Needed for progress file locking mechanism to prevent concurrent access issues

### Version Updates

No version updates required for existing dependencies. Current versions are compatible with planned changes.

### Integration Requirements

- **js-yaml** - Integrate with YAMLProgressReporter and ConfigLoader for YAML processing
- **lockfile** - Integrate with YAMLProgressReporter for thread-safe file operations
- **winston** - Ensure consistent usage across all new modules
- **drizzle-orm** - Continue using for OAuth2 token persistence
- **picocolors** - Maintain usage for terminal output formatting

## Testing

Comprehensive test coverage for new functionality and bug fixes.

### New Test Files

- **`src/auth/__tests__/oauth2Manager.test.ts`** - OAuth2 token refresh and lifecycle management
- **`src/utils/__tests__/yamlProgressReporter.test.ts`** - YAML progress reporting with file locking
- **`src/utils/__tests__/hierarchicalStorage.test.ts`** - Directory structure and file organization
- **`src/crawlers/__tests__/crawlerOrchestrator.test.ts`** - Workflow orchestration and error handling
- **`src/crawlers/__tests__/stepCollectors.test.ts`** - Individual step collector functionality
- **`src/validation/__tests__/configValidator.test.ts`** - Configuration validation logic

### Existing Test Modifications

- **`src/utils/progressReporter.test.ts`** - Update for YAML format and fix mock issues
- **`src/utils/resumeManager.test.ts`** - Fix logger mock issues and enhance test coverage
- **`src/auth/tokenManager.test.ts`** - Fix import issues and add OAuth2 integration tests
- **`src/api/gitlabRestClient.test.ts`** - Fix fetch mock issues and add retry logic tests
- **`src/config/__tests__/loader.test.ts`** - Add tests for multiple config file locations

### Validation Strategies

- **Unit Tests** - All new classes and functions with 90%+ coverage
- **Integration Tests** - End-to-end workflow validation with real API mocking
- **Error Handling Tests** - Comprehensive error scenario coverage
- **Performance Tests** - YAML writing and file locking performance validation
- **Resume Functionality Tests** - State persistence and recovery validation

## Implementation Order

Logical sequence of changes to minimize conflicts and ensure successful integration.

1. **Phase 1: Foundation** - Fix existing issues and add core dependencies
   - Add `js-yaml` and `lockfile` dependencies
   - Fix import issues in `tokenManager.ts` and `gitlabRestClient.ts`
   - Update type definitions in `src/types/api.ts`

2. **Phase 2: Core Utilities** - Implement foundational utility classes
   - Create `OAuth2Manager` with automatic token refresh
   - Implement `YAMLProgressReporter` with file locking
   - Build `HierarchicalStorageManager` for proper data organization

3. **Phase 3: Enhanced Managers** - Upgrade existing management systems
   - Enhance `CallbackManager` with improved error handling
   - Complete `EnhancedResumeManager` implementation
   - Update `ConfigLoader` for multiple config file support

4. **Phase 4: Crawling Architecture** - Implement step-based crawling system
   - Create individual step collectors (Steps 1-4)
   - Build `CrawlerOrchestrator` for workflow management
   - Replace existing crawl implementation with orchestrator

5. **Phase 5: Integration** - Wire together all components
   - Update command implementations to use new architecture
   - Integrate OAuth2Manager with existing auth system
   - Connect progress reporting with crawler orchestrator

6. **Phase 6: Testing & Validation** - Comprehensive testing and fixes
   - Create all test files and fix existing test issues
   - Perform integration testing with mocked GitLab API
   - Validate complete 4-step workflow functionality

7. **Phase 7: Configuration & Documentation** - Final configuration and cleanup
   - Create default YAML configuration files
   - Update configuration schema and validation
   - Perform final code cleanup and optimization
