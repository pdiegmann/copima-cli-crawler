# CallbackManager API Reference

API reference for the callback system that allows custom data processing during crawls.

## Overview

`CallbackManager` enables custom filtering and transformation of crawled data before storage.

**Location**: `src/callback/callbackManager.ts`

## Class: CallbackManager

### Constructor

```typescript
new CallbackManager(config: CallbackConfig)
```

**Parameters:**

- `config.enabled` (boolean): Enable callback system
- `config.modulePath` (string, optional): Path to callback module
- `config.inlineCallback` (function, optional): Inline callback function

**Example:**

```typescript
import { CallbackManager } from './callback';

const manager = new CallbackManager({
  enabled: true,
  modulePath: './my-callback.js'
});
```

### Methods

#### processObject(context, object)

Process a single object through the callback.

**Signature:**
```typescript
async processObject(
  context: CallbackContext,
  object: any
): Promise<any | null>
```

**Parameters:**
- `context`: Contextual information (host, accountId, resourceType, etc.)
- `object`: The object to process

**Returns:** 
- Processed object (can be modified)
- `null` if object should be filtered out

**Example:**
```typescript
const result = await manager.processObject(
  {
    host: 'https://gitlab.com',
    accountId: 'my-account',
    resourceType: 'user'
  },
  userObject
);
```

#### processObjects(context, objects)

Process an array of objects.

**Signature:**
```typescript
async processObjects(
  context: CallbackContext,
  objects: any[]
): Promise<any[]>
```

**Returns:** Array with filtered/modified objects

## Callback Function Signature

Your callback function should follow this signature:

```typescript
type CallbackFunction = (
  context: CallbackContext,
  object: any
) => any | false | Promise<any | false>
```

**Return values:**
- Modified object: Include in output
- Original object: Include unchanged
- `false`: Filter out (exclude from output)

## Callback Context

```typescript
interface CallbackContext {
  host: string;              // GitLab instance URL
  accountId?: string;        // Account identifier
  resourceType: string;      // Type of resource (user, project, issue, etc.)
  areaPath?: string;         // Group/project path
  step: string;              // Current crawl step
}
```

## Example Callback Module

**my-callback.js:**

```javascript
export default function callback(context, object) {
  // Filter out archived projects
  if (context.resourceType === 'project' && object.archived) {
    return false; // Exclude
  }
  
  // Redact sensitive fields from users
  if (context.resourceType === 'user') {
    return {
      ...object,
      email: '[REDACTED]',
      publicEmail: '[REDACTED]'
    };
  }
  
  // Add custom metadata
  return {
    ...object,
    _crawledAt: new Date().toISOString(),
    _instance: context.host
  };
}
```

## Usage in Configuration

```yaml
callback:
  enabled: true
  modulePath: "./callbacks/my-callback.js"
```

Or inline:

```typescript
import { CallbackManager } from './callback';

const manager = new CallbackManager({
  enabled: true,
  inlineCallback: (context, object) => {
    // Your processing logic
    return object;
  }
});
```

## See Also

- [Custom Callbacks Guide](../guides/Custom-Callbacks.md)
- [Configuration](../core-concepts/Configuration.md)

---

**Last Updated**: 2025-10-20
