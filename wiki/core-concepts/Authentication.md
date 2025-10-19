# Authentication

Comprehensive guide to authentication methods in COPIMA CLI Crawler.

## Overview

COPIMA supports three authentication methods:

1. **Personal Access Token (PAT)** - Simple, never stored
2. **OAuth2 with Explicit Tokens** - Stored with automatic refresh
3. **OAuth2 from Storage** - Fully automated token management

## Personal Access Token (PAT)

**Best for**: Quick tests, automation, CI/CD pipelines

### Creating a PAT

1. Log in to your GitLab instance
2. Go to **User Settings** → **Access Tokens**
3. Click **Add new token**
4. Configure:
   - **Name**: `copima-crawler`
   - **Expiration date**: Set appropriate expiry
   - **Scopes**: Select required scopes

### Required Scopes

```
✓ api          - Full API access
✓ read_api     - Read-only API access
✓ read_repository - Read repository data
✓ read_registry   - Read container registry (optional)
```

### Using PAT

#### Method 1: CLI Argument

```bash
copima-cli-crawler crawl \
  --host https://gitlab.com \
  --token glpat-xxxxxxxxxxxxxxxxxxxx
```

#### Method 2: Environment Variable

```bash
export GITLAB_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx"
copima-cli-crawler crawl --host https://gitlab.com
```

#### Method 3: Configuration File

```yaml
# copima.yaml
gitlab:
  host: "https://gitlab.com"
  token: "glpat-xxxxxxxxxxxxxxxxxxxx"
```

```bash
copima-cli-crawler crawl --config ./copima.yaml
```

### PAT Characteristics

**Advantages**:
- ✅ Simple to create and use
- ✅ No OAuth2 setup required
- ✅ Never stored on disk
- ✅ Works in automated environments
- ✅ Easy to revoke

**Limitations**:
- ⚠️ Manual renewal when expired
- ⚠️ Must pass on every command
- ⚠️ No automatic refresh

### Security Best Practices

```bash
# ❌ Don't hardcode in scripts
copima-cli-crawler crawl --token glpat-my-secret-token

# ✅ Use environment variables
export GITLAB_TOKEN="$(cat ~/.secrets/gitlab-token)"
copima-cli-crawler crawl

# ✅ Use config files with restricted permissions
chmod 600 ~/.config/copima/config.yaml
```

## OAuth2 with Explicit Tokens

**Best for**: Development, stored credentials, token refresh

### Prerequisites

You need OAuth2 credentials from your GitLab administrator:

1. **Application ID** (Client ID)
2. **Secret** (Client Secret)
3. **Redirect URI** (typically `http://localhost:3000/callback`)

### Obtaining OAuth2 Credentials

#### Self-Hosted GitLab

**Admin Area** → **Applications** → **New application**

Configure:
- **Name**: `COPIMA CLI Crawler`
- **Redirect URI**: `http://localhost:3000/callback`
- **Confidential**: Yes
- **Scopes**: `api`, `read_api`, `read_repository`

#### GitLab.com

**User Settings** → **Applications** → **Add new application**

Same configuration as self-hosted.

### Authentication Flow

```bash
# 1. Configure OAuth2 provider
cat > copima.yaml << 'EOF'
gitlab:
  host: "https://gitlab.com"

oauth2:
  providers:
    gitlab:
      clientId: "your-application-id"
      clientSecret: "your-application-secret"
      redirectUri: "http://localhost:3000/callback"
      authorizationUrl: "https://gitlab.com/oauth/authorize"
      tokenUrl: "https://gitlab.com/oauth/token"
      scopes:
        - api
        - read_api
EOF

# 2. Run authentication
copima-cli-crawler auth --config ./copima.yaml
```

This will:
1. Start a local web server on port 3000
2. Open your browser to GitLab authorization page
3. You authorize the application
4. GitLab redirects back with authorization code
5. CLI exchanges code for access token and refresh token
6. Tokens are stored in `database.yaml`

### Token Storage Format

**File**: `database.yaml` (in current directory or `~/.config/copima/`)

```yaml
users:
  - id: "user-uuid"
    name: "John Doe"
    email: "john@example.com"
    emailVerified: false
    createdAt: 2025-10-19T10:00:00.000Z
    updatedAt: 2025-10-19T10:00:00.000Z

accounts:
  - id: "account-uuid"
    accountId: "my-gitlab"
    providerId: "gitlab"
    userId: "user-uuid"
    accessToken: "oauth2_access_token_xxxxxxxxxx"
    refreshToken: "oauth2_refresh_token_xxxxxxxxxx"
    accessTokenExpiresAt: 2025-10-19T12:00:00.000Z
    refreshTokenExpiresAt: null
    scope: "api read_api"
    createdAt: 2025-10-19T10:00:00.000Z
    updatedAt: 2025-10-19T10:00:00.000Z
```

### Using Stored Tokens

```bash
# Use account ID to select tokens
copima-cli-crawler crawl --account-id my-gitlab

# Or let CLI auto-select (if only one account)
copima-cli-crawler crawl
```

### Manual Token Provision

You can manually provide OAuth2 tokens:

```bash
copima-cli-crawler crawl \
  --account-id my-gitlab \
  --access-token "oauth2_access_token" \
  --refresh-token "oauth2_refresh_token"
```

This will store them in `database.yaml` for future use.

### Token Refresh

Tokens are **automatically refreshed** when expired:

```
[INFO] Access token expired, refreshing...
[INFO] Token refreshed successfully
[INFO] Updated database.yaml with new tokens
```

**Important**: Both access token and refresh token are updated during refresh!

### OAuth2 Characteristics

**Advantages**:
- ✅ Automatic token refresh
- ✅ Longer token lifetime
- ✅ Secure storage
- ✅ Multiple account support
- ✅ Standardized protocol

**Limitations**:
- ⚠️ Requires OAuth2 app setup
- ⚠️ More complex initial setup
- ⚠️ Requires browser access for initial auth

## OAuth2 from Storage

**Best for**: Production use, multiple GitLab instances

This is the **fully automated** workflow:

```bash
# One-time setup
copima-cli-crawler auth

# Use forever
copima-cli-crawler crawl
```

### Account Management

#### List Accounts

```bash
copima-cli-crawler account:list
```

Output:
```
Stored accounts:
  1. my-gitlab (gitlab.com)
     - User: john@example.com
     - Created: 2025-10-19
     - Status: Active
  
  2. company-gitlab (gitlab.company.com)
     - User: john.doe@company.com
     - Created: 2025-10-18
     - Status: Active
```

#### Add Account

```bash
# Via OAuth2 flow
copima-cli-crawler auth --account-id new-account

# Via explicit tokens
copima-cli-crawler account:add \
  --account-id new-account \
  --access-token "token" \
  --refresh-token "refresh"
```

#### Remove Account

```bash
copima-cli-crawler account:remove --account-id my-gitlab
```

#### Refresh Token Manually

```bash
copima-cli-crawler account:refresh --account-id my-gitlab
```

### Multiple Accounts

Manage multiple GitLab instances:

```yaml
# database.yaml
accounts:
  - accountId: "gitlab-com"
    providerId: "gitlab"
    # ... tokens for gitlab.com
  
  - accountId: "company-gitlab"
    providerId: "gitlab"
    # ... tokens for company gitlab
  
  - accountId: "customer-gitlab"
    providerId: "gitlab"
    # ... tokens for customer gitlab
```

Use specific account:

```bash
# Crawl gitlab.com
copima-cli-crawler crawl --account-id gitlab-com

# Crawl company gitlab
copima-cli-crawler crawl --account-id company-gitlab
```

## Security Considerations

### Token Storage Security

**File Permissions**:

```bash
# Restrict database.yaml access
chmod 600 database.yaml

# Restrict config directory
chmod 700 ~/.config/copima
chmod 600 ~/.config/copima/config.yaml
```

**Encryption** (planned for future):

```yaml
# Future feature
database:
  encryption:
    enabled: true
    keyring: "system"  # Use OS keyring
```

### Token Transmission

- Always use HTTPS for GitLab hosts
- Tokens sent in `Authorization` header
- No tokens in URLs or logs

### Token Rotation

Regularly rotate tokens:

```bash
# Revoke old token in GitLab UI
# Create new PAT or re-authenticate

copima-cli-crawler auth --account-id my-gitlab
```

### Environment Isolation

```bash
# Development
export GITLAB_TOKEN="dev-token"

# Production
export GITLAB_TOKEN="prod-token"

# Or use separate config files
copima-cli-crawler crawl --config dev.yaml
copima-cli-crawler crawl --config prod.yaml
```

## Configuration Priority

Authentication credentials are resolved in this order:

1. **CLI arguments** (highest priority)
   ```bash
   --token, --access-token, --refresh-token
   ```

2. **Environment variables**
   ```bash
   GITLAB_TOKEN, GITLAB_ACCESS_TOKEN
   ```

3. **Configuration file**
   ```yaml
   gitlab.token, gitlab.accessToken
   ```

4. **Stored tokens**
   ```yaml
   database.yaml accounts (via --account-id)
   ```

5. **Interactive prompt** (lowest priority)
   ```
   ? Enter your GitLab access token:
   ```

## Troubleshooting

### "401 Unauthorized"

**Causes**:
- Token expired
- Token revoked
- Incorrect token format
- Wrong GitLab host

**Solutions**:
```bash
# Verify token
curl -H "Authorization: Bearer $GITLAB_TOKEN" \
  https://gitlab.com/api/v4/user

# Refresh OAuth2 token
copima-cli-crawler account:refresh --account-id my-gitlab

# Re-authenticate
copima-cli-crawler auth
```

### "Invalid OAuth2 configuration"

**Causes**:
- Wrong client ID/secret
- Incorrect redirect URI
- Missing scopes

**Solutions**:
```bash
# Validate config
copima-cli-crawler config:validate

# Check OAuth2 app settings in GitLab
# Ensure redirect URI matches exactly
```

### "Token refresh failed"

**Causes**:
- Refresh token expired/revoked
- Network issues
- GitLab server down

**Solutions**:
```bash
# Re-authenticate from scratch
copima-cli-crawler auth --account-id my-gitlab --force

# Or use PAT as fallback
copima-cli-crawler crawl --token "glpat-xxx"
```

### Browser doesn't open (OAuth2)

**Causes**:
- No GUI environment (SSH, Docker)
- Browser not in PATH
- Port 3000 already in use

**Solutions**:
```bash
# Manual OAuth2 flow
copima-cli-crawler auth --no-browser

# Follow printed URL manually
# Copy authorization code from callback
# Paste code when prompted

# Or use different port
copima-cli-crawler auth --port 8080
```

## Best Practices

### 1. Use OAuth2 for Long-Running Crawls

```yaml
# ✅ Good - Automatic refresh
oauth2:
  providers:
    gitlab: { ... }
```

```bash
# ❌ Avoid - Token may expire mid-crawl
--token glpat-short-lived-token
```

### 2. Separate Accounts by Environment

```yaml
# database.yaml
accounts:
  - accountId: "dev"
    # Development tokens
  - accountId: "staging"
    # Staging tokens
  - accountId: "prod"
    # Production tokens
```

### 3. Rotate Tokens Regularly

```bash
# Monthly rotation
0 0 1 * * copima-cli-crawler auth --force
```

### 4. Use Minimum Required Scopes

```yaml
# ✅ Minimal scopes
scopes:
  - read_api
  - read_repository

# ❌ Excessive scopes
scopes:
  - api
  - write_repository
  - sudo
```

### 5. Monitor Token Expiry

```bash
# Check token expiry
copima-cli-crawler account:list --verbose

# Alerts when expiring soon
copima-cli-crawler account:check
```

## Summary

| Method                | Storage | Refresh | Complexity | Best For              |
|-----------------------|---------|---------|------------|-----------------------|
| Personal Access Token | No      | No      | Low        | Quick tests, CI/CD    |
| OAuth2 Explicit       | Yes     | Yes     | Medium     | Development, testing  |
| OAuth2 Storage        | Yes     | Yes     | Low        | Production, long-term |

**Recommendation**: Start with PAT for testing, migrate to OAuth2 for production.

---

**Authentication Guide Version**: 1.0.0  
**Last Updated**: 2025-10-19
