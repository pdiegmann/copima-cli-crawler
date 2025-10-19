# Architecture Overview

This document provides a high-level overview of the COPIMA CLI Crawler architecture.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLI Entry Point                             │
│                    (Stricli Framework)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ├─────────────────────────────────────────┐
                         │                                         │
         ┌───────────────▼──────────┐           ┌──────────────────▼────────┐
         │  Command Router           │           │  Context Builder           │
         │  (app.ts)                │           │  (context.ts)              │
         │  - crawl, areas, users   │           │  - Logger                  │
         │  - config, account, auth │           │  - GraphQL Client          │
         │  - test                  │           │  - REST Client             │
         └──────────────┬────────────┘           └────────────────┬───────────┘
                        │                                         │
                        └──────────────┬──────────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
┌────────▼─────────┐       ┌──────────▼─────────┐      ┌──────────▼────────┐
│ Configuration    │       │ Authentication      │      │ API Clients       │
│ System           │       │ System              │      │                   │
│ - Loader         │       │ - OAuth2 Manager    │      │ - GraphQL Client  │
│ - Validator      │       │ - Token Manager     │      │ - REST Client     │
│ - Merger         │       │ - YAML Storage      │      │ - Pagination      │
└──────────────────┘       └─────────────────────┘      └───────────────────┘
                                       │
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
┌────────▼─────────┐       ┌──────────▼─────────┐      ┌──────────▼────────┐
│ Crawling Engine  │       │ Data Processing     │      │ Storage System    │
│ - 4 Steps        │◄──────┤ - Callbacks         │─────►│ - Hierarchical    │
│ - GraphQL Query  │       │ - Deduplication     │      │ - JSONL Writer    │
│ - REST Fetching  │       │ - Filtering         │      │ - File Locker     │
└──────┬───────────┘       └─────────────────────┘      └───────────────────┘
       │
       │
┌──────▼───────────┐       ┌─────────────────────┐      ┌───────────────────┐
│ Progress System  │       │ Resume System       │      │ Reporting System  │
│ - Reporter       │       │ - Checkpoint        │      │ - YAML Reporter   │
│ - YAML File      │       │ - State Manager     │      │ - Console Logger  │
│ - Real-time      │       │ - Recovery          │      │ - Statistics      │
└──────────────────┘       └─────────────────────┘      └───────────────────┘
```

## Core Components

### 1. CLI Layer (Stricli Framework)

**Location**: `src/bin/cli.ts`, `src/app.ts`

The CLI layer provides the command-line interface using Bloomberg's Stricli framework:

- **Command routing** - Maps commands to implementations
- **Argument parsing** - Validates and processes CLI arguments
- **Help generation** - Auto-generates help text
- **Auto-completion** - Bash completion support

**Key Files**:
- `src/app.ts` - Application and route definitions
- `src/bin/cli.ts` - CLI entry point
- `src/context.ts` - Dependency injection container

### 2. Configuration System

**Location**: `src/config/`

The configuration system implements a 5-level hierarchy:

1. **CLI arguments** (highest priority)
2. **Environment variables**
3. **User config** (`~/.config/copima/config.yaml`)
4. **Local config** (`./copima.yaml`)
5. **Built-in defaults** (lowest priority)

**Components**:
- **ConfigLoader** - Orchestrates loading from all sources
- **Validators** - Ensure configuration correctness
- **Mergers** - Combine multiple config sources
- **Loaders** - Source-specific loaders (file, env, etc.)

**Key Features**:
- Template interpolation (e.g., `${env.HOME}`)
- Schema validation
- Type safety with TypeScript
- Interactive setup wizard

### 3. Authentication System

**Location**: `src/auth/`

Supports three authentication methods:

1. **Personal Access Tokens (PAT)** - Simple token-based
2. **OAuth2 with explicit tokens** - Stored tokens with refresh
3. **OAuth2 from storage** - Automatic token management

**Components**:
- **OAuth2Manager** - OAuth2 flow orchestration
- **TokenManager** - Token lifecycle management
- **RefreshTokenManager** - Automatic token refresh
- **YamlStorage** - Credential persistence in `database.yaml`

**Key Features**:
- Automatic token refresh
- Secure token storage
- Browser-based OAuth2 flow
- Account management

### 4. API Clients

**Location**: `src/api/`

Dual API approach for comprehensive GitLab data access:

#### GraphQL Client
- **Primary API** for most resources
- Efficient data fetching
- Strong typing with code generation
- Automatic pagination
- Query batching

#### REST Client
- **Secondary API** for REST-only resources
- Commits, branches, tags
- File contents and blobs
- Legacy endpoints
- Streaming responses

**Key Features**:
- Unified error handling
- Rate limiting
- Retry logic
- Request/response logging

### 5. Crawling Engine

**Location**: `src/commands/crawl/`

Implements the four-step crawling process:

#### Step 1: Areas (GraphQL)
- Groups - organizational structure
- Projects - code repositories

#### Step 2: Users (GraphQL)
- User profiles
- User metadata

#### Step 3: Resources (GraphQL)
- Common: members, labels, milestones, issues, MRs
- Group-specific: epics, boards, audit events
- Project-specific: releases, snippets, pipelines

#### Step 4: Repository (REST)
- Branches and commits
- Tags and releases
- Repository tree
- File contents

**Key Features**:
- Incremental processing
- Parallel fetching
- Error recovery
- Progress tracking

### 6. Storage System

**Location**: `src/storage/`

Hierarchical JSONL-based storage system:

**Components**:
- **HierarchicalStorageManager** - Mirrors GitLab structure
- **StorageManager** - Low-level file operations
- **DeduplicationRegistry** - Prevents duplicate writes
- **FileLocker** - Thread-safe file access

**Storage Structure**:
```
output/
├── users.jsonl                    # Global resources
├── group1/                        # Top-level group
│   ├── groups.jsonl              # Group metadata
│   ├── members.jsonl             # Group members
│   └── project1/                 # Nested project
│       ├── projects.jsonl        # Project metadata
│       ├── issues.jsonl          # Issues
│       └── commits.jsonl         # Commits
```

**Key Features**:
- JSONL format (one JSON object per line)
- Hierarchical organization
- Automatic deduplication
- Atomic file operations

### 7. Data Processing Pipeline

**Location**: `src/callback/`

Hook-based system for custom data processing:

**Callback Types**:
- **Pre-write** - Filter or modify data before storage
- **Post-write** - React to stored data
- **Error** - Handle errors gracefully

**Use Cases**:
- Data filtering and validation
- Custom transformations
- External system integration
- Real-time analytics

### 8. Progress & Resume System

**Location**: `src/reporting/`, `src/resume/`

Supports long-running crawls with interruption handling:

**Progress System**:
- Real-time YAML progress file
- Updated every second
- Current step/phase/resource
- Statistics and estimates

**Resume System**:
- Checkpoint-based recovery
- State persistence
- Automatic resume
- Skip processed resources

**Key Features**:
- No data loss on interruption
- Transparent resume
- Progress monitoring
- Performance metrics

## Data Flow

### Request Flow

```
1. CLI Command
   │
   ├─► 2. Load Configuration (5-level merge)
   │
   ├─► 3. Authenticate (PAT or OAuth2)
   │
   ├─► 4. Initialize Clients (GraphQL + REST)
   │
   ├─► 5. Execute Crawl Steps
   │    │
   │    ├─► 5a. Fetch Data (API)
   │    │
   │    ├─► 5b. Process Data (Callbacks)
   │    │
   │    ├─► 5c. Deduplicate (Registry)
   │    │
   │    └─► 5d. Store Data (JSONL)
   │
   ├─► 6. Update Progress (YAML)
   │
   └─► 7. Report Completion
```

### Error Handling Flow

```
Error Occurs
   │
   ├─► Retry (if retriable)
   │    └─► Success → Continue
   │    └─► Fail → Next step
   │
   ├─► Log Error (Winston)
   │
   ├─► Call Error Callbacks
   │
   ├─► Save Progress State
   │
   └─► Continue or Abort
```

## Technology Stack

### Core Technologies

- **Runtime**: Bun 1.2.8+ (preferred) or Node.js 20+
- **Language**: TypeScript 5.9+
- **CLI Framework**: Stricli 1.2.0
- **Testing**: Jest 30+ (unit tests), Bun Test (integration)

### Key Libraries

- **winston** - Structured logging
- **js-yaml** - YAML parsing/generation
- **picocolors** - Terminal colors
- **treeify** - Tree visualization
- **date-fns** - Date manipulation
- **get-port** - Dynamic port allocation
- **open** - Browser launching (OAuth2)

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking
- **tsup** - Build bundler
- **GraphQL Code Generator** - Type generation

## Design Principles

### 1. Modularity

Each component has a single, well-defined responsibility:
- Easy to test
- Easy to maintain
- Easy to extend

### 2. Type Safety

TypeScript throughout for:
- Compile-time error detection
- IDE autocomplete
- Self-documenting code

### 3. Configuration Over Code

Behavior controlled via configuration:
- No code changes for common use cases
- Multiple config sources
- Validation and defaults

### 4. Resilience

Designed for failure scenarios:
- Automatic retry
- Resume capability
- Error recovery
- Progress persistence

### 5. Performance

Optimized for large-scale crawling:
- Parallel fetching
- Streaming writes
- Deduplication
- Rate limiting

### 6. Observability

Comprehensive monitoring:
- Structured logging
- Progress reporting
- Performance metrics
- Debug support

## Extensibility Points

The architecture supports extension through:

1. **Custom Callbacks** - Hook into data processing
2. **Configuration Templates** - Reusable configs
3. **Custom Validators** - Additional validation rules
4. **Storage Adapters** - Alternative storage backends (future)
5. **Authentication Providers** - Additional auth methods (future)

## Security Considerations

- **Token Storage**: Encrypted at rest in `database.yaml`
- **SSL/TLS**: Full support including self-signed certs
- **Secrets**: Never logged or exposed
- **Permissions**: Respects GitLab access controls
- **Validation**: All inputs validated

## Performance Characteristics

### Memory Usage

- **Baseline**: ~50-100 MB
- **During Crawl**: ~200-500 MB
- **Large Instances**: Up to 1-2 GB

### Disk I/O

- **JSONL Writing**: Append-only, low overhead
- **Progress Updates**: Every 1 second
- **Registry Updates**: After each batch

### Network Usage

- **GraphQL**: Efficient batch queries
- **REST**: Sequential for file contents
- **Rate Limiting**: Configurable (default 10 req/s)

## Scalability

The architecture scales to:

- **1000+ groups**
- **10,000+ projects**
- **100,000+ issues**
- **1,000,000+ commits**

Limitations:
- Single-threaded execution (by design)
- Memory-bound for very large responses
- Network-bound for distant instances

## Future Enhancements

Planned architectural improvements:

1. **Distributed Crawling** - Multi-node support
2. **Database Backend** - Alternative to JSONL
3. **Incremental Updates** - Delta crawling
4. **GraphQL Subscriptions** - Real-time updates
5. **Plugin System** - Third-party extensions

---

**Architecture Version**: 1.0.0  
**Last Updated**: 2025-10-19
