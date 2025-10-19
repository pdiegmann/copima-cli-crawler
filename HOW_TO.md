# How to Use the GitLab Crawler - Complete Guide

Welcome! This guide will help you use the GitLab Crawler tool to extract data from your GitLab instance. No programming experience is required.

## Table of Contents

1. [What Does This Tool Do?](#what-does-this-tool-do)
2. [Before You Start](#before-you-start)
3. [Quick Start Guide](#quick-start-guide)
4. [Step-by-Step Setup](#step-by-step-setup)
5. [Running Your First Crawl](#running-your-first-crawl)
6. [Understanding the Output](#understanding-the-output)
7. [Advanced Features](#advanced-features)
8. [Troubleshooting](#troubleshooting)
9. [Common Questions](#common-questions)

---

## What Does This Tool Do?

The GitLab Crawler is a command-line tool that extracts information from your GitLab server and saves it to files on your computer. It can collect:

- **Groups and Projects**: All the groups and projects you have access to
- **Users**: Information about all users in your GitLab instance
- **Issues and Merge Requests**: All issues, merge requests, and their details
- **Repository Data**: Commits, branches, tags, and file contents

The tool saves everything in a structured format (JSONL files) that can be easily analyzed or imported into other systems.

---

## Before You Start

### What You'll Need

1. **Access to a GitLab Instance**
   - You need a GitLab server URL (e.g., `https://gitlab.com` or your company's GitLab server)
   - You need appropriate permissions to view the data you want to crawl

2. **Authentication Credentials**
   - Either a **Personal Access Token** from GitLab, or
   - **OAuth2 credentials** (Client ID and Client Secret) from your GitLab administrator

3. **Installed Software**
   - This tool should already be installed. If not, ask your system administrator.

4. **Disk Space**
   - Ensure you have enough disk space. A large GitLab instance might produce several gigabytes of data.

---

## Quick Start Guide

If you're already familiar with command-line tools, here's the fastest way to get started:

```bash
# 1. Run the interactive setup wizard
copima-cli-crawler setup

# 2. Authenticate with GitLab
copima-cli-crawler auth

# 3. Run a complete crawl
copima-cli-crawler crawl

# That's it! Your data will be in the ./output directory
```

If you're new to command-line tools or want more detailed instructions, continue reading the step-by-step guide below.

---

## Step-by-Step Setup

### Step 1: Open Your Terminal

**On Windows:**
- Press `Win + R`, type `cmd`, and press Enter

**On Mac:**
- Press `Cmd + Space`, type `terminal`, and press Enter

**On Linux:**
- Press `Ctrl + Alt + T` or search for "Terminal" in your applications

### Step 2: Check if the Tool is Installed

Type the following command and press Enter:

```bash
copima-cli-crawler --version
```

You should see a version number (e.g., `0.1.0`). If you get an error like "command not found", the tool isn't installed yet. Contact your system administrator.

### Step 3: Run the Setup Wizard

The easiest way to configure the tool is using the interactive setup wizard:

```bash
copima-cli-crawler setup
```

The wizard will ask you several questions:

1. **GitLab Host**: Enter your GitLab server URL
   - Example: `https://gitlab.com` or `https://gitlab.mycompany.com`

2. **Authentication Method**: Choose how you want to authenticate
   - **Option A**: Use a Personal Access Token (simpler, recommended for beginners)
   - **Option B**: Use OAuth2 (more secure, but requires setup from your admin)

3. **Configuration File Location**: Where to save your settings
   - Press Enter to use the default location (`./copima.yaml`)
   - Or specify a custom path

The wizard will save your configuration and automatically start the authentication process.

### Step 4: Authenticate with GitLab

#### Option A: Using a Personal Access Token

1. Log in to your GitLab instance in a web browser
2. Go to your **User Settings** → **Access Tokens**
3. Create a new token with these scopes (permissions):
   - `api` - Full API access
   - `read_user` - Read user information
   - `read_repository` - Read repository data

4. Copy the generated token

5. Run the authentication command:
   ```bash
   copima-cli-crawler account:add --access-token YOUR_TOKEN_HERE
   ```

#### Option B: Using OAuth2 (After Setup Wizard)

If you configured OAuth2 during setup, the wizard automatically started the authentication flow. If not, run:

```bash
copima-cli-crawler auth
```

This will:
1. Open your web browser automatically
2. Ask you to log in to GitLab
3. Request permission to access your data
4. Save the credentials automatically

**Note**: Your browser might show a warning about a "self-signed certificate" or "unsecured connection" on `localhost`. This is normal and safe - click "Advanced" and proceed.

---

## Running Your First Crawl

Now that you're set up and authenticated, you can start crawling!

### Basic Crawl (Recommended for First Time)

Start with a basic crawl to make sure everything works:

```bash
copima-cli-crawler crawl
```

This command will:
1. Connect to your GitLab instance
2. Crawl all data in 4 steps (groups, users, resources, repositories)
3. Show progress in your terminal
4. Save data to the `./output` directory

**Note**: For large GitLab instances, this might take several minutes or even hours. Be patient!

### Crawling Specific Steps Only

If you only want specific types of data, you can run individual steps:

#### Step 1: Crawl Groups and Projects Only
```bash
copima-cli-crawler areas
```

#### Step 2: Crawl Users Only
```bash
copima-cli-crawler users
```

#### Step 3: Crawl Issues, Merge Requests, and Resources
```bash
copima-cli-crawler resources
```

#### Step 4: Crawl Repository Data (Commits, Branches, Files)
```bash
copima-cli-crawler repository
```

### Choosing Specific Steps

You can also use the main `crawl` command with the `--steps` option:

```bash
# Only crawl groups/projects and users
copima-cli-crawler crawl --steps areas,users

# Only crawl repository data
copima-cli-crawler crawl --steps repository
```

### Specifying Output Directory

By default, data is saved to `./output`. To use a different location:

```bash
copima-cli-crawler crawl --output /path/to/your/folder
```

---

## Understanding the Output

### Folder Structure

After a successful crawl, your output directory will look like this:

```
output/
├── areas/
│   ├── groups.jsonl
│   └── projects.jsonl
├── users/
│   └── users.jsonl
├── [group-name]/
│   ├── issues.jsonl
│   ├── merge_requests.jsonl
│   ├── labels.jsonl
│   └── members.jsonl
└── [project-name]/
    ├── commits.jsonl
    ├── branches.jsonl
    ├── tags.jsonl
    └── repository_tree.jsonl
```

### What is JSONL?

JSONL (JSON Lines) is a text format where each line is a separate JSON object. You can:

- Open it in any text editor
- Import it into Excel, Google Sheets, or other tools
- Process it with data analysis tools like Python, R, or databases

### Example: Viewing a JSONL File

**On Windows (using Notepad):**
```bash
notepad output/users/users.jsonl
```

**On Mac/Linux (using less):**
```bash
less output/users/users.jsonl
```

Each line represents one record (user, project, issue, etc.).

### Progress Files

During crawling, the tool creates progress files:

- `progress.yaml` - Current crawling status
- `resume-state.yaml` - Checkpoint for resuming interrupted crawls

You don't need to edit these files manually.

---

## Advanced Features

### Resuming an Interrupted Crawl

If your crawl was interrupted (e.g., network issue, computer shutdown), you can resume from where it stopped:

```bash
copima-cli-crawler crawl --resume true
```

The tool will check what was already crawled and continue from there.

### Dry Run Mode

To test your configuration without actually crawling data:

```bash
copima-cli-crawler crawl --dry-run true
```

This validates your credentials and settings without downloading anything.

### Verbose Logging

To see more detailed information about what the tool is doing:

```bash
copima-cli-crawler crawl --verbose true
```

Useful for debugging or understanding what's happening during the crawl.

### Multiple GitLab Accounts

You can store multiple GitLab accounts and switch between them:

```bash
# Add a second account
copima-cli-crawler account:add --host https://gitlab.company2.com --access-token TOKEN2

# List all accounts
copima-cli-crawler account:list

# Use a specific account
copima-cli-crawler crawl --account-id ACCOUNT_ID_FROM_LIST
```

### Configuration Management

View your current configuration:

```bash
copima-cli-crawler config:show
```

Change a configuration value:

```bash
copima-cli-crawler config:set --key gitlab.host --value https://gitlab.com
```

Remove a configuration value:

```bash
copima-cli-crawler config:unset --key gitlab.host
```

Validate your configuration:

```bash
copima-cli-crawler config:validate
```

---

## Troubleshooting

### Problem: "Command not found"

**Solution**: The tool isn't installed or not in your PATH. Contact your system administrator.

### Problem: "Authentication failed"

**Possible causes and solutions**:

1. **Expired token**: Create a new Personal Access Token in GitLab
2. **Wrong token**: Double-check you copied the entire token
3. **Insufficient permissions**: Make sure your token has the required scopes (api, read_user, read_repository)

Try running the setup wizard again:
```bash
copima-cli-crawler setup
```

### Problem: "Cannot connect to GitLab"

**Possible causes and solutions**:

1. **Wrong URL**: Verify your GitLab instance URL
   ```bash
   copima-cli-crawler config:show
   ```

2. **Network issues**: Check your internet connection

3. **Firewall**: Your network might be blocking the connection. Contact your IT department.

4. **Self-signed certificates**: If your GitLab uses self-signed SSL certificates, you may need to disable SSL verification (ask your administrator).

### Problem: "Out of disk space"

**Solution**: Free up disk space or specify a different output directory:
```bash
copima-cli-crawler crawl --output /path/to/larger/drive
```

### Problem: Crawl is very slow

**Possible causes and solutions**:

1. **Large GitLab instance**: Normal for instances with thousands of projects. Be patient.

2. **Network speed**: Slow internet connection affects crawling speed.

3. **GitLab rate limits**: The tool respects rate limits. This is expected and cannot be bypassed.

### Problem: Crawl stopped unexpectedly

**Solution**: Resume from where it stopped:
```bash
copima-cli-crawler crawl --resume true
```

### Getting More Help

If you're still having issues:

1. Check the main [README.md](README.md) for technical details
2. Enable verbose logging to see detailed error messages:
   ```bash
   copima-cli-crawler crawl --verbose true
   ```
3. Contact your system administrator
4. If you're technical, check the GitHub repository for issues and discussions

---

## Common Questions

### Q: How long does a crawl take?

**A**: It depends on the size of your GitLab instance:
- Small (< 100 projects): 5-15 minutes
- Medium (100-1000 projects): 30 minutes - 2 hours
- Large (> 1000 projects): Several hours

### Q: How much disk space do I need?

**A**: Approximate estimates:
- Small instance: 100-500 MB
- Medium instance: 500 MB - 5 GB
- Large instance: 5-50 GB or more

Check your available disk space before starting.

### Q: Can I run multiple crawls at the same time?

**A**: No, running multiple crawls to the same output directory will cause conflicts. Use different output directories:

```bash
# Terminal 1
copima-cli-crawler crawl --output ./output1

# Terminal 2
copima-cli-crawler crawl --output ./output2
```

### Q: Is my data secure?

**A**: Yes:
- Your credentials are stored locally in an encrypted database
- Data is saved only on your computer
- The tool doesn't send data to any third-party services
- All communication with GitLab is encrypted (HTTPS)

### Q: Can I automate regular crawls?

**A**: Yes! You can schedule the crawler using:
- **Windows**: Task Scheduler
- **Mac/Linux**: cron jobs

Example cron job (runs daily at 2 AM):
```bash
0 2 * * * /usr/local/bin/copima-cli-crawler crawl --output /path/to/output
```

### Q: What permissions do I need?

**A**: The tool can only access what your GitLab account can access. If you need to crawl:
- **Public projects**: Any account works
- **Internal projects**: You need to be logged into the GitLab instance
- **Private projects**: You need explicit access to those projects

### Q: Can I filter what gets crawled?

**A**: Yes, use the `--steps` option to crawl specific data types. For more advanced filtering, you'll need to modify the configuration file or use data callbacks (see technical documentation in README.md).

### Q: What if I made a mistake?

**A**: No worries! You can:
1. Delete the output directory and start over
2. Run the setup wizard again: `copima-cli-crawler setup`
3. Change individual settings: `copima-cli-crawler config:set --key KEY --value VALUE`

### Q: The output files are too large to open

**A**: JSONL files can be very large. Instead of opening the entire file:
- Use command-line tools to view parts: `head -n 100 output/users/users.jsonl`
- Import into a database for analysis
- Use specialized tools like `jq` for JSON processing
- Split into smaller files using command-line tools

---

## Quick Reference Card

### Essential Commands

```bash
# Initial setup
copima-cli-crawler setup

# Authenticate
copima-cli-crawler auth

# Run complete crawl
copima-cli-crawler crawl

# Run specific steps
copima-cli-crawler crawl --steps areas,users

# Resume interrupted crawl
copima-cli-crawler crawl --resume true

# Test configuration
copima-cli-crawler crawl --dry-run true

# View configuration
copima-cli-crawler config:show

# List accounts
copima-cli-crawler account:list

# Get help
copima-cli-crawler --help
copima-cli-crawler crawl --help
```

### Common Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--host` | GitLab instance URL | `--host https://gitlab.com` |
| `--access-token` | Personal Access Token | `--access-token glpat-xxx...` |
| `--output` | Output directory | `--output ./my-data` |
| `--steps` | Which steps to run | `--steps areas,users` |
| `--resume` | Resume from checkpoint | `--resume true` |
| `--dry-run` | Test without crawling | `--dry-run true` |
| `--verbose` | Detailed logging | `--verbose true` |
| `--help` | Show help | `--help` |

---

## Next Steps

Now that you've completed your first crawl:

1. **Explore the data**: Browse through the output directory and open some JSONL files
2. **Analyze the data**: Import files into your preferred analysis tool
3. **Automate**: Set up regular crawls if needed
4. **Share**: The JSONL format makes it easy to share data with team members

For technical details, advanced configuration, and developer information, see the main [README.md](README.md) file.

---

**Happy Crawling! 🚀**

If you found this guide helpful or have suggestions for improvements, please share your feedback with your system administrator or contribute to the project on GitHub.
