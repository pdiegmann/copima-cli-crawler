# Implementation Plan

## Overview
Refactor five complex TypeScript files to reduce complexity, improve maintainability, and enhance testability by splitting monolithic files into focused, single-responsibility modules.

This refactoring addresses critical complexity issues in the GitLab API data crawler application. The current files mix multiple responsibilities including configuration management, API client operations, data processing, file I/O, and validation. The refactoring will separate these concerns into focused modules following SOLID principles, reduce code duplication through shared utilities, and improve testability through better dependency injection patterns.

## Types
Define new interfaces and types to support the refactored architecture.

**New Type Definitions:**
- `ConfigValidationError`: Error type with validation context and field information
- `ValidationResult`: Result type for validation operations with errors/warnings
- `CrawlStrategy`: Interface for different crawling approaches (GraphQL/REST)
- `ResourceFetcher`: Generic interface for data fetching operations
- `DataProcessor`: Interface for callback processing and data transformation
- `StorageHandler`: Interface for hierarchical data storage operations
- `ConfigSection`: Union type for different configuration sections
- `ValidationRule`: Interface for individual validation rules
- `FetchResult<T>`: Generic result type for fetching operations with metadata

## Files
Comprehensive breakdown of file modifications and new file creation.

**New files to be created:**

**Configuration Module Refactoring:**
- `src/config/validation/index.ts` - Validation module exports
- `src/config/validation/validator.ts` - Main validation orchestrator
- `src/config/validation/rules/gitlabValidator.ts` - GitLab-specific validation
- `src/config/validation/rules/databaseValidator.ts` - Database configuration validation
- `src/config/validation/rules/outputValidator.ts` - Output configuration validation
- `src/config/validation/rules/loggingValidator.ts` - Logging configuration validation
- `src/config/validation/types.ts` - Validation-specific types
- `src/config/loaders/index.ts` - Loader module exports
- `src/config/loaders/fileLoader.ts` - File loading logic
- `src/config/loaders/environmentLoader.ts` - Environment variable loading
- `src/config/loaders/argumentLoader.ts` - CLI argument processing
- `src/config/merging/configMerger.ts` - Configuration merging logic
- `src/config/utils/pathUtils.ts` - Configuration path utilities

**Config Command Refactoring:**
- `src/commands/config/operations/index.ts` - Operations module exports
- `src/commands/config/operations/showConfig.ts` - Configuration display logic
- `src/commands/config/operations/setConfig.ts` - Configuration setting logic
- `src/commands/config/operations/unsetConfig.ts` - Configuration removal logic
- `src/commands/config/operations/validateConfig.ts` - Configuration validation command
- `src/commands/config/formatters/index.ts` - Formatters module exports
- `src/commands/config/formatters/jsonFormatter.ts` - JSON output formatting
- `src/commands/config/formatters/yamlFormatter.ts` - YAML output formatting
- `src/commands/config/formatters/tableFormatter.ts` - Table/tree output formatting
- `src/commands/config/utils/propertyUtils.ts` - Property manipulation utilities
- `src/commands/config/utils/fileUtils.ts` - File operation utilities

**Crawl Command Refactoring:**
- `src/commands/crawl/strategies/index.ts` - Strategy module exports
- `src/commands/crawl/strategies/baseCrawlStrategy.ts` - Abstract base strategy
- `src/commands/crawl/strategies/graphqlCrawlStrategy.ts` - GraphQL-based crawling
- `src/commands/crawl/strategies/restCrawlStrategy.ts` - REST-based crawling
- `src/commands/crawl/strategies/hybridCrawlStrategy.ts` - Mixed approach strategy
- `src/commands/crawl/steps/index.ts` - Step module exports
- `src/commands/crawl/steps/areasStep.ts` - Step 1: Areas crawling
- `src/commands/crawl/steps/usersStep.ts` - Step 2: Users crawling
- `src/commands/crawl/steps/resourcesStep.ts` - Step 3: Common resources
- `src/commands/crawl/steps/repositoryStep.ts` - Step 4: Repository resources
- `src/commands/crawl/orchestrator/crawlOrchestrator.ts` - Main orchestration logic

**Shared Utilities:**
- `src/commands/crawl/fetchers/index.ts` - Fetchers module exports
- `src/commands/crawl/fetchers/baseFetcher.ts` - Base fetcher with common patterns
- `src/commands/crawl/fetchers/graphqlFetcher.ts` - GraphQL-specific fetching
- `src/commands/crawl/fetchers/restFetcher.ts` - REST-specific fetching
- `src/commands/crawl/processors/index.ts` - Processors module exports
- `src/commands/crawl/processors/callbackProcessor.ts` - Callback processing logic
- `src/commands/crawl/processors/dataProcessor.ts` - Data transformation logic
- `src/commands/crawl/processors/storageProcessor.ts` - Storage handling logic
- `src/commands/crawl/utils/index.ts` - Utilities module exports
- `src/commands/crawl/utils/queryBuilder.ts` - GraphQL query construction
- `src/commands/crawl/utils/paginationUtils.ts` - Pagination handling
- `src/commands/crawl/utils/errorHandling.ts` - Standardized error handling

**Existing files to be modified:**
- `src/commands/config/impl.ts` - Refactored to use new operations modules
- `src/commands/crawl/impl.ts` - Refactored to use strategy pattern and orchestrator
- `src/commands/crawl/commonResources.ts` - Refactored to use shared fetchers/processors
- `src/commands/crawl/restResources.ts` - Refactored to use shared fetchers/processors
- `src/config/loader.ts` - Refactored to use separate loaders and validation
- `src/commands/config/impl.test.ts` - Updated for new structure
- `src/commands/crawl/impl.test.ts` - Updated for new structure
- `src/commands/crawl/commonResources.test.ts` - Updated for new structure
- `src/commands/crawl/restResources.test.ts` - Updated for new structure

**Configuration file updates:**
- `tsconfig.json` - Updated path mappings for new module structure
- `jest.config.ts` - Updated test patterns and module resolution

## Functions
Breakdown of function modifications and new function creation.

**New functions to be created:**

**Configuration Validation:**
- `validateGitlabConfig(config: GitlabConfig): ValidationResult`
- `validateDatabaseConfig(config: DatabaseConfig): ValidationResult`
- `validateOutputConfig(config: OutputConfig): ValidationResult`
- `validateLoggingConfig(config: LoggingConfig): ValidationResult`
- `createValidationError(field: string, message: string, value?: any): ConfigValidationError`

**Configuration Loading:**
- `loadLocalConfigFile(paths: string[]): Partial<Config>`
- `loadUserConfigFile(paths: string[]): Partial<Config>`
- `loadEnvironmentVariables(): Partial<Config>`
- `loadCliArguments(args: CliArgs): Partial<Config>`
- `mergeConfigurations(configs: Partial<Config>[]): Config`

**Config Command Operations:**
- `formatAsJson(config: Config, section?: string): string`
- `formatAsYaml(config: Config, section?: string): string`
- `formatAsTable(config: Config, section?: string): string`
- `setNestedProperty(obj: Record<string, unknown>, path: string, value: unknown): void`
- `unsetNestedProperty(obj: Record<string, unknown>, path: string): boolean`
- `parseValueByType(value: string, type?: string): unknown`

**Crawl Strategy Functions:**
- `createCrawlStrategy(type: 'graphql' | 'rest' | 'hybrid'): CrawlStrategy`
- `executeStep(stepName: string, context: CrawlContext): Promise<StepResult>`
- `orchestrateCrawl(strategy: CrawlStrategy, context: CrawlContext): Promise<CrawlResult>`

**Fetcher Functions:**
- `fetchWithPagination<T>(fetcher: ResourceFetcher<T>, options: PaginationOptions): Promise<T[]>`
- `buildGraphQLQuery(resourceType: string, fields: string[]): string`
- `handleApiError(error: Error, context: FetchContext): ProcessedError`

**Processor Functions:**
- `processWithCallback<T>(data: T[], callback: ProcessorCallback, context: CallbackContext): Promise<T[]>`
- `transformDataForStorage<T>(data: T[], transformer: DataTransformer<T>): T[]`
- `writeToHierarchicalStorage<T>(data: T[], path: HierarchicalPath, options: StorageOptions): number`

**Modified functions:**
- `showConfig()` - Refactored to use formatters and validation
- `setConfig()` - Refactored to use property utilities and validation
- `unsetConfig()` - Refactored to use property utilities
- `validateConfig()` - Refactored to use validation modules
- `areas()`, `users()`, `resources()`, `repository()` - Refactored to use strategies
- `crawlAll()` - Refactored to use orchestrator
- `CommonResourcesFetcher` methods - Refactored to use shared patterns
- `RestResourcesFetcher` methods - Refactored to use shared patterns
- `ConfigLoader.load()` - Refactored to use separate loaders

**Removed functions:**
- Internal helper functions now moved to utility modules
- Duplicated validation logic consolidated into validators
- Repeated fetching patterns consolidated into base fetchers

## Classes
Class structure modifications and new class creation.

**New classes to be created:**

**Configuration Module:**
- `ConfigValidator` - Main validation orchestrator with pluggable rules
- `GitlabConfigValidator` - GitLab-specific validation logic
- `DatabaseConfigValidator` - Database configuration validation
- `OutputConfigValidator` - Output configuration validation
- `LoggingConfigValidator` - Logging configuration validation
- `FileConfigLoader` - Handles YAML file loading with error handling
- `EnvironmentConfigLoader` - Processes environment variables
- `ArgumentConfigLoader` - Processes CLI arguments
- `ConfigMerger` - Handles deep merging of configuration objects

**Config Command Module:**
- `ConfigOperationHandler` - Base class for config operations
- `ShowConfigOperation` - Configuration display with multiple formats
- `SetConfigOperation` - Configuration setting with validation
- `UnsetConfigOperation` - Configuration removal with validation
- `ValidateConfigOperation` - Configuration validation with reporting
- `JsonConfigFormatter` - JSON output formatting
- `YamlConfigFormatter` - YAML output formatting
- `TableConfigFormatter` - Table/tree output formatting

**Crawl Command Module:**
- `BaseCrawlStrategy` - Abstract strategy with common functionality
- `GraphQLCrawlStrategy` - GraphQL-based crawling implementation
- `RestCrawlStrategy` - REST-based crawling implementation
- `HybridCrawlStrategy` - Mixed approach strategy
- `CrawlOrchestrator` - Main orchestration and step coordination
- `AreasStep`, `UsersStep`, `ResourcesStep`, `RepositoryStep` - Individual step implementations

**Shared Utility Classes:**
- `BaseFetcher<T>` - Base class for resource fetching with common patterns
- `GraphQLFetcher<T>` - GraphQL-specific fetching with query building
- `RestFetcher<T>` - REST-specific fetching with pagination
- `CallbackProcessor` - Handles callback processing and filtering
- `DataProcessor<T>` - Data transformation and validation
- `StorageProcessor` - Hierarchical storage handling
- `QueryBuilder` - GraphQL query construction utilities
- `PaginationHandler` - Pagination logic for API calls
- `ErrorHandler` - Standardized error handling and reporting

**Modified classes:**
- `ConfigLoader` - Refactored to use separate loaders and validators
- `CommonResourcesFetcher` - Refactored to use shared base classes and patterns
- `RestResourcesFetcher` - Refactored to use shared base classes and patterns

**Removed classes:**
- Monolithic implementations replaced by focused, single-responsibility classes

## Dependencies
Package and version requirements for the refactored implementation.

**No new external dependencies required** - All refactoring uses existing project dependencies:
- `js-yaml` - Already used for YAML parsing
- `picocolors` - Already used for terminal colors
- `treeify` - Already used for tree formatting
- `winston` - Already used for logging
- TypeScript - Already configured for the project

**Internal dependency changes:**
- New internal modules will be imported using relative paths
- Existing imports will be updated to point to new module locations
- Barrel exports (`index.ts` files) will be added for cleaner imports

## Testing
Testing approach and test file updates.

**New test files to be created:**
- `src/config/validation/validator.test.ts` - Validation orchestrator tests
- `src/config/validation/rules/gitlabValidator.test.ts` - GitLab validation tests
- `src/config/validation/rules/databaseValidator.test.ts` - Database validation tests
- `src/config/loaders/fileLoader.test.ts` - File loader tests
- `src/config/loaders/environmentLoader.test.ts` - Environment loader tests
- `src/config/merging/configMerger.test.ts` - Config merging tests
- `src/commands/config/operations/showConfig.test.ts` - Show config operation tests
- `src/commands/config/operations/setConfig.test.ts` - Set config operation tests
- `src/commands/config/formatters/tableFormatter.test.ts` - Formatter tests
- `src/commands/crawl/strategies/graphqlCrawlStrategy.test.ts` - GraphQL strategy tests
- `src/commands/crawl/strategies/restCrawlStrategy.test.ts` - REST strategy tests
- `src/commands/crawl/steps/areasStep.test.ts` - Areas step tests
- `src/commands/crawl/fetchers/baseFetcher.test.ts` - Base fetcher tests
- `src/commands/crawl/processors/callbackProcessor.test.ts` - Callback processor tests

**Existing test files to be modified:**
- `src/commands/config/impl.test.ts` - Updated for new operation structure
- `src/commands/crawl/impl.test.ts` - Updated for strategy pattern usage
- `src/commands/crawl/commonResources.test.ts` - Updated for shared utilities
- `src/commands/crawl/restResources.test.ts` - Updated for shared utilities

**Testing strategy:**
- Unit tests for individual validators, loaders, and processors
- Integration tests for strategy implementations
- Mock-based testing for API interactions
- Property-based testing for configuration merging
- Error scenario testing for all major operations

## Implementation Order
Sequential steps to minimize conflicts and ensure successful integration.

**Phase 1: Configuration Module Refactoring**
1. Create type definitions in `src/config/validation/types.ts`
2. Implement individual validators (`gitlabValidator.ts`, `databaseValidator.ts`, etc.)
3. Create validation orchestrator in `src/config/validation/validator.ts`
4. Implement configuration loaders (`fileLoader.ts`, `environmentLoader.ts`, `argumentLoader.ts`)
5. Create configuration merger in `src/config/merging/configMerger.ts`
6. Update `src/config/loader.ts` to use new components
7. Create comprehensive tests for validation and loading

**Phase 2: Config Command Operations**
8. Create formatters (`jsonFormatter.ts`, `yamlFormatter.ts`, `tableFormatter.ts`)
9. Implement operation handlers (`showConfig.ts`, `setConfig.ts`, `unsetConfig.ts`, `validateConfig.ts`)
10. Create utility modules (`propertyUtils.ts`, `fileUtils.ts`)
11. Update `src/commands/config/impl.ts` to use new operations
12. Update and extend `src/commands/config/impl.test.ts`

**Phase 3: Shared Crawl Utilities**
13. Create base fetcher and processor classes
14. Implement GraphQL and REST specific fetchers
15. Create callback and storage processors
16. Implement utility modules (query builder, pagination, error handling)
17. Create comprehensive tests for shared utilities

**Phase 4: Crawl Strategy Implementation**
18. Create base strategy interface and abstract class
19. Implement GraphQL, REST, and hybrid strategies
20. Create step implementations (`areasStep.ts`, `usersStep.ts`, etc.)
21. Implement crawl orchestrator
22. Create tests for strategies and steps

**Phase 5: Integration and Legacy Update**
23. Update `src/commands/crawl/impl.ts` to use strategies and orchestrator
24. Refactor `src/commands/crawl/commonResources.ts` to use shared utilities
25. Refactor `src/commands/crawl/restResources.ts` to use shared utilities
26. Update all existing test files
27. Update configuration files (tsconfig.json, jest.config.ts)

**Phase 6: Validation and Cleanup**
28. Run comprehensive test suite
29. Perform integration testing with real GitLab API
30. Update documentation and type definitions
31. Remove deprecated code and clean up imports
32. Final validation of all functionality
