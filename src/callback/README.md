# Callback Submodule

This module provides callback management types and implementations for the application.

## Exports

- Callback types: `CallbackFunction`, `CallbackConfig`
- Callback manager implementation: `callbackManager`

## Usage

Import the callback manager or types from this submodule:

```typescript
import { callbackManager } from "./callback/callbackManager";
import type { CallbackFunction, CallbackConfig } from "./callback";
```

## Responsibilities

- Manage and execute callbacks for extensibility
- Support for callback configuration and filtering
- Enable plugin-like behaviors in core workflows
