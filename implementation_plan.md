# Implementation Plan

## [Overview]

Add a new CLI command that creates a temporary local HTTP server to handle OAuth2 authentication flow and opens a browser for user authorization.

This implementation will add a new `auth` command to the existing CLI application that temporarily starts a local HTTP server on an available port, constructs the appropriate OAuth2 authorization URL, opens the user's default browser to that URL, handles the callback with the authorization code, exchanges it for access tokens, and stores the credentials for use by the application. The command will integrate with the existing authentication infrastructure (OAuth2Manager, TokenManager, CallbackManager) and follow the established command patterns using the @stricli/core framework. The implementation will support configurable OAuth2 providers with GitLab as the primary focus, and will store credentials in the existing SQLite database alongside other account data.

## [Types]

Define OAuth2 flow configuration and response types for the authentication process.

**New Type Definitions in `src/auth/types.ts`:**

```typescript
export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

export interface OAuth2CallbackParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

export interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface AuthServerConfig {
  port: number;
  timeout: number;
  callbackPath: string;
}

export interface OAuth2Provider {
  name: string;
  authorizationUrl: string;
  tokenUrl: string;
  defaultScopes: string[];
}
```

**Updated Type Definitions in `src/types/commands.ts`:**

```typescript
export interface AuthCommandOptions {
  provider?: string; // OAuth2 provider (gitlab, github, etc.)
  scopes?: string[]; // OAuth2 scopes to request
  port?: number; // Preferred port for callback server
  clientId?: string; // OAuth2 client ID
  clientSecret?: string; // OAuth2 client secret
  redirectUri?: string; // Custom redirect URI
  timeout?: number; // Timeout in seconds for auth flow
  accountId?: string; // Account identifier for storage
  name?: string; // Display name for account
}

export type AuthFlowHandler = (flags: AuthCommandOptions) => Promise<void>;
```

## [Files]

Create new files for OAuth2 flow handling and modify existing command structure.

**New Files:**

- `src/commands/auth/command.ts` - Auth command definition using @stricli/core patterns
- `src/commands/auth/impl.ts` - OAuth2 flow implementation with local server and browser integration
- `src/auth/oauth2Server.ts` - Local HTTP server class for handling OAuth2 callbacks
- `src/auth/oauth2Providers.ts` - Provider-specific OAuth2 configurations (GitLab, GitHub, etc.)
- `src/auth/types.ts` - OAuth2-specific type definitions
- `src/commands/auth/impl.test.ts` - Comprehensive test coverage for auth command

**Modified Files:**

- `src/app.ts` - Register the new auth command in the route map
- `src/types/commands.ts` - Add AuthCommandOptions and AuthFlowHandler interfaces
- `package.json` - Add dependencies for HTTP server (`get-port`) and browser opening (`open`)
- `src/bin/cli.ts` - Add "auth" to localCommands array since it handles its own authentication

**Integration Points:**

- Uses existing `OAuth2Manager` for token management and refresh scheduling
- Integrates with existing `TokenManager` and database schema for credential storage
- Follows existing command patterns from account commands
- Uses existing logging infrastructure with `createLogger`

## [Functions]

Implement OAuth2 authentication flow with local server and browser integration.

**New Functions in `src/commands/auth/command.ts`:**

- `authCommand` - @stricli/core command definition with parameter validation

**New Functions in `src/commands/auth/impl.ts`:**

- `executeAuthFlow(options: AuthCommandOptions)` - Main authentication flow orchestration
- `generateAuthUrl(config: OAuth2Config, state: string)` - Generate OAuth2 authorization URL with state parameter
- `exchangeCodeForTokens(code: string, config: OAuth2Config)` - Exchange authorization code for access/refresh tokens
- `openBrowser(url: string)` - Open default browser to authorization URL using `open` library
- `generateState()` - Generate secure random state parameter for CSRF protection
- `waitForCallback(server: OAuth2Server, timeout: number)` - Promise-based callback waiting

**New Functions in `src/auth/oauth2Server.ts`:**

- `OAuth2Server.start()` - Start HTTP server on available port
- `OAuth2Server.stop()` - Gracefully stop HTTP server
- `OAuth2Server.handleCallback(req, res)` - Process OAuth2 callback and extract parameters
- `OAuth2Server.waitForCallback()` - Promise that resolves when callback is received
- `OAuth2Server.findAvailablePort(preferredPort?: number)` - Find available port using `get-port`

**New Functions in `src/auth/oauth2Providers.ts`:**

- `getProviderConfig(provider: string)` - Get provider-specific OAuth2 configuration
- `getSupportedProviders()` - List all supported OAuth2 providers
- `validateProviderConfig(config: OAuth2Config)` - Validate provider configuration completeness

**Integration Functions:**

- Modified app registration in `src/app.ts` to include auth command
- Uses existing database schema and TokenManager for credential persistence

## [Classes]

Create OAuth2Server class for managing temporary HTTP server lifecycle.

**New Classes:**

**`OAuth2Server` in `src/auth/oauth2Server.ts`:**

- **Properties:**
  - `server: http.Server | null` - Node.js HTTP server instance
  - `port: number` - Server port number
  - `timeout: number` - Authentication timeout in milliseconds
  - `callbackPath: string` - OAuth2 callback endpoint path
  - `callbackPromise: Promise<OAuth2CallbackParams> | null` - Promise for callback resolution
  - `callbackResolve: ((params: OAuth2CallbackParams) => void) | null` - Promise resolver
- **Methods:**
  - `constructor(config: AuthServerConfig)` - Initialize server configuration
  - `start(): Promise<void>` - Start server and bind to available port
  - `stop(): Promise<void>` - Gracefully stop server and cleanup resources
  - `handleCallback(req: IncomingMessage, res: ServerResponse): void` - Process OAuth2 callback
  - `waitForCallback(): Promise<OAuth2CallbackParams>` - Wait for OAuth2 callback with timeout
  - `findAvailablePort(preferredPort?: number): Promise<number>` - Find available port
  - `sendCallbackResponse(res: ServerResponse, success: boolean, message: string)` - Send HTML response

**Integration with Existing Classes:**

- Integrates with existing `OAuth2Manager` for token refresh scheduling
- Uses existing `TokenManager` for database storage
- Follows existing error handling patterns with Winston logging

## [Dependencies]

Add HTTP server and browser launching capabilities to package.json.

**New Dependencies:**

```json
{
  "dependencies": {
    "open": "^9.1.0", // Cross-platform browser opening
    "get-port": "^6.1.2" // Find available ports
  }
}
```

**Existing Dependencies Used:**

- `@stricli/core` - Command definition and parameter parsing
- `winston` - Logging infrastructure via existing createLogger
- `better-sqlite3` - Database storage via existing TokenManager
- `picocolors` - Terminal colors for user feedback
- Node.js built-in `http` module - HTTP server for OAuth2 callbacks
- Node.js built-in `url` and `querystring` modules - URL parsing and parameter extraction

**Integration Requirements:**

- Compatible with existing Bun runtime and package manager
- Follows existing TypeScript configuration in src/tsconfig.json
- Integrates with existing database schema and migrations
- Uses existing configuration hierarchy and validation systems

## [Testing]

Create comprehensive tests for OAuth2 flow components with proper mocking.

**New Test Files:**

- `src/commands/auth/impl.test.ts` - Test OAuth2 flow implementation
  - Mock HTTP server lifecycle
  - Test authorization URL generation with proper parameters
  - Test token exchange process with success/error scenarios
  - Mock browser opening functionality
  - Test integration with existing TokenManager and database
- `src/auth/oauth2Server.test.ts` - Test local server functionality
  - Test server start/stop lifecycle
  - Test callback handling with various parameter combinations
  - Test port selection and conflict resolution
  - Test timeout handling and cleanup
- `src/auth/oauth2Providers.test.ts` - Test provider configurations
  - Validate provider configuration completeness
  - Test configuration retrieval for supported providers

**Test Coverage Areas:**

- OAuth2 server start/stop lifecycle with proper cleanup
- Authorization URL generation with state parameter and CSRF protection
- Callback handling with success scenarios (valid code) and error scenarios (invalid code, error parameters)
- Token exchange process with network error handling
- Browser opening (mocked to prevent actual browser launches during testing)
- Port selection with preferred ports and automatic fallback
- Timeout handling for authentication flow
- Database integration with existing account storage
- Error scenarios: network failures, invalid responses, server startup failures

**Existing Test Integration:**

- Follow existing Jest configuration and test patterns
- Use existing test utilities and mocks where applicable
- Ensure integration tests work with existing authentication system
- Maintain compatibility with existing test command and CI pipeline

## [Implementation Order]

Implement components in dependency order to minimize conflicts and ensure successful integration.

1. **Create OAuth2 type definitions** (`src/auth/types.ts`) and update command types (`src/types/commands.ts`)
2. **Implement OAuth2 provider configurations** (`src/auth/oauth2Providers.ts`) with GitLab, GitHub support
3. **Create OAuth2Server class** (`src/auth/oauth2Server.ts`) with HTTP server lifecycle management
4. **Add required dependencies** (`package.json`) for `open` and `get-port` libraries
5. **Implement auth command structure** (`src/commands/auth/command.ts`) using @stricli/core patterns
6. **Develop OAuth2 flow implementation** (`src/commands/auth/impl.ts`) with browser integration and token exchange
7. **Register auth command in app** (`src/app.ts`) and update CLI local commands list (`src/bin/cli.ts`)
8. **Create comprehensive test files** with proper mocking and error scenario coverage
9. **Integration testing** with existing authentication system (OAuth2Manager, TokenManager, database)
10. **End-to-end validation** of complete OAuth2 flow from browser opening to credential storage
