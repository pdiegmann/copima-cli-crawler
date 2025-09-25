# AUTONOMOUS IMPLEMENTATION GUIDE - TypeScript Refactoring

## CRITICAL SITUATION ANALYSIS

**MAJOR DISCREPANCY DISCOVERED:**
- **Progress File Claims**: Phases 1-3 complete (50%) with modular architecture built
- **Actual Codebase Reality**: Only legacy monolithic files exist, no new modular structure
- **Action Required**: Build the missing foundation architecture before proceeding

## CURRENT STATE VERIFICATION

**Actual File Structure Found:**
```
src/config/
├── defaults.ts          # Legacy
├── index.ts            # Legacy
├── loader.ts           # Legacy monolithic (300+ lines)
└── types.ts            # Legacy

src/commands/crawl/
├── impl.ts             # Legacy monolithic (380+ lines)
├── commonResources.ts  # Legacy monolithic (350+ lines)
├── restResources.ts    # Legacy monolithic (400+ lines)
└── newImpl.ts          # Stub only
```

**Missing Architecture:** All claimed modular components in validation/, loaders/, fetchers/, processors/, etc.

## AUTONOMOUS IMPLEMENTATION PLAN

### PHASE 4A: Configuration Module Foundation (Steps 1-5)

#### Step 1: Create Configuration Validation Module
```bash
mkdir -p src/config/validation/rules
```

**Create `src/config/validation/types.ts`:**
```typescript
export interface ValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
  warnings: string[];
}

export interface ConfigValidationError {
  field: string;
  message: string;
  value?: unknown;
  severity: 'error' | 'warning';
}

export interface ValidationRule {
  field: string;
  validate: (value: unknown) => ValidationResult;
  dependencies?: string[];
}
```

**Create `src/config/validation/validator.ts`:**
```typescript
import type { Config } from '../types.js';
import type { ValidationResult, ConfigValidationError } from './types.js';
import { GitlabConfigValidator } from './rules/gitlabValidator.js';
import { DatabaseConfigValidator } from './rules/databaseValidator.js';
import { OutputConfigValidator } from './rules/outputValidator.js';
import { LoggingConfigValidator } from './rules/loggingValidator.js';

export class ConfigValidator {
  private validators = [
    new GitlabConfigValidator(),
    new DatabaseConfigValidator(),
    new OutputConfigValidator(),
    new LoggingConfigValidator()
  ];

  validate(config: Partial<Config>): ValidationResult {
    const allErrors: ConfigValidationError[] = [];
    const allWarnings: string[] = [];

    for (const validator of this.validators) {
      const result = validator.validate(config);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    return {
      isValid: allErrors.filter(e => e.severity === 'error').length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }
}
```

**Create `src/config/validation/rules/gitlabValidator.ts`:**
```typescript
import type { Config } from '../../types.js';
import type { ValidationResult, ConfigValidationError } from '../types.js';

export class GitlabConfigValidator {
  validate(config: Partial<Config>): ValidationResult {
    const errors: ConfigValidationError[] = [];
    const warnings: string[] = [];

    // Validate GitLab host
    if (config.gitlab?.host) {
      if (!this.isValidUrl(config.gitlab.host)) {
        errors.push({
          field: 'gitlab.host',
          message: 'Must be a valid URL',
          value: config.gitlab.host,
          severity: 'error'
        });
      }
    }

    // Validate access token
    if (config.gitlab?.accessToken) {
      if (typeof config.gitlab.accessToken !== 'string' || config.gitlab.accessToken.length < 20) {
        errors.push({
          field: 'gitlab.accessToken',
          message: 'Access token must be at least 20 characters',
          severity: 'error'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
```

**Continue with similar validators for database, output, and logging...**

#### Step 2: Create Configuration Loaders Module
```bash
mkdir -p src/config/loaders
```

**Create `src/config/loaders/fileLoader.ts`:**
```typescript
import { readFileSync } from 'fs';
import { parse as parseYaml } from 'js-yaml';
import type { Config } from '../types.js';

export class FileConfigLoader {
  async loadYamlFile(path: string): Promise<Partial<Config>> {
    try {
      const content = readFileSync(path, 'utf-8');
      return parseYaml(content) as Partial<Config>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {}; // File doesn't exist, return empty config
      }
      throw new Error(`Failed to load config from ${path}: ${(error as Error).message}`);
    }
  }

  async loadJsonFile(path: string): Promise<Partial<Config>> {
    try {
      const content = readFileSync(path, 'utf-8');
      return JSON.parse(content) as Partial<Config>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }
      throw new Error(`Failed to load config from ${path}: ${(error as Error).message}`);
    }
  }
}
```

#### Step 3: Create Configuration Merging Module
**Create `src/config/merging/configMerger.ts`:**
```typescript
import type { Config } from '../types.js';

export class ConfigMerger {
  merge(configs: Partial<Config>[]): Config {
    return configs.reduce((merged, config) => {
      return this.deepMerge(merged, config);
    }, {} as Config);
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}
```

#### Step 4: Create Configuration Utils Module
**Create `src/config/utils/pathUtils.ts`:**
```typescript
import { resolve, expandTilde } from 'path';
import { homedir } from 'os';

export class PathUtils {
  static expandPath(path: string): string {
    if (path.startsWith('~/')) {
      return resolve(homedir(), path.slice(2));
    }
    if (path.startsWith('$HOME/')) {
      return resolve(homedir(), path.slice(6));
    }
    return resolve(path);
  }

  static resolveConfigPaths(basePaths: string[]): string[] {
    return basePaths.map(path => this.expandPath(path));
  }
}
```

#### Step 5: Refactor src/config/loader.ts
**Update the existing loader to use new modular components:**
```typescript
// Import new modules
import { ConfigValidator } from './validation/validator.js';
import { FileConfigLoader } from './loaders/fileLoader.js';
import { ConfigMerger } from './merging/configMerger.js';
import { PathUtils } from './utils/pathUtils.js';

// Refactor load() method to use modular architecture
```

### PHASE 4B: Config Command Architecture (Steps 6-10)

#### Step 6: Create Config Formatters
```bash
mkdir -p src/commands/config/formatters
```

**Create `src/commands/config/formatters/jsonFormatter.ts`:**
```typescript
import type { Config } from '../../../config/types.js';

export class JsonConfigFormatter {
  format(config: Config, section?: string): string {
    const data = section ? this.getSection(config, section) : config;
    return JSON.stringify(data, null, 2);
  }

  private getSection(config: Config, section: string): unknown {
    return section.split('.').reduce((obj, key) => obj?.[key], config as any);
  }
}
```

**Create similar formatters for YAML and table formats...**

#### Step 7: Create Config Operations
```bash
mkdir -p src/commands/config/operations
```

**Create `src/commands/config/operations/showConfig.ts`:**
```typescript
import type { Config } from '../../../config/types.js';
import { JsonConfigFormatter } from '../formatters/jsonFormatter.js';
import { YamlConfigFormatter } from '../formatters/yamlFormatter.js';
import { TableConfigFormatter } from '../formatters/tableFormatter.js';

export class ShowConfigOperation {
  private formatters = {
    json: new JsonConfigFormatter(),
    yaml: new YamlConfigFormatter(),
    table: new TableConfigFormatter()
  };

  execute(config: Config, options: { format?: string; section?: string }): string {
    const format = options.format || 'json';
    const formatter = this.formatters[format as keyof typeof this.formatters];

    if (!formatter) {
      throw new Error(`Unknown format: ${format}`);
    }

    return formatter.format(config, options.section);
  }
}
```

### PHASE 4C: Crawl Base Architecture (Steps 11-15)

#### Step 11: Create Crawl Base Interfaces
```bash
mkdir -p src/commands/crawl/base
```

**Create `src/commands/crawl/base/interfaces.ts`:**
```typescript
export interface CrawlStrategy {
  execute(context: CrawlContext): Promise<CrawlResult>;
  getName(): string;
  supports(resourceType: string): boolean;
}

export interface CrawlContext {
  sessionId: string;
  config: Config;
  logger: Logger;
  graphqlClient: GitlabGraphQLClient;
  restClient: GitlabRestClient;
  resumeEnabled: boolean;
  progressReporting: boolean;
}

export interface CrawlResult {
  success: boolean;
  totalProcessingTime: number;
  summary: CrawlSummary;
  errors?: Error[];
}

export interface CrawlSummary {
  resourcesCrawled: number;
  errors: string[];
  warnings: string[];
  details: Record<string, unknown>;
}

export interface ResourceFetcher<T> {
  fetch(options: FetchOptions): Promise<FetchResult<T>>;
  supports(resourceType: string): boolean;
}

export interface FetchOptions {
  resourceType: string;
  pagination?: PaginationOptions;
  filters?: Record<string, unknown>;
  context: CrawlContext;
}

export interface FetchResult<T> {
  data: T[];
  pagination?: PaginationInfo;
  metadata: FetchMetadata;
}

export interface DataProcessor {
  process<T>(data: T[], context: ProcessingContext): Promise<T[]>;
  getName(): string;
}

export interface ProcessingContext {
  resourceType: string;
  callbackContext: CallbackContext;
  config: Config;
  logger: Logger;
}

// Add 20+ more interfaces following this pattern...
```

#### Step 12: Create Resource Fetchers
```bash
mkdir -p src/commands/crawl/fetchers
```

**Create `src/commands/crawl/fetchers/baseFetcher.ts`:**
```typescript
import type { ResourceFetcher, FetchOptions, FetchResult } from '../base/interfaces.js';

export abstract class BaseFetcher<T> implements ResourceFetcher<T> {
  abstract fetch(options: FetchOptions): Promise<FetchResult<T>>;
  abstract supports(resourceType: string): boolean;

  protected createFetchResult(data: T[], metadata: Partial<FetchMetadata>): FetchResult<T> {
    return {
      data,
      metadata: {
        fetchTime: Date.now(),
        count: data.length,
        source: this.constructor.name,
        ...metadata
      }
    };
  }

  protected handleFetchError(error: Error, context: string): never {
    throw new Error(`${this.constructor.name} fetch failed in ${context}: ${error.message}`);
  }
}
```

**Create `src/commands/crawl/fetchers/graphqlFetcher.ts`:**
```typescript
import { BaseFetcher } from './baseFetcher.js';
import type { FetchOptions, FetchResult } from '../base/interfaces.js';

export class GraphQLResourceFetcher<T> extends BaseFetcher<T> {
  async fetch(options: FetchOptions): Promise<FetchResult<T>> {
    try {
      const { graphqlClient } = options.context;
      const query = this.buildQuery(options.resourceType);

      const result = await graphqlClient.query(query);
      const data = this.extractData(result, options.resourceType);

      return this.createFetchResult(data, {
        source: 'GraphQL',
        query: query.trim()
      });
    } catch (error) {
      this.handleFetchError(error as Error, `GraphQL fetch for ${options.resourceType}`);
    }
  }

  supports(resourceType: string): boolean {
    return ['groups', 'projects', 'users', 'issues', 'merge_requests'].includes(resourceType);
  }

  private buildQuery(resourceType: string): string {
    const queries = {
      groups: `query { groups { nodes { id fullPath name visibility description createdAt updatedAt } } }`,
      projects: `query { projects { nodes { id fullPath name visibility description createdAt updatedAt } } }`,
      users: `query { users { nodes { id username name publicEmail createdAt } } }`
    };
    return queries[resourceType as keyof typeof queries] || '';
  }

  private extractData(result: any, resourceType: string): T[] {
    const pluralType = resourceType.endsWith('s') ? resourceType : `${resourceType}s`;
    return result.data?.[pluralType]?.nodes || [];
  }
}
```

#### Step 13: Create Data Processors
```bash
mkdir -p src/commands/crawl/processors
```

**Create `src/commands/crawl/processors/callbackProcessor.ts`:**
```typescript
import { createCallbackManager } from '../../../callback/index.js';
import type { DataProcessor, ProcessingContext } from '../base/interfaces.js';

export class CallbackProcessor implements DataProcessor {
  getName(): string {
    return 'CallbackProcessor';
  }

  async process<T>(data: T[], context: ProcessingContext): Promise<T[]> {
    try {
      const callbackManager = createCallbackManager(context.config.callbacks);

      const processedData = await callbackManager.processObjects(
        context.callbackContext,
        data
      );

      // Log filtering statistics
      if (processedData.length !== data.length) {
        context.logger.info(
          `${context.resourceType}: ${data.length} original → ${processedData.length} processed (${data.length - processedData.length} filtered)`
        );
      }

      return processedData;
    } catch (error) {
      context.logger.error(`Callback processing failed for ${context.resourceType}`, { error });
      return data; // Return original data if callback processing fails
    }
  }
}
```

#### Step 14: Create Crawl Utilities
```bash
mkdir -p src/commands/crawl/utils
```

**Create `src/commands/crawl/utils/validation.ts`:**
```typescript
import type { CrawlContext, CrawlResult } from '../base/interfaces.js';

export class CrawlValidation {
  static validateContext(context: CrawlContext): string[] {
    const errors: string[] = [];

    if (!context.sessionId) {
      errors.push('Session ID is required');
    }

    if (!context.config) {
      errors.push('Configuration is required');
    }

    if (!context.logger) {
      errors.push('Logger is required');
    }

    if (!context.graphqlClient && !context.restClient) {
      errors.push('At least one API client (GraphQL or REST) is required');
    }

    return errors;
  }

  static validateResult(result: CrawlResult): boolean {
    return typeof result.success === 'boolean' &&
           typeof result.totalProcessingTime === 'number' &&
           result.summary !== undefined;
  }
}
```

**Create `src/commands/crawl/utils/rateLimiting.ts`:**
```typescript
export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly timeWindow: number;

  constructor(maxRequests: number = 100, timeWindowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.waitForSlot();
      }
    }

    this.requests.push(now);
  }
}
```

### PHASE 5: Crawl Strategy Implementation (Steps 16-20)

#### Step 16: Create Concrete Crawl Strategies
```bash
mkdir -p src/commands/crawl/strategies
```

**Create `src/commands/crawl/strategies/baseCrawlStrategy.ts`:**
```typescript
import type { CrawlStrategy, CrawlContext, CrawlResult } from '../base/interfaces.js';

export abstract class BaseCrawlStrategy implements CrawlStrategy {
  abstract execute(context: CrawlContext): Promise<CrawlResult>;
  abstract getName(): string;
  abstract supports(resourceType: string): boolean;

  protected createResult(
    success: boolean,
    processingTime: number,
    summary: any,
    errors?: Error[]
  ): CrawlResult {
    return {
      success,
      totalProcessingTime: processingTime,
      summary,
      errors
    };
  }

  protected async measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; time: number }> {
    const start = Date.now();
    const result = await operation();
    const time = Date.now() - start;
    return { result, time };
  }
}
```

**Create `src/commands/crawl/strategies/graphqlCrawlStrategy.ts`:**
```typescript
import { BaseCrawlStrategy } from './baseCrawlStrategy.js';
import { GraphQLResourceFetcher } from '../fetchers/graphqlFetcher.js';
import { CallbackProcessor } from '../processors/callbackProcessor.js';
import type { CrawlContext, CrawlResult } from '../base/interfaces.js';

export class GraphQLCrawlStrategy extends BaseCrawlStrategy {
  private fetcher = new GraphQLResourceFetcher();
  private processor = new CallbackProcessor();

  getName(): string {
    return 'GraphQLCrawlStrategy';
  }

  supports(resourceType: string): boolean {
    return this.fetcher.supports(resourceType);
  }

  async execute(context: CrawlContext): Promise<CrawlResult> {
    const startTime = Date.now();
    const errors: Error[] = [];
    let resourcesCrawled = 0;

    try {
      context.logger.info(`🚀 Starting GraphQL crawl strategy`);

      // Step 1: Crawl areas (groups and projects)
      await this.crawlAreas(context);
      resourcesCrawled += 2;

      // Step 2: Crawl users
      await this.crawlUsers(context);
      resourcesCrawled += 1;

      // Step 3: Crawl resources
      await this.crawlResources(context);
      resourcesCrawled += 8;

      const totalTime = Date.now() - startTime;
      context.logger.info(`✅ GraphQL crawl completed in ${totalTime}ms`);

      return this.createResult(true, totalTime, {
        resourcesCrawled,
        errors: [],
        warnings: [],
        details: { strategy: 'GraphQL' }
      });
    } catch (error) {
      errors.push(error as Error);
      const totalTime = Date.now() - startTime;

      return this.createResult(false, totalTime, {
        resourcesCrawled,
        errors: errors.map(e => e.message),
        warnings: [],
        details: { strategy: 'GraphQL', failedAt: 'unknown' }
      }, errors);
    }
  }

  private async crawlAreas(context: CrawlContext): Promise<void> {
    context.logger.info('Starting Step 1: Crawling areas (groups and projects)');

    // Fetch groups
    const groupsResult = await this.fetcher.fetch({
      resourceType: 'groups',
      context
    });

    // Fetch projects
    const projectsResult = await this.fetcher.fetch({
      resourceType: 'projects',
      context
    });

    // Process and store both
    await this.processAndStore(groupsResult.data, 'group', context);
    await this.processAndStore(projectsResult.data, 'project', context);

    context.logger.info(`Fetched ${groupsResult.data.length} groups and ${projectsResult.data.length} projects`);
  }

  private async crawlUsers(context: CrawlContext): Promise<void> {
    context.logger.info('Starting Step 2: Crawling users');

    const usersResult = await this.fetcher.fetch({
      resourceType: 'users',
      context
    });

    await this.processAndStore(usersResult.data, 'user', context);
    context.logger.info(`Fetched ${usersResult.data.length} users`);
  }

  private async crawlResources(context: CrawlContext): Promise<void> {
    context.logger.info('Starting Step 3: Crawling area-specific resources');

    const resourceTypes = ['labels', 'issues', 'boards', 'epics', 'audit_events', 'snippets', 'pipelines', 'releases'];

    for (const resourceType of resourceTypes) {
      if (this.supports(resourceType)) {
        const result = await this.fetcher.fetch({ resourceType, context });
        await this.processAndStore(result.data, resourceType, context);
        context.logger.info(`Fetched ${result.data.length} ${resourceType}`);
      }
    }
  }

  private async processAndStore<T>(data: T[], resourceType: string, context: CrawlContext): Promise<void> {
    const processingContext = {
      resourceType,
      callbackContext: {
        host: context.config.gitlab?.host,
        accountId: context.config.gitlab?.accessToken,
        resourceType
      },
      config: context.config,
      logger: context.logger
    };

    const processedData = await this.processor.process(data, processingContext);

    // Store to hierarchical storage (implement storage logic here)
    // This would use the existing storage modules
  }
}
```

#### Step 17: Create Crawl Steps Pipeline
```bash
mkdir -p src/commands/crawl/steps
```

**Create `src/commands/crawl/steps/baseStep.ts`:**
```typescript
import type { CrawlContext, StepResult } from '../base/interfaces.js';

export abstract class BaseStep {
  abstract getName(): string;
  abstract execute(context: CrawlContext): Promise<StepResult>;

  protected createStepResult(
    success: boolean,
    resourcesCrawled: number,
    processingTime: number,
    errors: string[] = []
  ): StepResult {
    return {
      success,
      resourcesCrawled,
      processingTime,
      errors
    };
  }
}
```

#### Step 18: Create Crawl Orchestrator
```bash
mkdir -p src/commands/crawl/orchestrator
```

**Create `src/commands/crawl/orchestrator/crawlOrchestrator.ts`:**
```typescript
import { GraphQLCrawlStrategy } from '../strategies/graphqlCrawlStrategy.js';
import { RestCrawlStrategy } from '../strategies/restCrawlStrategy.js';
import { HybridCrawlStrategy } from '../strategies/hybridCrawlStrategy.js';
import type { CrawlStrategy, CrawlContext, CrawlResult } from '../base/interfaces.js';

export class CrawlOrchestrator {
  private strategies: Map<string, CrawlStrategy> = new Map();

  constructor() {
    this.strategies.set('graphql', new GraphQLCrawlStrategy());
    this.strategies.set('rest', new RestCrawlStrategy());
    this.strategies.set('hybrid', new HybridCrawlStrategy());
  }

  async execute(context: CrawlContext, strategyName: string = 'hybrid'): Promise<CrawlResult> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown crawl strategy: ${strategyName}`);
    }

    context.logger.info(`🎯 Executing crawl with ${strategy.getName()} strategy`);

    const result = await strategy.execute(context);

    if (result.success) {
      context.logger.info(`✅ Crawl completed successfully in ${result.totalProcessingTime}ms`);
    } else {
      context.logger.error(`❌ Crawl failed with ${result.errors?.length || 0} errors`);
    }

    return result;
  }

  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}
```

#### Step 19: Replace Stub newImpl.ts
**Update `src/commands/crawl/newImpl.ts`:**
```typescript
import { CrawlOrchestrator } from './orchestrator/crawlOrchestrator.js';
import type { Config } from '../../config/types.js';
import type { CrawlContext } from './base/interfaces.js';

export const crawlAll = async (
  config: Config,
  options: { sessionId: string; resumeEnabled: boolean; progressReporting: boolean }
): Promise<{ success: boolean; totalProcessingTime: number; summary: any }> => {

  const context: CrawlContext = {
    sessionId: options.sessionId,
    config,
    logger: config.logger, // Assumes logger is available in config
    graphqlClient: config.graphqlClient, // Assumes client is available
    restClient: config.restClient, // Assumes client is available
    resumeEnabled: options.resumeEnabled,
    progressReporting: options.progressReporting
  };

  const orchestrator = new CrawlOrchestrator();
  const result = await orchestrator.execute(context, 'hybrid');

  return {
    success: result.success,
    totalProcessingTime: result.totalProcessingTime,
    summary: result.summary
  };
};
```

### PHASE 6: Legacy Integration (Steps 21-25)

#### Step 21: Update Main Crawl Implementation
**Update `src/commands/crawl/impl.ts` to use the new orchestrator:**
```typescript
// Add import at top
import { crawlAll as newCrawlAll } from './newImpl.js';

// Update crawlAll function to use real implementation:
export const crawlAll = async function (this: LocalContext, flags: any): Promise<void> {
  const logger = this.logger;

  logger.info("🚀 Starting complete GitLab crawl with enhanced orchestrator");

  try {
    // Convert LocalContext config to standard config format
    const config = this.config;

    // Execute the new crawl implementation
    const result = await newCrawlAll(config, {
      sessionId: `crawl-${Date.now()}`,
      resumeEnabled: config?.resume?.enabled !== false,
      progressReporting: config?.progress?.enabled !== false,
    });

    if (result.success) {
      logger.info("✅ GitLab crawl completed successfully", {
        totalProcessingTime: `${result.totalProcessingTime}ms`,
        summary: result.summary,
      });
    } else {
      logger.warn("⚠️ GitLab crawl completed with errors", {
        errors: result.summary.errors,
        summary: result.summary,
      });
    }
  } catch (error) {
    logger.error("❌ GitLab crawl failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
```

### TESTING STRATEGY

**Create comprehensive tests for each module:**

```bash
# Test structure to create
src/config/validation/__tests__/
src/config/loaders/__tests__/
src/commands/config/formatters/__tests__/
src/commands/crawl/strategies/__tests__/
src/commands/crawl/fetchers/__tests__/
```

**Test execution sequence:**
1. Run unit tests after each phase: `bunx jest src/config/validation/`
2. Run integration tests: `bunx jest src/commands/crawl/`
3. Run full test suite: `bunx jest`
4. Validate backward compatibility with existing command interface

### VALIDATION CHECKLIST

**After each phase, verify:**
- [ ] TypeScript compilation passes: `bunx tsc --noEmit`
- [ ] ESLint compliance: `bunx eslint src/`
- [ ] Tests pass: `bunx jest`
- [ ] No breaking changes to existing API
- [ ] New modules follow SOLID principles
- [ ] Code coverage targets met (90%+)

### COMPLETION CRITERIA

**Phase 4A Complete:** Configuration modules created and tested
**Phase 4B Complete:** Config command refactored and tested
**Phase 4C Complete:** Crawl base architecture created and tested
**Phase 5 Complete:** Crawl strategies implemented and orchestrator working
**Phase 6 Complete:** Legacy files updated and integration tested
**Phase 7 Complete:** Full test coverage, documentation, and cleanup

This guide provides the complete autonomous implementation path to rebuild the missing architecture and complete the TypeScript refactoring project.
