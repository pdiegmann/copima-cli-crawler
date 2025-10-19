# Quick Start Guide

Get up and running with COPIMA CLI Crawler in just a few minutes.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js 20+** or **Bun 1.2.8+** installed
2. **Access to a GitLab instance** (gitlab.com or self-hosted)
3. **Authentication credentials** (Personal Access Token or OAuth2)
4. **Sufficient disk space** for the crawled data

## 3-Step Quick Start

### Step 1: Install the Tool

If using as a pre-built executable:
```bash
# The tool should already be available as 'copima-cli-crawler'
copima-cli-crawler --version
```

If building from source:
```bash
# Clone the repository
git clone https://github.com/pdiegmann/copima-cli-crawler.git
cd copima-cli-crawler

# Install dependencies
npm install

# Build the project
npm run build
```

### Step 2: Run Interactive Setup

The easiest way to get started is using the interactive setup wizard:

```bash
copima-cli-crawler setup
```

The wizard will guide you through:
- Setting your GitLab instance URL
- Configuring authentication (OAuth2 or Personal Access Token)
- Setting the output directory
- Other optional settings

### Step 3: Start Crawling

Once setup is complete, start your first crawl:

```bash
copima-cli-crawler crawl
```

This will:
1. Connect to your GitLab instance
2. Crawl all accessible data in 4 steps
3. Save everything to the configured output directory
4. Display progress in real-time

## Alternative: Manual Setup

If you prefer not to use the interactive wizard:

### Using a Personal Access Token

```bash
# Create a config file
cat > copima.yaml << 'EOF'
gitlab:
  host: "https://gitlab.com"
  token: "your-personal-access-token"

output:
  rootDir: "./output"
EOF

# Run the crawl
copima-cli-crawler crawl --config ./copima.yaml
```

### Using OAuth2

```bash
# Create a config file with OAuth2 settings
cat > copima.yaml << 'EOF'
gitlab:
  host: "https://gitlab.com"

output:
  rootDir: "./output"

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
EOF

# Authenticate (opens browser)
copima-cli-crawler auth --config ./copima.yaml

# Run the crawl
copima-cli-crawler crawl --config ./copima.yaml
```

## Understanding the Output

After the crawl completes, you'll find:

```
output/
├── .copima-registry.json          # Deduplication registry
├── progress.yaml                  # Latest progress state
├── users.jsonl                    # All users
├── group1/                        # Top-level group
│   ├── groups.jsonl              # Group metadata
│   ├── members.jsonl             # Group members
│   ├── labels.jsonl              # Group labels
│   ├── issues.jsonl              # Group issues
│   └── project1/                 # Nested project
│       ├── projects.jsonl        # Project metadata
│       ├── issues.jsonl          # Project issues
│       ├── merge_requests.jsonl  # Project MRs
│       ├── commits.jsonl         # Git commits
│       └── branches.jsonl        # Git branches
└── ...
```

## Viewing the Results

JSONL files can be viewed with:

```bash
# View first 5 users
head -5 output/users.jsonl

# Pretty-print with jq
cat output/users.jsonl | head -1 | jq '.'

# Count total users
wc -l output/users.jsonl

# Search for specific data
grep "username" output/users.jsonl
```

## Common First-Time Options

### Crawl Specific Steps Only

```bash
# Only crawl groups and projects
copima-cli-crawler crawl --steps areas

# Crawl multiple steps
copima-cli-crawler crawl --steps areas,users
```

### Test Configuration Without Crawling

```bash
# Dry-run mode
copima-cli-crawler crawl --dry-run
```

### Resume an Interrupted Crawl

```bash
# If a crawl is interrupted, resume from the last checkpoint
copima-cli-crawler crawl --resume true
```

### Verbose Logging

```bash
# Enable debug logging
copima-cli-crawler crawl --verbose true
```

## Next Steps

Now that you have a basic crawl running, explore:

1. **[Command Reference](../guides/Command-Reference.md)** - Learn all available commands
2. **[Configuration Reference](../guides/Configuration-Reference.md)** - Customize your setup
3. **[Four-Step Process](../architecture/Crawling-Process.md)** - Understand what's being crawled
4. **[Resume & Recovery](../guides/Resume-Recovery.md)** - Handle long-running crawls
5. **[Custom Callbacks](../guides/Custom-Callbacks.md)** - Process data as it's crawled

## Troubleshooting Quick Start Issues

### "Command not found"
- Ensure the tool is installed and in your PATH
- Try using the full path: `./copima-cli-crawler`

### "Authentication failed"
- Verify your GitLab token has the correct scopes (api, read_api)
- Check that the GitLab host URL is correct
- Ensure your token hasn't expired

### "Permission denied"
- Check that your GitLab user has access to the resources you're trying to crawl
- Some resources require specific permission levels

### "Disk space error"
- Ensure you have sufficient disk space for the output
- Consider crawling specific steps or groups only

For more help, see the [Troubleshooting Guide](../troubleshooting/Common-Issues.md).

## Summary

You've now completed the quick start! You should have:

✅ Installed and configured the crawler  
✅ Set up authentication  
✅ Run your first crawl  
✅ Located the output data  

Continue to the [detailed guides](../guides/Command-Reference.md) to learn more advanced features.
