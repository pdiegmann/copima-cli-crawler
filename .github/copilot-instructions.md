# Copilot Instructions

## Architecture quick tour

- Stricli CLI entry is `src/bin/cli.ts`; `src/app.ts` registers commands and maps to `src/commands/**`.
- `src/context.ts` builds the command context: pass `createGraphQLClient`, `createRestClient`, and `createLogger` to all routes; extend the context instead of bypassing it.
- GraphQL and REST clients live in `src/api`; reuse `GitLabGraphQLClient`/`GitLabRestClient` and their pagination helpers before inventing new fetchers.
- OAuth token flow is centralized in `src/auth/**`; any refresh logic must update the YAML storage in `database.yaml` via `YamlStorage` from `src/account/yamlStorage.ts`.

## Crawling workflow

- The crawler is split into the four steps implemented in `src/commands/crawl/impl.ts`; wire new resource fetchers into the step-specific sections, not directly into the CLI.
- Steps 1–3 should favor GraphQL queries from `src/api/queries`; defer to `GitLabRestClient` for the REST-only step 4 resources.
- Each step runs through callback hooks (`src/callback/**`) plus resume and progress managers—preserve those touch points when refactoring.

## Configuration &amp; context

- `ConfigLoader` (`src/config/loader.ts`) enforces the 5-level precedence (CLI → env → user config → local config → defaults) and applies validation/templates; extend loaders instead of bypassing it.
- Commands should call `buildContext` so tests can swap in the mocks in `src/__mocks__`; avoid manual client construction in command bodies.
- Persist OAuth credentials via `YamlStorage` in `database.yaml`; keep access and refresh tokens in sync as mandated in `README.md`.

## Storage, reporting, resume

- Use `HierarchicalStorageManager` (`src/storage/hierarchicalStorage.ts`) for JSONL output—it enforces deterministic naming and directory structure.
- `ProgressReporter` (`src/reporting/progressReporter.ts`) rewrites a single YAML file every second; keep updates idempotent and cheap to serialize.
- Resume state handling lives in `src/resume/**`; reuse that manager when adding checkpoints or recovery logic.

## Developer workflows

- Bun scripts drive development: `bun run dev` (CLI with TLS bypass), `bun run dev:auth` (auth bootstrap), `bun run build` (tsup bundle), `bun run build:executables` (platform binaries).
- Testing matrix: `bun test` for Bun-native suites, `bun run test`/`test:watch` for Jest, and `bun run test:e2e*` against configs in `examples/`.

## Conventions

- Always obtain loggers via `createLogger` (`src/logging/logger.ts`) and pass them through rather than using `console`.
- Commands are lazy-loaded with dynamic imports (`loader: async () => import("./impl.js")`); follow the same pattern for new Stricli routes.
- Prefer the mandated libraries in `README.md` (Stricli, Bun, Winston, picocolors, treeify, drizzle-orm) before adding new dependencies.
- Keep data artifacts consistent: JSONL per resource, YAML progress files, Drizzle-managed tokens, and document new flows under `docs/`.

## Testing guidelines

- Write Jest tests for all new modules following the pattern in existing `*.test.ts` files.
- Mock external dependencies (fetch, filesystem, database) using `@jest/globals` mocking utilities.
- Use descriptive test names: `describe("ComponentName")` and `it("should behavior when condition")`.
- Test files must be colocated with source files (e.g., `loader.ts` → `loader.test.ts`).
- E2E tests use YAML configs in `examples/` directory; add new test scenarios there when testing full crawler flows.
- Always test both success and error paths; use `expect().rejects` for async error cases.
- Mock the logger in tests to avoid console spam: `jest.mock("../logging")` with stub functions.

## Error handling

- Use custom error classes from `src/config/errors.ts` (e.g., `ConfigurationValidationError`) for domain-specific errors.
- Include structured context in errors: `{ field, severity, message, suggestion }` for validation issues.
- Always wrap external API calls in try-catch blocks; log errors with the contextual logger before rethrowing or handling.
- Prefer early returns for error conditions rather than deeply nested if-else chains.
- Never swallow errors silently; at minimum log them with `logger.error()` before graceful degradation.

## Security best practices

- Never commit tokens, secrets, or credentials; use environment variables or secure config files.
- Access tokens must be refreshed using the OAuth2 manager; never hardcode or reuse expired tokens.
- Sanitize all user inputs before using in filesystem paths (`sanitizePathPart` in `HierarchicalStorageManager`).
- Use parameterized GraphQL queries; never concatenate user input into query strings.
- Validate all configuration input with `ConfigValidator` before processing.
- File writes must use atomic operations (write to temp → rename) to prevent corruption.

## Code organization

- Group related functionality in modules under `src/` (e.g., `auth/`, `api/`, `storage/`).
- Each module should export an `index.ts` with public API; internal files use relative imports.
- Use TypeScript types from `src/types/` for shared data structures; avoid `any` except in mocks.
- Prefix private class methods with `private` visibility modifier.
- Keep functions focused on single responsibility; extract helpers when logic exceeds ~50 lines.

## Common pitfalls to avoid

- Don't bypass `ConfigLoader`; always load config through the 5-level hierarchy.
- Don't create new HTTP clients; reuse `GitLabGraphQLClient` and `GitLabRestClient`.
- Don't write to stdout/stderr directly; use the logger instance passed via context.
- Don't duplicate file path logic; use `HierarchicalStorageManager.createHierarchicalPath()`.
- Don't forget to update refresh tokens when refreshing access tokens (see `README.md` section on authentication).
- Don't skip validation; run `bun run lint` and fix all issues before committing.
- Don't add new dependencies without checking if existing libraries (Winston, picocolors, treeify) can solve the problem.

## Performance considerations

- Use streaming JSONL writes for large datasets instead of loading everything into memory.
- Implement pagination for GraphQL queries; never fetch unbounded result sets.
- Cache frequently accessed config values rather than re-reading files on every access.
- Use `FileLocker` (`src/storage/fileLocker.ts`) for concurrent file access to prevent corruption.
- Debounce progress updates to 1-second intervals to avoid excessive disk I/O.
