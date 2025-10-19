# Installation Guide

Comprehensive installation instructions for COPIMA CLI Crawler.

## System Requirements

### Minimum Requirements

- **Operating System**: Linux, macOS, or Windows
- **Node.js**: Version 20.0 or higher (if not using Bun)
- **Bun**: Version 1.2.8 or higher (recommended)
- **Memory**: 2 GB RAM minimum
- **Disk Space**: 1 GB for installation + space for crawled data
- **Network**: Access to GitLab instance

### Recommended Requirements

- **Memory**: 4 GB RAM or more
- **Disk Space**: 10 GB+ for large GitLab instances
- **CPU**: Multi-core processor for better performance

## Installation Methods

### Method 1: Pre-built Executables (Easiest)

Download pre-built executables for your platform from the releases page:

```bash
# Linux (x64)
wget https://github.com/pdiegmann/copima-cli-crawler/releases/latest/download/copima-cli-crawler-linux-x64
chmod +x copima-cli-crawler-linux-x64
sudo mv copima-cli-crawler-linux-x64 /usr/local/bin/copima-cli-crawler

# macOS (x64)
wget https://github.com/pdiegmann/copima-cli-crawler/releases/latest/download/copima-cli-crawler-macos-x64
chmod +x copima-cli-crawler-macos-x64
sudo mv copima-cli-crawler-macos-x64 /usr/local/bin/copima-cli-crawler

# macOS (ARM)
wget https://github.com/pdiegmann/copima-cli-crawler/releases/latest/download/copima-cli-crawler-macos-arm64
chmod +x copima-cli-crawler-macos-arm64
sudo mv copima-cli-crawler-macos-arm64 /usr/local/bin/copima-cli-crawler

# Windows (PowerShell)
Invoke-WebRequest -Uri "https://github.com/pdiegmann/copima-cli-crawler/releases/latest/download/copima-cli-crawler-windows-x64.exe" -OutFile "copima-cli-crawler.exe"
# Add to PATH or move to a directory in PATH
```

Verify installation:
```bash
copima-cli-crawler --version
```

### Method 2: Install via npm (Recommended for developers)

```bash
# Global installation
npm install -g copima-cli-crawler

# Verify installation
copima-cli-crawler --version
```

### Method 3: Build from Source

#### Prerequisites for Building

- **Git**: For cloning the repository
- **Bun 1.2.8+**: Preferred runtime
- **Node.js 20+**: Alternative to Bun
- **TypeScript**: Included as dev dependency

#### Build Steps

```bash
# 1. Clone the repository
git clone https://github.com/pdiegmann/copima-cli-crawler.git
cd copima-cli-crawler

# 2. Install dependencies
# Using Bun (recommended)
bun install

# OR using npm
npm install

# 3. Build the project
# Using Bun
bun run build

# OR using npm
npm run build

# 4. Test the build
node dist/cli.js --version

# 5. (Optional) Create platform-specific executables
bun run build:executables

# 6. (Optional) Link for local development
npm link
```

#### Verify Build

```bash
# If you used npm link
copima-cli-crawler --version

# Or run directly
node dist/cli.js --version
```

### Method 4: Docker Container (Coming Soon)

Docker support is planned for future releases.

## Post-Installation Setup

### 1. Verify Installation

```bash
# Check version
copima-cli-crawler --version

# View help
copima-cli-crawler --help

# Test basic command
copima-cli-crawler config:show
```

### 2. Configure Shell Completion (Optional)

Enable tab completion for your shell:

```bash
# For Bash
copima-cli-crawler install --bash
source ~/.bashrc

# For Zsh (add to ~/.zshrc)
copima-cli-crawler install --bash
source ~/.zshrc
```

### 3. Create Configuration Directory

```bash
# Create user config directory
mkdir -p ~/.config/copima

# Create local config directory (optional)
mkdir -p ./.copima
```

### 4. Set Environment Variables (Optional)

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# GitLab instance (optional)
export GITLAB_HOST="https://gitlab.example.com"

# Personal Access Token (if using PAT auth)
export GITLAB_TOKEN="your-pat-token"

# Disable SSL verification (for self-signed certs)
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Default output directory
export COPIMA_OUTPUT_DIR="./output"

# Logging level
export COPIMA_LOG_LEVEL="info"
```

## Platform-Specific Notes

### Linux

**Permissions**: On Linux, you may need to use `sudo` to install globally:
```bash
sudo npm install -g copima-cli-crawler
```

**AppImage Support** (future): AppImage builds are planned for easier Linux distribution.

### macOS

**Security**: On macOS, you may need to allow the executable:
```bash
# Remove quarantine attribute
xattr -d com.apple.quarantine copima-cli-crawler

# Or go to System Preferences > Security & Privacy and allow
```

**Homebrew** (future): Homebrew formula is planned for easier installation.

### Windows

**PowerShell**: Use PowerShell instead of Command Prompt for better compatibility.

**Execution Policy**: You may need to adjust execution policy:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**PATH Setup**: Add the installation directory to your PATH:
```powershell
# Add to PATH temporarily
$env:Path += ";C:\path\to\copima-cli-crawler"

# Add to PATH permanently (System Properties > Environment Variables)
```

**Windows Subsystem for Linux (WSL)**: The Linux installation method works in WSL.

## Troubleshooting Installation

### "command not found" after installation

**Problem**: Shell can't find the executable.

**Solutions**:
```bash
# Reload shell configuration
source ~/.bashrc  # or ~/.zshrc

# Check if install location is in PATH
echo $PATH

# Find where npm installs global packages
npm config get prefix

# Add npm global bin to PATH
export PATH="$(npm config get prefix)/bin:$PATH"
```

### Permission Errors

**Problem**: "EACCES: permission denied"

**Solutions**:
```bash
# Fix npm permissions (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Or use sudo (not recommended)
sudo npm install -g copima-cli-crawler
```

### Module Not Found Errors

**Problem**: "Cannot find module '@stricli/core'"

**Solutions**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
npm install
```

### Build Errors

**Problem**: TypeScript compilation errors

**Solutions**:
```bash
# Ensure TypeScript is installed
npm install -g typescript

# Check Node.js version
node --version  # Should be 20+

# Clean and rebuild
npm run clean
npm run build
```

### Bun-Specific Issues

**Problem**: "bun: command not found"

**Solution**: Install Bun:
```bash
# Linux/macOS
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# Verify
bun --version
```

## Uninstallation

### Remove Global Installation

```bash
# If installed via npm
npm uninstall -g copima-cli-crawler

# If installed as executable
sudo rm /usr/local/bin/copima-cli-crawler

# Remove configuration
rm -rf ~/.config/copima

# Remove shell completion
copima-cli-crawler uninstall --bash
```

### Remove Build from Source

```bash
# Unlink if linked
npm unlink

# Remove repository
rm -rf /path/to/copima-cli-crawler
```

## Updating

### Update npm Package

```bash
# Update to latest version
npm update -g copima-cli-crawler

# Or reinstall
npm uninstall -g copima-cli-crawler
npm install -g copima-cli-crawler
```

### Update from Source

```bash
cd /path/to/copima-cli-crawler

# Pull latest changes
git pull origin main

# Reinstall dependencies
npm install

# Rebuild
npm run build
```

## Verification Checklist

After installation, verify:

- [ ] Command is available: `copima-cli-crawler --version`
- [ ] Help displays correctly: `copima-cli-crawler --help`
- [ ] Configuration directory exists: `~/.config/copima`
- [ ] Can create test config: `copima-cli-crawler setup`
- [ ] Environment variables set (if applicable)
- [ ] Shell completion works (if installed)

## Next Steps

After successful installation:

1. **[Quick Start](Quick-Start.md)** - Run your first crawl
2. **[First Crawl](First-Crawl.md)** - Detailed walkthrough
3. **[Authentication Setup](../guides/Authentication-Setup.md)** - Configure authentication
4. **[Configuration Reference](../guides/Configuration-Reference.md)** - Learn all options

## Getting Help

If you encounter issues not covered here:

1. Check the [Troubleshooting Guide](../troubleshooting/Common-Issues.md)
2. Search [existing issues](https://github.com/pdiegmann/copima-cli-crawler/issues)
3. Create a [new issue](https://github.com/pdiegmann/copima-cli-crawler/issues/new)
4. Join the community discussions

---

**Installation Guide Version**: 1.0.0  
**Last Updated**: 2025-10-19
