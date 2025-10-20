# Custom Callbacks Guide

Complete guide to creating and using custom callbacks for data processing during crawls.

## Overview

Callbacks allow you to:

- **Filter** data (exclude certain resources)
- **Transform** data (modify fields, add metadata)
- **Validate** data (check for required fields)
- **Enrich** data (add computed fields)

Callbacks run **before data is written to JSONL files**, allowing you to customize what gets stored.

## When to Use Callbacks

### Common Use Cases

1. **Data Filtering**
   - Exclude archived projects
   - Skip inactive users
   - Filter by date range

2. **Data Transformation**
   - Redact sensitive information
   - Normalize field values
   - Convert formats

3. **Data Enrichment**
   - Add timestamps
   - Calculate derived fields
   - Add custom metadata

4. **Data Validation**
   - Check required fields
   - Validate data integrity
   - Log anomalies

## Callback Function Signature

```typescript
type CallbackFunction = (
  context: CallbackContext,
  object: any
) => any | false | Promise<any | false>
```

### Parameters

**context** - Provides contextual information:

```typescript
interface CallbackContext {
  host: string;              // GitLab instance URL
  accountId?: string;        // Account identifier
  resourceType: string;      // Type: user, project, issue, etc.
  areaPath?: string;         // Group/project path (if applicable)
  step: string;              // Current crawl step
}
```

**object** - The resource being processed (user, project, issue, etc.)

### Return Values

- **Modified object** - Include with changes
- **Original object** - Include without changes
- **`false`** - Exclude from output

## Creating a Callback

### Method 1: Inline Callback

For simple callbacks, define directly in code:

```typescript
import { CallbackManager } from './callback';

const manager = new CallbackManager({
  enabled: true,
  inlineCallback: (context, object) => {
    // Filter out archived projects
    if (context.resourceType === 'project' && object.archived) {
      return false;
    }
    
    // Add timestamp to all objects
    return {
      ...object,
      _processedAt: new Date().toISOString()
    };
  }
});
```

### Method 2: External Module

For complex callbacks, create a separate file:

**callbacks/my-callback.js:**

```javascript
/**
 * Custom callback for COPIMA crawler
 * 
 * @param {object} context - Contextual information
 * @param {any} object - Resource being processed
 * @returns {any|false} Modified object or false to exclude
 */
export default function callback(context, object) {
  // Your logic here
  return object;
}
```

**Configuration:**

```yaml
# copima.yaml
callback:
  enabled: true
  modulePath: "./callbacks/my-callback.js"
```

## Example Callbacks

### Example 1: Filter Archived Projects

```javascript
// callbacks/filter-archived.js
export default function callback(context, object) {
  if (context.resourceType === 'project') {
    // Exclude archived projects
    if (object.archived === true) {
      console.log(`Filtering archived project: ${object.name}`);
      return false;
    }
  }
  
  // Include everything else
  return object;
}
```

### Example 2: Redact Sensitive Data

```javascript
// callbacks/redact-sensitive.js
export default function callback(context, object) {
  if (context.resourceType === 'user') {
    // Redact email addresses
    return {
      ...object,
      email: '[REDACTED]',
      publicEmail: '[REDACTED]',
      // Keep other fields
    };
  }
  
  return object;
}
```

### Example 3: Add Custom Metadata

```javascript
// callbacks/add-metadata.js
export default function callback(context, object) {
  // Add metadata to all objects
  return {
    ...object,
    _metadata: {
      crawledAt: new Date().toISOString(),
      source: context.host,
      accountId: context.accountId,
      resourceType: context.resourceType
    }
  };
}
```

### Example 4: Filter by Date Range

```javascript
// callbacks/filter-by-date.js
const START_DATE = new Date('2024-01-01');
const END_DATE = new Date('2024-12-31');

export default function callback(context, object) {
  if (context.resourceType === 'issue' || context.resourceType === 'merge_request') {
    const createdAt = new Date(object.createdAt);
    
    // Only include items within date range
    if (createdAt < START_DATE || createdAt > END_DATE) {
      return false;
    }
  }
  
  return object;
}
```

### Example 5: Normalize Data

```javascript
// callbacks/normalize-data.js
export default function callback(context, object) {
  if (context.resourceType === 'user') {
    // Normalize username to lowercase
    object.username = object.username.toLowerCase();
    
    // Ensure state field exists
    if (!object.state) {
      object.state = 'active';
    }
  }
  
  if (context.resourceType === 'project') {
    // Normalize visibility values
    const visibilityMap = {
      'public': 'PUBLIC',
      'internal': 'INTERNAL',
      'private': 'PRIVATE'
    };
    object.visibility = visibilityMap[object.visibility] || object.visibility;
  }
  
  return object;
}
```

### Example 6: Validate and Log Issues

```javascript
// callbacks/validate-data.js
export default function callback(context, object) {
  // Check for required fields
  if (context.resourceType === 'project') {
    if (!object.id || !object.name || !object.fullPath) {
      console.error('Invalid project object:', {
        id: object.id,
        name: object.name,
        fullPath: object.fullPath
      });
      // Still include it, but logged
    }
  }
  
  return object;
}
```

### Example 7: Selective Resource Processing

```javascript
// callbacks/selective-processing.js
export default function callback(context, object) {
  // Only process specific groups
  const allowedGroups = ['org', 'team', 'project'];
  
  if (context.areaPath) {
    const topLevelGroup = context.areaPath.split('/')[0];
    if (!allowedGroups.includes(topLevelGroup)) {
      return false; // Skip resources from other groups
    }
  }
  
  return object;
}
```

### Example 8: Complex Multi-Condition Filter

```javascript
// callbacks/complex-filter.js
export default function callback(context, object) {
  // Filter users
  if (context.resourceType === 'user') {
    // Exclude bots
    if (object.bot === true) return false;
    
    // Exclude blocked users
    if (object.state === 'blocked') return false;
    
    // Exclude users without email
    if (!object.email && !object.publicEmail) return false;
  }
  
  // Filter projects
  if (context.resourceType === 'project') {
    // Exclude empty repositories
    if (object.emptyRepo === true) return false;
    
    // Exclude archived
    if (object.archived === true) return false;
    
    // Only include projects with recent activity
    const lastActivity = new Date(object.lastActivityAt);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    if (lastActivity < sixMonthsAgo) return false;
  }
  
  return object;
}
```

## Configuration

### Enable Callbacks

```yaml
# copima.yaml
callback:
  enabled: true
  modulePath: "./callbacks/my-callback.js"
```

### Disable Callbacks

```yaml
callback:
  enabled: false
```

Or via CLI:

```bash
# Disable callbacks for this run
copima-cli-crawler crawl --no-callbacks
```

## Advanced Usage

### Async Callbacks

Callbacks can be async:

```javascript
// callbacks/async-callback.js
import fetch from 'node-fetch';

export default async function callback(context, object) {
  if (context.resourceType === 'user') {
    // Fetch additional data from external API
    try {
      const response = await fetch(`https://api.example.com/users/${object.username}`);
      const externalData = await response.json();
      
      // Enrich object with external data
      return {
        ...object,
        externalInfo: externalData
      };
    } catch (error) {
      console.error('Failed to fetch external data:', error);
      return object;
    }
  }
  
  return object;
}
```

### State Management

Maintain state across callback calls:

```javascript
// callbacks/stateful-callback.js
let processedCount = 0;
const seenIds = new Set();

export default function callback(context, object) {
  processedCount++;
  
  // Check for duplicates
  if (seenIds.has(object.id)) {
    console.warn(`Duplicate detected: ${object.id}`);
    return false;
  }
  
  seenIds.add(object.id);
  
  // Log every 1000 items
  if (processedCount % 1000 === 0) {
    console.log(`Processed ${processedCount} items`);
  }
  
  return object;
}
```

### Error Handling

```javascript
// callbacks/error-handling.js
export default function callback(context, object) {
  try {
    // Your processing logic
    if (context.resourceType === 'project') {
      // Complex transformation that might fail
      object.computed = complexCalculation(object);
    }
    
    return object;
  } catch (error) {
    console.error('Callback error:', {
      resourceType: context.resourceType,
      objectId: object.id,
      error: error.message
    });
    
    // Return original object on error (don't lose data)
    return object;
  }
}
```

## Testing Callbacks

### Test Callback Function

```javascript
// callbacks/my-callback.test.js
import callback from './my-callback.js';

describe('My Callback', () => {
  it('should filter archived projects', () => {
    const context = {
      host: 'https://gitlab.com',
      resourceType: 'project',
      step: 'areas'
    };
    
    const archivedProject = {
      id: '123',
      name: 'Old Project',
      archived: true
    };
    
    const result = callback(context, archivedProject);
    expect(result).toBe(false);
  });
  
  it('should include active projects', () => {
    const context = {
      host: 'https://gitlab.com',
      resourceType: 'project',
      step: 'areas'
    };
    
    const activeProject = {
      id: '456',
      name: 'Active Project',
      archived: false
    };
    
    const result = callback(context, activeProject);
    expect(result).toEqual(activeProject);
  });
});
```

### Test with Crawler

```bash
# Create test callback
cat > test-callback.js << 'EOF'
export default function callback(context, object) {
  console.log(`Processing ${context.resourceType}: ${object.id || object.name}`);
  return object;
}
EOF

# Run with test callback
copima-cli-crawler crawl --steps areas --callback-module ./test-callback.js
```

## Performance Considerations

### Keep Callbacks Fast

```javascript
// ❌ Slow - Complex operations
export default function callback(context, object) {
  // Avoid heavy processing
  const result = expensiveOperation(object); // Takes 100ms
  return result;
}

// ✅ Fast - Simple operations
export default function callback(context, object) {
  // Quick checks and transforms
  if (object.archived) return false;
  object.processed = true;
  return object;
}
```

### Batch External Calls

```javascript
// ✅ Better - Batch external calls
let batchBuffer = [];
let batchTimer = null;

export default async function callback(context, object) {
  batchBuffer.push(object);
  
  if (!batchTimer) {
    batchTimer = setTimeout(async () => {
      await processBatch(batchBuffer);
      batchBuffer = [];
      batchTimer = null;
    }, 1000);
  }
  
  return object;
}
```

## Troubleshooting

### Callback Not Running

Check:
- `callback.enabled` is `true`
- `modulePath` is correct
- Module exports function properly
- No syntax errors in callback

### Callback Errors

Enable debug logging:

```yaml
logging:
  level: "debug"
```

Look for:
```
[ERROR] Callback execution failed for user: <error message>
```

### Performance Issues

- Profile callback execution time
- Minimize external API calls
- Avoid complex operations
- Consider async batching

## See Also

- [Callback Manager API](../api-reference/Callback-Manager.md)
- [Configuration](../core-concepts/Configuration.md)
- [Storage System](../core-concepts/Storage.md)

---

**Last Updated**: 2025-10-20
