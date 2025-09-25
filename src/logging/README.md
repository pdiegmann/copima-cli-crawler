# Logging Submodule

This module provides logging functionality and types for the application.

## Exports

- Logger types: `Logger`, `LoggerFunction`, `LoggerConfig`, `LogLevel`
- Logger implementation: `logger`, `createLogger`

## Usage

Import the logger or types from this submodule:

```typescript
import { logger, createLogger } from "./logging/logger";
import type { Logger, LoggerConfig } from "./logging";
```

## Responsibilities

- Centralized logging for all subsystems
- Configurable log levels and formats
- Console and file transports
