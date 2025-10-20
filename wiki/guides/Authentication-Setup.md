# Authentication Setup Guide

Detailed guide for setting up and managing authentication for COPIMA CLI Crawler.

## Overview

This guide covers all three authentication methods in detail:

1. **Personal Access Tokens (PAT)** - Simple, immediate
2. **OAuth2 with Explicit Tokens** - Stored, auto-refresh
3. **OAuth2 Browser Flow** - Fully automated

## Method 1: Personal Access Token (PAT)

### When to Use

- Quick testing and experimentation
- CI/CD pipelines
- Automation scripts
- Short-term data extraction

### Step 1: Create PAT in GitLab

#### For GitLab.com

1. Log in to https://gitlab.com
2. Click your avatar → **Preferences**
3. In left sidebar: **Access Tokens**
4. Click **Add new token**

#### For Self-Hosted GitLab

1. Log in to your GitLab instance
2. Click your avatar → **Preferences**
3. In left sidebar: **Access Tokens**
4. Click **Add new token**

### Step 2: Configure Token

**Token Name:** `copima-crawler` (or descriptive name)

**Expiration Date:** Choose appropriate expiry:
- 30 days for testing
- 90 days for regular use
- 1 year for long-term automation

**Scopes:** Select these scopes:

```
✓ api          - Full API access
✓ read_api     - Read-only API access  
✓ read_repository - Read repository data
```

**Optional scopes:**
```
✓ read_registry    - For container registry data
✓ read_user        - For detailed user info
```

Click **Create personal access token**.

### Step 3: Save Token

**IMPORTANT**: Copy token immediately - you won't see it again!

```bash
# Save to environment variable
echo 'export GITLAB_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx"' >> ~/.bashrc
source ~/.bashrc

# Or save to secure file
echo "glpat-xxxxxxxxxxxxxxxxxxxx" > ~/.gitlab-token
chmod 600 ~/.gitlab-token
```

### Step 4: Use Token

**Via Environment Variable:**

```bash
export GITLAB_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx"
copima-cli-crawler crawl --host https://gitlab.com
```

**Via Command Line:**

```bash
copima-cli-crawler crawl \
  --host https://gitlab.com \
  --token glpat-xxxxxxxxxxxxxxxxxxxx
```

**Via Configuration File:**

```yaml
# copima.yaml
gitlab:
  host: "https://gitlab.com"
  token: "glpat-xxxxxxxxxxxxxxxxxxxx"
```

```bash
copima-cli-crawler crawl --config copima.yaml
```

### Security Best Practices

```bash
# ✅ Good - Token in environment
export GITLAB_TOKEN=$(cat ~/.gitlab-token)

# ✅ Good - Token in secure config
chmod 600 copima.yaml

# ❌ Bad - Token in command history
copima-cli-crawler crawl --token glpat-xxx

# ❌ Bad - Token in version control
git add copima.yaml  # Contains token
```

## Method 2: OAuth2 with Explicit Tokens

### When to Use

- Long-running crawls
- Multiple GitLab instances
- Token refresh required
- Team environments

### Step 1: Create OAuth2 Application

#### In GitLab (Admin Access Required)

**For Admin:**

1. **Admin Area** → **Applications**
2. Click **New application**
3. Fill in:
   - **Name:** `COPIMA CLI Crawler`
   - **Redirect URI:** `http://localhost:3000/callback`
   - **Confidential:** ✓ Yes
   - **Scopes:** `api`, `read_api`, `read_repository`
4. Click **Save application**
5. Copy **Application ID** and **Secret**

**For Regular Users (if enabled):**

1. **User Settings** → **Applications**
2. Click **Add new application**
3. Same configuration as above

### Step 2: Get Initial Tokens

You need initial access and refresh tokens. Two ways:

**Option A: Manual OAuth2 Flow**

Use a tool like Postman or curl to complete OAuth2 flow:

```bash
# 1. Get authorization code (open in browser)
https://gitlab.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/callback&response_type=code&scope=api read_api

# 2. Exchange code for tokens
curl -X POST https://gitlab.com/oauth/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=AUTHORIZATION_CODE" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=http://localhost:3000/callback"

# Response contains access_token and refresh_token
```

**Option B: Use COPIMA Auth Command**

```bash
# Create config first
cat > copima.yaml << 'EOF'
gitlab:
  host: "https://gitlab.com"

oauth2:
  providers:
    gitlab:
      clientId: "YOUR_CLIENT_ID"
      clientSecret: "YOUR_CLIENT_SECRET"
      redirectUri: "http://localhost:3000/callback"
      authorizationUrl: "https://gitlab.com/oauth/authorize"
      tokenUrl: "https://gitlab.com/oauth/token"
      scopes:
        - api
        - read_api
EOF

# Run auth command
copima-cli-crawler auth --config copima.yaml
```

This opens browser, completes OAuth2 flow, and stores tokens.

### Step 3: Store Tokens

Tokens are stored in `database.yaml`:

```yaml
users:
  - id: "user-uuid"
    name: "Your Name"
    email: "you@example.com"
    createdAt: 2025-10-20T00:00:00.000Z
    updatedAt: 2025-10-20T00:00:00.000Z

accounts:
  - id: "account-uuid"
    accountId: "my-gitlab"
    providerId: "gitlab"
    userId: "user-uuid"
    accessToken: "oauth2-access-token"
    refreshToken: "oauth2-refresh-token"
    accessTokenExpiresAt: 2025-10-20T02:00:00.000Z
    scope: "api read_api"
    createdAt: 2025-10-20T00:00:00.000Z
    updatedAt: 2025-10-20T00:00:00.000Z
```

**Secure this file:**

```bash
chmod 600 database.yaml
```

### Step 4: Use Stored Tokens

```bash
# Use account ID to select tokens
copima-cli-crawler crawl --account-id my-gitlab

# Auto-select if only one account
copima-cli-crawler crawl
```

## Method 3: OAuth2 Browser Flow (Fully Automated)

### When to Use

- Easiest setup for most users
- Desktop/workstation environments
- Interactive sessions

### Step 1: Configure OAuth2

Create `copima.yaml`:

```yaml
gitlab:
  host: "https://gitlab.com"

oauth2:
  providers:
    gitlab:
      clientId: "YOUR_CLIENT_ID"
      clientSecret: "YOUR_CLIENT_SECRET"
      redirectUri: "http://localhost:3000/callback"
      authorizationUrl: "https://gitlab.com/oauth/authorize"
      tokenUrl: "https://gitlab.com/oauth/token"
      scopes:
        - api
        - read_api
```

### Step 2: Run Authentication

```bash
copima-cli-crawler auth --config copima.yaml
```

**What happens:**

1. Local server starts on port 3000
2. Browser opens to GitLab authorization page
3. You authorize the application
4. GitLab redirects back with code
5. Code exchanged for tokens
6. Tokens saved to `database.yaml`
7. Browser shows success message

### Step 3: Start Crawling

```bash
copima-cli-crawler crawl
```

Tokens are automatically loaded and refreshed.

## Managing Multiple Accounts

### Add Multiple Accounts

```bash
# Add GitLab.com account
copima-cli-crawler auth --account-id gitlab-com

# Add company GitLab account  
copima-cli-crawler auth --account-id company-gitlab \
  --config company-gitlab.yaml
```

### List Accounts

```bash
copima-cli-crawler account:list
```

Output:

```
Stored accounts:
  1. gitlab-com (gitlab.com)
     - User: alice@example.com
     - Status: Active
     - Expires: 2025-10-20 12:00:00
  
  2. company-gitlab (gitlab.company.com)
     - User: alice@company.com
     - Status: Active
     - Expires: 2025-10-21 08:00:00
```

### Switch Between Accounts

```bash
# Use specific account
copima-cli-crawler crawl --account-id gitlab-com

# Different account
copima-cli-crawler crawl --account-id company-gitlab
```

### Remove Account

```bash
copima-cli-crawler account:remove --account-id old-account
```

## Token Refresh

### Automatic Refresh

OAuth2 tokens are automatically refreshed when:

- Access token is expired
- Request returns 401 Unauthorized
- Token expiry is within threshold

```
[INFO] Access token expired
[INFO] Refreshing token using refresh token...
[INFO] Token refreshed successfully
[INFO] Updated database.yaml
```

### Manual Refresh

```bash
copima-cli-crawler account:refresh --account-id my-gitlab
```

### Refresh Token Expiry

If refresh token expires:

```bash
# Re-authenticate
copima-cli-crawler auth --account-id my-gitlab --force
```

## Troubleshooting

### Browser Doesn't Open

**Issue:** OAuth2 auth command doesn't open browser

**Solution:**

```bash
# Use no-browser mode
copima-cli-crawler auth --no-browser

# Copy URL from terminal
# Open in browser manually
# Copy code from callback URL
# Paste when prompted
```

### Port 3000 Already in Use

**Issue:** Port 3000 is occupied

**Solution:**

```bash
# Use different port
copima-cli-crawler auth --port 8080

# Update redirect URI in GitLab OAuth app to match
```

### Invalid Client Error

**Issue:** "Invalid client" when authenticating

**Causes:**
- Wrong client ID/secret
- Redirect URI mismatch

**Solution:**

1. Verify client ID and secret in GitLab
2. Check redirect URI matches exactly:
   - GitLab: `http://localhost:3000/callback`
   - Config: `http://localhost:3000/callback`
   - NO trailing slash!

### Token Refresh Fails

**Issue:** "Failed to refresh access token"

**Causes:**
- Refresh token expired
- Refresh token revoked
- Network issues

**Solution:**

```bash
# Re-authenticate from scratch
copima-cli-crawler auth --account-id my-gitlab --force
```

### "401 Unauthorized" with Valid Token

**Issue:** Token seems valid but requests fail

**Causes:**
- Token lacks required scopes
- Token revoked in GitLab

**Solution:**

1. Check token scopes in GitLab
2. Recreate token with correct scopes
3. Re-authenticate

## Security Checklist

- [ ] Tokens not in version control
- [ ] `database.yaml` has `chmod 600` permissions
- [ ] Config files with tokens are `.gitignore`d
- [ ] Environment variables used for CI/CD
- [ ] Tokens rotated regularly (90 days)
- [ ] Old tokens revoked after rotation
- [ ] Minimum required scopes used
- [ ] Shared systems use dedicated tokens

## See Also

- [Authentication Concepts](../core-concepts/Authentication.md)
- [Configuration Guide](../core-concepts/Configuration.md)
- [Troubleshooting](../troubleshooting/Common-Issues.md)

---

**Last Updated**: 2025-10-20
