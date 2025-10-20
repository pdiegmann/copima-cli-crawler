# Common Issues and Solutions

Troubleshooting guide for frequent problems with COPIMA CLI Crawler.

## Authentication Issues

### "401 Unauthorized"

**Symptom:**
```
Error: Request failed with status code 401
Authentication failed
```

**Possible Causes:**
1. Token has expired
2. Token was revoked
3. Invalid token format
4. Wrong GitLab host

**Solutions:**

```bash
# 1. Verify token is valid
curl -H "Authorization: Bearer $GITLAB_TOKEN" \
  https://gitlab.com/api/v4/user

# 2. Refresh OAuth2 token
copima-cli-crawler account:refresh --account-id my-gitlab

# 3. Re-authenticate
copima-cli-crawler auth

# 4. Check GitLab host is correct
copima-cli-crawler config:show --section gitlab
```

### "403 Forbidden"

**Symptom:**
```
Error: 403 Forbidden - Insufficient permissions
```

**Possible Causes:**
1. Token lacks required scopes
2. User doesn't have access to resource
3. Feature requires higher tier (Premium/Ultimate)

**Solutions:**

```bash
# 1. Check token scopes (should include: api, read_api)
# Recreate token with correct scopes

# 2. Verify your user has access
# Some resources require specific permission levels

# 3. Skip unavailable resources
# The crawler logs warnings but continues
```

### OAuth2 Browser Not Opening

**Symptom:**
```
Waiting for authorization...
(Browser should open automatically)
```

**Solutions:**

```bash
# 1. Use manual flow
copima-cli-crawler auth --no-browser
# Then open the URL printed in terminal manually

# 2. Check browser is in PATH
which google-chrome
which firefox

# 3. Use different port if 3000 is blocked
copima-cli-crawler auth --port 8080
```

## Network Issues

### Connection Timeout

**Symptom:**
```
Error: Request timeout after 30000ms
```

**Solutions:**

```yaml
# Increase timeout in config
gitlab:
  timeout: 60000  # 60 seconds
```

```bash
# Or check network connectivity
ping gitlab.com
curl -I https://gitlab.com
```

### SSL Certificate Errors

**Symptom:**
```
Error: self signed certificate in certificate chain
```

**Solutions:**

```bash
# 1. Disable SSL verification (development only!)
export NODE_TLS_REJECT_UNAUTHORIZED=0
copima-cli-crawler crawl

# 2. Or in config
```

```yaml
gitlab:
  sslVerify: false
```

```bash
# 3. Install proper certificate (production)
# Add CA certificate to system trust store
```

### Rate Limiting

**Symptom:**
```
Error: 429 Too Many Requests
Rate limit exceeded
```

**Solutions:**

```yaml
# Reduce rate limit
crawl:
  rateLimit:
    enabled: true
    requestsPerSecond: 5  # Lower value
```

```bash
# Or wait for rate limit reset
# Check response headers for reset time
```

## File System Issues

### "ENOSPC: no space left on device"

**Symptom:**
```
Error: ENOSPC: no space left on device
```

**Solutions:**

```bash
# 1. Check available space
df -h

# 2. Clean up old output directories
rm -rf old-output-*/

# 3. Use different drive with more space
copima-cli-crawler crawl --output /mnt/large-drive/output

# 4. Crawl specific resources only
copima-cli-crawler crawl --steps areas,users  # Skip large resources
```

### "EACCES: permission denied"

**Symptom:**
```
Error: EACCES: permission denied, mkdir '/path/to/output'
```

**Solutions:**

```bash
# 1. Check directory permissions
ls -ld /path/to/output

# 2. Create directory with proper permissions
mkdir -p ./output
chmod 755 ./output

# 3. Use directory you have write access to
copima-cli-crawler crawl --output ~/gitlab-data
```

### Corrupted JSONL Files

**Symptom:**
```
Error: Invalid JSON at line 1234
```

**Solutions:**

```bash
# 1. Find corrupted lines
cat users.jsonl | jq -e '.' 2>&1 | grep "parse error"

# 2. Remove corrupted lines
cat users.jsonl | jq -c '.' 2>/dev/null > users.jsonl.clean
mv users.jsonl.clean users.jsonl

# 3. Re-run crawl with resume
rm output/.copima-registry.json  # Clear registry
copima-cli-crawler crawl --resume true
```

## Configuration Issues

### "Configuration validation failed"

**Symptom:**
```
Error: Configuration validation failed
  - gitlab.host is required
  - output.rootDir is invalid
```

**Solutions:**

```bash
# 1. Validate configuration
copima-cli-crawler config:validate

# 2. Check required fields
copima-cli-crawler config:show

# 3. Use setup wizard
copima-cli-crawler setup
```

### Environment Variables Not Working

**Symptom:**
```
Configuration not picking up GITLAB_HOST
```

**Solutions:**

```bash
# 1. Export variables properly
export GITLAB_HOST="https://gitlab.com"  # not: GITLAB_HOST=...

# 2. Verify variable is set
echo $GITLAB_HOST

# 3. Check variable name (case-sensitive)
env | grep GITLAB

# 4. Use config file instead
cat > copima.yaml << EOF
gitlab:
  host: "https://gitlab.com"
EOF
```

### Template Variables Not Resolving

**Symptom:**
```
token: ${env.GITLAB_TOKEN}  # Not substituted
```

**Solutions:**

```bash
# 1. Ensure environment variable exists
echo $GITLAB_TOKEN

# 2. Use correct template syntax
# ${env.VAR} for environment variables
# ${home} for home directory
# ${cwd} for current directory

# 3. Escape $ if literal
# Use $${env.VAR} for literal "${env.VAR}"
```

## Crawling Issues

### Slow Crawl Performance

**Symptom:**
```
Crawl is very slow, taking hours
```

**Solutions:**

```yaml
# 1. Increase rate limit
crawl:
  rateLimit:
    requestsPerSecond: 20  # Higher value

# 2. Skip large resource types
repository:
  commits:
    enabled: false  # Disable expensive operations
  files:
    enabled: false
```

```bash
# 3. Crawl specific steps only
copima-cli-crawler crawl --steps areas,users,resources

# 4. Check network latency
ping your-gitlab-host.com
```

### Memory Issues

**Symptom:**
```
JavaScript heap out of memory
FATAL ERROR: Reached heap limit
```

**Solutions:**

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
copima-cli-crawler crawl
```

### Interrupted Crawls

**Symptom:**
```
Crawl stopped at 50% due to crash/network issue
```

**Solutions:**

```bash
# Resume from checkpoint
copima-cli-crawler crawl --resume true

# Check progress file
cat output/progress.yaml

# If resume state corrupted, start fresh
rm output/.resume-state.yaml
copima-cli-crawler crawl
```

## Deduplication Issues

### Resources Written Multiple Times

**Symptom:**
```
Same user appears in multiple files
```

**Solutions:**

```bash
# 1. Verify deduplication is enabled
copima-cli-crawler config:show | grep deduplication

# 2. Check registry exists
ls -la output/.copima-registry.json

# 3. Review deduplication stats in logs
grep "duplicates skipped" copima.log

# 4. Clear and rebuild registry
rm output/.copima-registry.json
copima-cli-crawler crawl
```

### Registry Corruption

**Symptom:**
```
Error: Invalid registry format
```

**Solutions:**

```bash
# 1. Validate registry JSON
cat output/.copima-registry.json | jq '.' > /dev/null

# 2. If invalid, backup and remove
mv output/.copima-registry.json output/.copima-registry.json.bak

# 3. Next crawl creates new registry
copima-cli-crawler crawl
```

## OAuth2 Issues

### "Invalid OAuth2 Configuration"

**Symptom:**
```
Error: OAuth2 configuration invalid
Missing clientId or clientSecret
```

**Solutions:**

```yaml
# Ensure all OAuth2 fields are set
oauth2:
  providers:
    gitlab:
      clientId: "your-client-id"
      clientSecret: "your-client-secret"
      redirectUri: "http://localhost:3000/callback"
      authorizationUrl: "https://gitlab.com/oauth/authorize"
      tokenUrl: "https://gitlab.com/oauth/token"
      scopes:
        - api
        - read_api
```

### Token Refresh Failed

**Symptom:**
```
Error: Failed to refresh access token
Refresh token invalid or expired
```

**Solutions:**

```bash
# 1. Re-authenticate from scratch
copima-cli-crawler auth --account-id my-gitlab --force

# 2. Or add new account
copima-cli-crawler auth

# 3. Fallback to PAT temporarily
copima-cli-crawler crawl --token glpat-xxx
```

## Data Quality Issues

### Missing Resources

**Symptom:**
```
Expected 100 projects but only got 50
```

**Possible Causes:**
1. Insufficient permissions
2. Archived/deleted resources excluded
3. API pagination issues

**Solutions:**

```bash
# 1. Check access permissions in GitLab UI

# 2. Include archived resources
copima-cli-crawler areas --include-archived

# 3. Increase pagination size
# (Handled automatically by client)

# 4. Check logs for errors
grep "Error" copima.log | grep "projects"
```

### Incomplete Data

**Symptom:**
```
Some issues missing fields like assignees or labels
```

**Solutions:**

```bash
# 1. Check GraphQL field availability
# Some fields require specific GitLab versions

# 2. Verify permissions
# Some fields restricted by access level

# 3. Review API schema compatibility
# Premium/Ultimate features may not be available
```

## General Troubleshooting Steps

### Enable Debug Logging

```yaml
logging:
  level: "debug"
  file: "./logs/copima.log"
```

```bash
# Run with verbose output
copima-cli-crawler crawl --verbose --log-level debug
```

### Check System Requirements

```bash
# Node.js version
node --version  # Should be 20+

# Bun version (if using)
bun --version   # Should be 1.2.8+

# Disk space
df -h

# Memory
free -h
```

### Verify Installation

```bash
# Command available
which copima-cli-crawler

# Version
copima-cli-crawler --version

# Help
copima-cli-crawler --help
```

### Clean Slate Approach

```bash
# Start completely fresh
rm -rf output/
rm -rf ~/.config/copima/
rm database.yaml
copima-cli-crawler setup
copima-cli-crawler auth
copima-cli-crawler crawl
```

## Getting More Help

### Collect Diagnostic Information

```bash
# Version info
copima-cli-crawler --version > diagnostics.txt

# Configuration
copima-cli-crawler config:show >> diagnostics.txt

# Recent logs (without sensitive data)
tail -100 copima.log >> diagnostics.txt

# System info
uname -a >> diagnostics.txt
node --version >> diagnostics.txt
```

### Where to Get Help

1. **Search Issues**: https://github.com/pdiegmann/copima-cli-crawler/issues
2. **Create Issue**: Include diagnostics.txt
3. **Community Discussions**: GitHub Discussions
4. **Documentation**: This Wiki

---

**Troubleshooting Guide Version**: 1.0.0  
**Last Updated**: 2025-10-19
