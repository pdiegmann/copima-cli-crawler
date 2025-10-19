# Frequently Asked Questions

Common questions about COPIMA CLI Crawler.

## General Questions

### What is COPIMA CLI Crawler?

COPIMA is a command-line tool for extracting comprehensive data from GitLab instances using both GraphQL and REST APIs. It systematically crawls groups, projects, users, issues, merge requests, commits, and more.

### Why would I use this?

Common use cases:

- **Data analysis** - Analyze development patterns, metrics
- **Migration** - Export data before migrating GitLab instances
- **Backup** - Create structured backups of GitLab data
- **Compliance** - Extract data for audit or compliance requirements
- **Research** - Study software development processes
- **Integration** - Feed data into other systems

### Is it official?

No, COPIMA is a third-party tool, not officially maintained by GitLab Inc.

### What GitLab versions are supported?

COPIMA works with GitLab 13.0+ (both self-hosted and gitlab.com). Some features require specific versions or tiers (Premium/Ultimate).

### Does it work with GitHub, Bitbucket, etc.?

No, COPIMA is designed specifically for GitLab. The architecture leverages GitLab-specific APIs.

## Installation & Setup

### How do I install it?

See the [Installation Guide](../getting-started/Installation.md).

Quick methods:
- **Pre-built executable**: Download from releases
- **npm**: `npm install -g copima-cli-crawler`
- **From source**: Clone and build

### Do I need Bun or Node.js?

You need **Node.js 20+** (or **Bun 1.2.8+** if you prefer Bun). Pre-built executables don't require either.

### Where should I install it?

- **Global installation**: `/usr/local/bin` (Linux/Mac) or add to PATH (Windows)
- **Local installation**: Project directory for per-project use
- **User installation**: `~/.local/bin` for single-user systems

## Authentication

### What's the difference between PAT and OAuth2?

| Feature | Personal Access Token (PAT) | OAuth2 |
|---------|---------------------------|--------|
| Setup complexity | Low | Medium |
| Token refresh | Manual | Automatic |
| Storage | Not stored | Stored securely |
| Best for | Quick tests, CI/CD | Long-term use |

See [Authentication](../core-concepts/Authentication.md) for details.

### How do I create a Personal Access Token?

1. GitLab → **User Settings** → **Access Tokens**
2. Click **Add new token**
3. Select scopes: `api`, `read_api`, `read_repository`
4. Set expiration date
5. Copy token (you won't see it again!)

### Where are OAuth2 tokens stored?

In `database.yaml` in the current directory or `~/.config/copima/database.yaml`.

**Security**: Restrict permissions: `chmod 600 database.yaml`

### Can I use the same token for multiple GitLab instances?

No, each GitLab instance needs its own token or OAuth2 configuration.

## Usage

### How long does a crawl take?

Depends on instance size:

| GitLab Size | Estimated Time |
|-------------|----------------|
| Small (<100 projects) | 5-30 minutes |
| Medium (100-1000 projects) | 1-6 hours |
| Large (1000+ projects) | 6-24+ hours |

**Factors**: Number of projects, issues, commits, network speed, rate limits.

### Can I crawl just specific groups or projects?

Not directly via CLI filters, but you can:

1. **Use configuration to limit scope**
2. **Manually filter output files after crawling**
3. **Contribute a feature** for selective crawling

### What if my crawl is interrupted?

Use resume capability:

```bash
copima-cli-crawler crawl --resume true
```

The crawler automatically continues from the last checkpoint.

### Can I run multiple crawls in parallel?

Not recommended. Running multiple instances against the same output directory will cause conflicts. Use separate output directories:

```bash
# Terminal 1
copima-cli-crawler crawl --output ./output-instance1

# Terminal 2
copima-cli-crawler crawl --output ./output-instance2 --host https://gitlab2.com
```

### How much disk space do I need?

Rough estimates:

| Resource Count | Disk Space |
|---------------|------------|
| 1,000 projects | 100-500 MB |
| 10,000 projects | 1-5 GB |
| 100,000 projects | 10-50 GB |

**Factors**: Number of issues, commits, file sizes in repositories.

## Output & Data

### What format is the output?

**JSONL** (JSON Lines) - each line is a valid JSON object. Easy to process with tools like `jq`, Python, or JavaScript.

### Why JSONL instead of JSON?

Advantages:
- **Streaming**: Process line-by-line without loading entire file
- **Append-only**: No need to rewrite entire file
- **Fault-tolerant**: Partial files are still valid
- **Memory-efficient**: Low memory footprint for large datasets

### How do I view/process JSONL files?

```bash
# View with jq
cat users.jsonl | jq '.'

# Convert to JSON array
cat users.jsonl | jq -s '.'

# Filter
cat users.jsonl | jq 'select(.state == "active")'

# Extract fields
cat users.jsonl | jq -r '.username'

# Count records
wc -l users.jsonl
```

### Why does the output mirror GitLab structure?

To maintain context and make it easy to navigate. Each group/project has its own directory with its resources.

### Can I change the output format?

Currently, only JSONL is supported. Converting to other formats (CSV, XML, etc.) can be done with post-processing tools.

## Performance

### The crawl is very slow. How can I speed it up?

```yaml
# Increase rate limit
crawl:
  rateLimit:
    requestsPerSecond: 20  # Higher value (be careful)

# Skip expensive resources
repository:
  commits:
    enabled: false
  files:
    enabled: false
```

### Does the crawler use parallel requests?

GraphQL queries are batched when possible, but requests are made sequentially to respect rate limits and avoid overwhelming the GitLab instance.

### Can I crawl during business hours without impacting users?

Yes, use conservative rate limits:

```yaml
crawl:
  rateLimit:
    requestsPerSecond: 5  # Gentle on server
```

## Features

### Does it support GitLab Premium/Ultimate features?

Yes, features like Epics, Security Scans, and Compliance are crawled if available. The crawler adapts based on what's accessible.

### Can I customize what gets crawled?

Yes, via configuration:

```yaml
crawl:
  steps:
    - areas
    - users
    # Skip resources and repository

resources:
  issues:
    includeNotes: false  # Skip issue comments
```

### Does it handle pagination automatically?

Yes, both GraphQL and REST pagination are handled automatically.

### What about rate limiting?

COPIMA respects GitLab's rate limits and includes built-in rate limiting to avoid overwhelming the server.

### Can I add custom processing during crawl?

Yes, use **callbacks** to process data as it's crawled. See [Callbacks](../core-concepts/Callbacks.md).

## Troubleshooting

### I get "401 Unauthorized" errors

Common causes:
- Expired token
- Wrong GitLab host
- Insufficient permissions

See [Common Issues](Common-Issues.md#authentication-issues).

### The crawler stops at random points

Check:
- Network connectivity
- Disk space
- Memory availability

Use `--resume true` to continue from checkpoint.

### Some resources are missing

Possible reasons:
- Insufficient permissions (you don't have access)
- Archived/deleted resources
- GitLab version/tier limitations

Review logs for warnings:
```bash
grep "Warning" copima.log
```

## Data & Security

### Is my data secure?

- Tokens are **never logged**
- OAuth2 tokens stored in YAML with restricted permissions
- Communication uses **HTTPS**
- No data sent to third parties

### Where is data stored?

- **Output data**: Directory you specify (default: `./output`)
- **Tokens**: `database.yaml` (current directory or `~/.config/copima/`)
- **Logs**: `copima.log` or as configured

### Can I safely commit config files to version control?

**DO NOT** commit files containing tokens:
- ❌ `database.yaml` (contains tokens)
- ❌ `copima.yaml` (if it contains `token` field)

**Safe to commit**:
- ✅ `copima.yaml` (with `token: "${env.GITLAB_TOKEN}"`)
- ✅ Example configs without sensitive data

```gitignore
# .gitignore
database.yaml
copima.yaml  # If contains tokens
*.log
output/
```

### How do I backup my data?

```bash
# Backup everything
tar -czf backup-$(date +%Y%m%d).tar.gz output/ database.yaml copima.yaml

# Restore
tar -xzf backup-20251019.tar.gz
```

## Advanced

### Can I extend or modify COPIMA?

Yes! COPIMA is open-source (MIT license). Contributions welcome:

1. Fork the repository
2. Make changes
3. Submit pull request

See [Contributing Guidelines](../development/Contributing.md).

### Can I use it in CI/CD pipelines?

Yes:

```yaml
# GitLab CI example
crawl-data:
  script:
    - export GITLAB_TOKEN=${CI_JOB_TOKEN}
    - copima-cli-crawler crawl
  artifacts:
    paths:
      - output/
```

### Does it work with GitLab CI job tokens?

Yes, use `CI_JOB_TOKEN` as a PAT:

```bash
export GITLAB_TOKEN="${CI_JOB_TOKEN}"
copima-cli-crawler crawl
```

### Can I run it in Docker?

Docker support is planned. Currently, you can create your own Dockerfile:

```dockerfile
FROM node:20
RUN npm install -g copima-cli-crawler
ENTRYPOINT ["copima-cli-crawler"]
```

## Support & Contribution

### How do I report a bug?

1. Search [existing issues](https://github.com/pdiegmann/copima-cli-crawler/issues)
2. Create [new issue](https://github.com/pdiegmann/copima-cli-crawler/issues/new) with:
   - COPIMA version
   - GitLab version
   - Steps to reproduce
   - Error messages/logs

### How can I contribute?

- Report bugs
- Suggest features
- Improve documentation
- Submit pull requests

See [Contributing Guidelines](../development/Contributing.md).

### Where can I get help?

1. **Documentation**: This Wiki
2. **GitHub Issues**: Bug reports, questions
3. **GitHub Discussions**: General discussions
4. **Email**: Project maintainers

## Comparison with Alternatives

### How does COPIMA compare to GitLab's export feature?

| Feature | COPIMA | GitLab Export |
|---------|--------|---------------|
| Scope | Entire instance | Single project/group |
| Format | JSONL | Tar archive |
| Automation | CLI/programmable | Manual/UI |
| Customization | High | Low |
| Resume | Yes | No |

### What about using GitLab API directly?

COPIMA provides:
- Pre-built pagination handling
- Automatic deduplication
- Resume capability
- Hierarchical storage
- Error recovery
- Progress reporting

## Future Plans

### What features are planned?

- Docker support
- Database backend (in addition to JSONL)
- Incremental crawls (delta updates)
- More granular filtering
- Plugin system
- Web UI (maybe)

See [project roadmap](https://github.com/pdiegmann/copima-cli-crawler/projects).

### Can I request a feature?

Yes! Create a [feature request](https://github.com/pdiegmann/copima-cli-crawler/issues/new) describing:
- What you want to do
- Why it's useful
- How it should work

---

**FAQ Version**: 1.0.0  
**Last Updated**: 2025-10-19
