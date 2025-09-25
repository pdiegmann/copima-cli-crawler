# Reporting Submodule

This module provides progress reporting types and implementations for the application.

## Exports

- Progress reporting types: `ProgressState`, `ResourceCount`, `PerformanceMetrics`, `ProgressStats`
- Reporter implementations: `progressReporter`, `yamlProgressReporter`

## Usage

Import reporters or types from this submodule:

```typescript
import { progressReporter, yamlProgressReporter } from "./reporting/progressReporter";
import type { ProgressStats } from "./reporting";
```

## Responsibilities

- Track and report progress of long-running operations
- Support for multiple reporting formats (console, YAML, etc.)
- Provide metrics and resource counts
