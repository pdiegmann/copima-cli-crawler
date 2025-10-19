# Release Process

This document describes how to create a new release of the Copima CLI Crawler.

## Prerequisites

- Bun runtime installed (>= 1.2.8)
- Git repository access with push permissions
- All tests passing
- All changes committed to main branch

## Release Steps

### 1. Update Version Number

Update the version in `package.json`:

```json
{
  "version": "X.Y.Z"
}
```

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (X): Breaking changes
- **MINOR** (Y): New features (backward compatible)
- **PATCH** (Z): Bug fixes (backward compatible)

### 2. Update CHANGELOG.md

Add a new section for the release with:
- Release version and date
- Added features
- Changed behavior
- Fixed bugs
- Deprecated features
- Removed features
- Security updates

### 3. Build and Test Locally

Build the executables locally to verify everything works:

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build executables for all platforms
bun run build:executables

# Or use the release script
bun run release
```

This will create executables for:
- Windows x64 (`dist/copima-cli-windows.exe`)
- macOS Intel x64 (`dist/copima-cli-macos-x64`)
- macOS Apple Silicon ARM64 (`dist/copima-cli-macos-arm64`)

### 4. Commit and Push Changes

```bash
git add package.json CHANGELOG.md
git commit -m "Release v X.Y.Z"
git push origin main
```

### 5. Create and Push Git Tag

Create a version tag and push it to trigger the automated release workflow:

```bash
# Create the tag
git tag vX.Y.Z

# Push the tag
git push origin vX.Y.Z
```

**Important**: The tag must follow the format `vX.Y.Z` (e.g., `v0.2.0`) to trigger the release workflow.

### 6. Automated GitHub Actions Workflow

When you push the tag, GitHub Actions will automatically:

1. Checkout the code
2. Setup Bun runtime
3. Install dependencies
4. Run tests
5. Build executables for all platforms:
   - Windows x64
   - macOS Intel x64
   - macOS Apple Silicon ARM64
6. Create checksums for all executables
7. Create a GitHub Release with:
   - Release notes
   - Download links for all platforms
   - Installation instructions
   - Checksum file

### 7. Verify the Release

1. Go to the [Releases page](https://github.com/pdiegmann/copima-cli-crawler/releases)
2. Verify the new release appears
3. Check that all three executables are attached
4. Verify the checksums file is present
5. Test download one of the executables and verify it runs

## Release Workflow Configuration

The release workflow is configured in `.github/workflows/release.yml`.

**Trigger**: Pushing a tag matching `v*.*.*` pattern

**Platform Support**:
- ✅ Windows x64
- ✅ macOS Intel (x64)
- ✅ macOS Apple Silicon (ARM64)

## Manual Release (Alternative)

If you need to create a release manually without GitHub Actions:

1. Build executables locally:
   ```bash
   bun run build:executables
   ```

2. Create checksums:
   ```bash
   cd dist
   sha256sum * > checksums.txt
   ```

3. Create a new release on GitHub:
   - Go to Releases → Draft a new release
   - Choose the tag or create a new one
   - Upload the executables and checksums.txt
   - Add release notes from CHANGELOG.md
   - Publish the release

## Troubleshooting

### Build Fails
- Ensure Bun is installed and up to date
- Check TypeScript compilation: `bun run prebuild`
- Verify all tests pass: `bun test`

### Tag Already Exists
If you need to recreate a tag:
```bash
# Delete local tag
git tag -d vX.Y.Z

# Delete remote tag
git push origin :refs/tags/vX.Y.Z

# Recreate and push
git tag vX.Y.Z
git push origin vX.Y.Z
```

### GitHub Actions Fails
- Check the Actions tab for detailed logs
- Verify the workflow file is correct
- Ensure repository has the necessary permissions

## Version History

See [CHANGELOG.md](CHANGELOG.md) for the complete version history and release notes.
