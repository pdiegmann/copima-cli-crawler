# Release Process Documentation

This document describes how to create and manage releases for the Copima CLI Crawler.

## Overview

The project uses Bun's built-in compilation features to create standalone executables for:

- Windows (x64)
- macOS (Intel x64)
- macOS (Apple Silicon ARM64)

## Manual Release Process

### Prerequisites

- Bun runtime installed
- Git repository with appropriate permissions
- All changes committed and tests passing

### Step-by-Step Release

1. **Update Version**

   ```bash
   # Update version in package.json
   npm version patch  # or minor/major
   ```

2. **Build Executables**

   ```bash
   bun run build:executables
   ```

3. **Test Executables Locally**

   ```bash
   # Test all executables
   bun run build:test

   # Manual test on macOS
   chmod +x dist/copima-cli-macos-arm64
   ./dist/copima-cli-macos-arm64 --help
   ```

4. **Create Release**

   ```bash
   bun run release
   ```

5. **Create Git Tag and Push**
   ```bash
   git add .
   git commit -m "Release v1.x.x"
   git tag v1.x.x
   git push origin main
   git push origin v1.x.x
   ```

## Automated Release Process

### GitHub Actions

The repository includes three GitHub Actions workflows:

#### 1. Build and Test (`build-test.yml`)

- Triggers on pushes to `main` and `develop` branches
- Triggers on pull requests to `main`
- Runs tests and builds executables
- Uploads build artifacts for verification

#### 2. Release (`release.yml`)

- Triggers on semver git tags matching `v[0-9]+.[0-9]+.[0-9]+` pattern
- Supports pre-release tags like `v1.0.0-alpha.1`
- Builds executables for all platforms
- Creates GitHub release with binaries
- Generates checksums for verification

#### 3. Nightly Build (`nightly.yml`)

- Manually triggered via GitHub Actions UI
- Builds from main branch with nightly suffix
- Creates pre-release with timestamp
- Option to build without creating release (artifacts only)
- Automatically replaces previous nightly releases

### Automated Release Steps

1. **Prepare Release**

   ```bash
   # Update version
   npm version patch

   # Commit changes
   git add .
   git commit -m "Bump version to v1.x.x"
   git push origin main
   ```

2. **Trigger Release**

   ```bash
   # Create and push tag
   git tag v1.x.x
   git push origin v1.x.x
   ```

3. **Monitor Release**
   - Check GitHub Actions for build status
   - Verify release is created with all assets
   - Test download links work correctly

## Build Configuration

### Build Files

- `build.config.ts` - Main build configuration
- `scripts/build.ts` - Build script for local development
- `scripts/release.ts` - Complete release process script
- `scripts/test-executables.ts` - Executable testing script

### Output Files

The build process creates these files in the `dist/` directory:

- `copima-cli-windows.exe` - Windows executable (~115MB)
- `copima-cli-macos-x64` - macOS Intel executable (~64MB)
- `copima-cli-macos-arm64` - macOS Apple Silicon executable (~58MB)

### Build Features

- **Minification**: Code is minified for smaller file size
- **Single Binary**: All dependencies bundled into executable
- **Cross-platform**: Builds for Windows and macOS from any platform
- **No Runtime Required**: Executables run without Node.js or Bun installed

## Distribution

### GitHub Releases

Each release includes:

- Windows executable (.exe)
- macOS executables (Intel and Apple Silicon)
- Checksums file for verification
- Installation instructions
- Release notes

### Installation Instructions

#### Windows

```bash
# Download
curl -L -o copima-cli.exe https://github.com/pdiegmann/copima-cli-crawler/releases/latest/download/copima-cli-windows.exe

# Run
./copima-cli.exe --help
```

#### macOS

```bash
# Intel Macs
curl -L -o copima-cli https://github.com/pdiegmann/copima-cli-crawler/releases/latest/download/copima-cli-macos-x64
chmod +x copima-cli
./copima-cli --help

# Apple Silicon Macs
curl -L -o copima-cli https://github.com/pdiegmann/copima-cli-crawler/releases/latest/download/copima-cli-macos-arm64
chmod +x copima-cli
./copima-cli --help
```

## Available Scripts

| Script                      | Description              |
| --------------------------- | ------------------------ |
| `bun run build:executables` | Build all executables    |
| `bun run build:clean`       | Clean and build          |
| `bun run build:test`        | Test built executables   |
| `bun run release`           | Complete release process |

## Verification

### Checksum Verification

Each release includes a `checksums.txt` file:

```bash
# Download checksums
curl -L -O https://github.com/pdiegmann/copima-cli-crawler/releases/latest/download/checksums.txt

# Verify file integrity
sha256sum -c checksums.txt
```

### Smoke Testing

Basic functionality test for each platform:

```bash
# Test help command
./copima-cli --help

# Test version
./copima-cli --version

# Test basic command
./copima-cli config:show --help
```

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Ensure Bun is updated to latest version
   - Check TypeScript compilation errors
   - Verify all dependencies are installed

2. **Executable Won't Run**
   - Check file permissions (chmod +x on macOS/Linux)
   - Verify architecture matches system
   - Check for antivirus blocking (Windows)

3. **GitHub Actions Fail**
   - Check repository secrets and permissions
   - Verify workflow files syntax
   - Check Bun version compatibility

### Debug Commands

```bash
# Check build output
bun run build:executables
ls -la dist/

# Test specific platform build
bun build --compile --target=bun-darwin-arm64 ./src/bin/cli.ts

# Check file type
file dist/copima-cli-*

# Test executables
bun run build:test
```

## Security Considerations

1. **Code Signing**: Consider adding code signing for production releases
2. **Checksums**: Always provide and verify checksums
3. **Permissions**: Limit GitHub Actions permissions to minimum required
4. **Dependencies**: Regularly audit and update dependencies

## Future Enhancements

- [ ] Linux executable support
- [ ] Code signing for Windows and macOS
- [ ] Package managers (Homebrew, Chocolatey, etc.)
- [ ] Auto-update functionality
- [ ] Docker image releases

## Quick Reference

### For Maintainers (Automated)

```bash
npm version patch
git push origin main --follow-tags
```

### For Development (Manual)

```bash
bun run build:executables
bun run build:test
bun run release
```

The automated process takes about 3-5 minutes and creates a complete GitHub release with download links and installation instructions.

## Nightly Builds

### Manual Trigger

Nightly builds can be manually triggered from the GitHub Actions UI:

1. Go to **Actions** tab in GitHub repository
2. Select **Nightly Build** workflow
3. Click **Run workflow**
4. Choose options:
   - **Create a pre-release**: Creates a GitHub pre-release (default: true)
   - **Custom tag**: Override default `nightly-YYYYMMDD` tag format

### Nightly Build Features

- **Automatic Cleanup**: Replaces previous nightly releases
- **Pre-release Status**: Marked as pre-release to distinguish from stable releases
- **Timestamp Identification**: Includes build timestamp in release name
- **Artifact Option**: Can build without creating release (7-day retention)

### Nightly Installation

```bash
# Windows
curl -L -o copima-cli-nightly.exe https://github.com/pdiegmann/copima-cli-crawler/releases/latest/download/copima-cli-windows-nightly.exe

# macOS Intel
curl -L -o copima-cli-nightly https://github.com/pdiegmann/copima-cli-crawler/releases/latest/download/copima-cli-macos-x64-nightly
chmod +x copima-cli-nightly

# macOS Apple Silicon
curl -L -o copima-cli-nightly https://github.com/pdiegmann/copima-cli-crawler/releases/latest/download/copima-cli-macos-arm64-nightly
chmod +x copima-cli-nightly
```

### When to Use Nightly Builds

- Testing latest features before official release
- Getting bug fixes that haven't been released yet
- Development and testing environments
- **Not recommended for production use**
