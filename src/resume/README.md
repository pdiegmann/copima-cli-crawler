# Resume Submodule

This module provides resume management functionality for interrupted or paused operations.

## Exports

- Resume manager implementation: `resumeManager`

## Usage

Import the resume manager from this submodule:

```typescript
import { resumeManager } from "./resume/resumeManager";
```

## Responsibilities

- Track and persist operation state for resuming
- Handle recovery from interruptions or failures
- Integrate with storage and reporting subsystems
