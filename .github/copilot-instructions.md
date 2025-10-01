# Copilot Instructions

## Architecture quick tour
- Stricli CLI entry is `src/bin/cli.ts`; `src/app.ts` registers commands and maps to `src/commands/**`.
- `src/context.ts` builds the command context: pass `createGraphQLClient`, `createRestClient`, and `createLogger` to all routes; extend the context instead of bypassing it.
- GraphQL and REST clients live in `src/api`; reuse `GitLabGraphQLClient`/`GitLabRestClient` and their pagination helpers before inventing new fetchers.
- OAuth token flow is centralized in `src/auth/**`; any refresh logic must update the Drizzle tables defined in `src/db/schema.ts`.

## Crawling workflow
- The crawler is split into the four steps implemented in `src/commands/crawl/impl.ts`; wire new resource fetchers into the step-specific sections, not directly into the CLI.
- Steps 1–3 should favor GraphQL queries from `src/api/queries`; defer to `GitLabRestClient` for the REST-only step 4 resources.
- Each step runs through callback hooks (`src/callback/**`) plus resume and progress managers—preserve those touch points when refactoring.

## Configuration & context
- `ConfigLoader` (`src/config/loader.ts`) enforces the 5-level precedence (CLI → env → user config → local config → defaults) and applies validation/templates; extend loaders instead of bypassing it.
- Commands should call `buildContext` so tests can swap in the mocks in `src/__mocks__`; avoid manual client construction in command bodies.
- Persist OAuth credentials via the Drizzle connection in `src/db/connection.ts`; keep access and refresh tokens in sync as mandated in `README.md`.

## Storage, reporting, resume
- Use `HierarchicalStorageManager` (`src/storage/hierarchicalStorage.ts`) for JSONL output—it enforces deterministic naming and directory structure.
- `ProgressReporter` (`src/reporting/progressReporter.ts`) rewrites a single YAML file every second; keep updates idempotent and cheap to serialize.
- Resume state handling lives in `src/resume/**`; reuse that manager when adding checkpoints or recovery logic.

## Developer workflows
- Bun scripts drive development: `bun run dev` (CLI with TLS bypass), `bun run dev:auth` (auth bootstrap), `bun run build` (tsup bundle), `bun run build:executables` (platform binaries).
- Testing matrix: `bun test` for Bun-native suites, `bun run test`/`test:watch` for Jest, and `bun run test:e2e*` against configs in `examples/`.
- Database utilities run through Drizzle commands: `bun run db:generate`, `bun run db:migrate`, `bun run db:studio`.

## Conventions
- Always obtain loggers via `createLogger` (`src/logging/logger.ts`) and pass them through rather than using `console`.
- Commands are lazy-loaded with dynamic imports (`loader: async () => import("./impl.js")`); follow the same pattern for new Stricli routes.
- Prefer the mandated libraries in `README.md` (Stricli, Bun, Winston, picocolors, treeify, drizzle-orm) before adding new dependencies.
- Keep data artifacts consistent: JSONL per resource, YAML progress files, Drizzle-managed tokens, and document new flows under `docs/`.
