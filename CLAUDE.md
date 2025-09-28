# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A GitLab crawler CLI application built with TypeScript, Bun, and Stricli that extracts resources from GitLab instances via GraphQL and REST APIs. The crawler implements a 4-step workflow:

1. **Areas** - Groups and projects discovery
2. **Users** - User enumeration
3. **Resources** - Common resources (issues, MRs, labels, etc.)
4. **Repository** - REST-only resources (commits, branches, file blobs)

## Development Commands

### Essential Commands
```bash
# Development - run with dev TLS bypass
bun run dev

# Development with auth configuration
bun run dev:auth

# Testing
bun test                    # Bun test runner
bun run test               # Jest test suite
bun run test:watch         # Jest watch mode
bun run test:coverage      # Test coverage report
bun run test:e2e           # End-to-end test runner

# Build & Release
bun run build             # Build distribution
bun run build:executables # Build platform-specific executables
bun run build:test       # Test built executables

# Linting & Formatting
bun run lint             # ESLint check
bun run lint:fix         # Auto-fix linting and formatting

# Database
bun run db:generate      # Generate Drizzle migrations
bun run db:migrate       # Run migrations
bun run db:studio        # Open Drizzle Studio
```

### E2E Testing Commands
```bash
# Basic E2E test
bun run test:e2e:basic

# Test suite execution
bun run test:e2e:suite

# Template test
bun run test:e2e:template

# Dry run test
bun run test:e2e:dry-run
```

## Core Architecture

### CLI Framework (Stricli)
- **Entry Point**: `src/bin/cli.ts` - Main CLI with authentication logic
- **App Definition**: `src/app.ts` - Route configuration and command mapping
- **Context**: `src/context.ts` - Command context building with API clients

### Configuration System
- **5-Level Priority**: CLI args → env vars → user config → local config → defaults
- **Types**: `src/config/types.ts` - Comprehensive configuration schema
- **Loading**: Hierarchical config loader with validation and merging

### Authentication & OAuth2
- **OAuth2 Server**: `src/auth/oauth2Server.ts` - Callback server for browser flow
- **Token Management**: `src/auth/tokenManager.ts` - Database-backed token storage
- **Providers**: `src/auth/oauth2Providers.ts` - GitLab OAuth2 configuration

### Database Layer (Drizzle ORM)
- **Schema**: `src/db/schema.ts` - User and account tables for OAuth credentials
- **Connection**: `src/db/connection.ts` - Bun SQLite integration
- **Migration**: `src/db/migrate.ts` - Database initialization and migrations

### Crawling Implementation
- **Commands**: `src/commands/crawl/commands.ts` - Individual step commands
- **Implementation**: `src/commands/crawl/impl.ts` - Main crawling orchestration
- **Resource Modules**:
  - `commonResources.ts` - Shared GraphQL resources
  - `fetchUsers.ts` - User enumeration
  - `restResources.ts` - REST-only resources

### Core Systems
- **Storage**: `src/storage/` - JSONL hierarchical file storage
- **Progress**: `src/reporting/` - YAML progress reporting with file locking
- **Resume**: `src/resume/` - State persistence for resumable operations
- **Callbacks**: `src/callback/` - Data processing hooks
- **Logging**: `src/logging/` - Winston-based structured logging

### API Clients
- **GraphQL**: `src/api/gitlabGraphQLClient.ts` - GraphQL client with rate limiting
- **REST**: `src/api/gitlabRestClient.ts` - REST client for non-GraphQL resources

## Required Libraries & Conventions

### Must-Use Libraries
- **Stricli** - CLI framework for all user-facing commands
- **Bun** - Runtime and package manager
- **Winston** - Logging via `src/utils/logger.ts`
- **Picocolors** - Terminal color formatting
- **Treeify** - Object tree formatting for terminal output
- **Drizzle ORM** - Database access with Bun SQLite driver

### Non-Negotiable Rules
1. **OAuth2 Only** - Access tokens only, no other auth methods
2. **Token Refresh Strategy** - Always update refresh tokens from response
3. **API Usage** - GraphQL preferred, REST for GraphQL-unavailable resources
4. **No Code Duplication** - Update existing files, don't create variants
5. **Library First** - Use existing libraries before custom implementations
6. **Testing Required** - All fixes must be tested and validated
7. **Iterative Improvement** - Continue until validation succeeds

### Database Schema
User and account tables with OAuth2 token storage:
- `user` table with ban management and role system
- `account` table linking users to OAuth providers with token storage

## Configuration Examples

### Basic Auth Setup
```bash
# Authenticate with GitLab instance
bun run dev:auth --config examples/unified-config.yaml
```

### Test Configuration
Use `examples/unified-config.yaml` for both authentication and testing. The file includes:
- GitLab instance configuration
- OAuth2 provider setup
- Database and output settings
- E2E test validation rules

## Development Workflow

1. **Authentication First** - Run `bun run dev:auth` to store OAuth tokens
2. **Configuration** - Use or modify `examples/unified-config.yaml`
3. **Testing** - Run `bun run test:e2e:basic` for end-to-end validation
4. **Development** - Use `bun run dev` with TLS bypass for development
5. **Validation** - Run linting and tests before committing

## API Integration Patterns

### GraphQL Usage (Steps 1-3)
- Groups, projects, users via GraphQL API
- Common resources (issues, MRs, labels) via GraphQL
- Group-specific (epics, boards) and project-specific (releases, snippets) resources

### REST Usage (Step 4)
- Repository data (commits, branches, file contents)
- Artifacts, job logs, security compliance data
- Any resources not available via GraphQL

### Error Handling
- Graceful degradation when GraphQL unavailable
- Automatic fallback to REST endpoints
- Retry logic with exponential backoff
- Comprehensive error logging and context preservation