# Release Process

## Overview

The release process is automated via GitHub Actions when a version tag is pushed.

## Triggering a Release

1. **Local Testing**
   ```bash
   # Build and test locally
   bun run build:executables
   bun run build:test
   ```

2. **Create and Push Tag**
   ```bash
   # Create a new version (patch/minor/major)
   bun run release patch

   # Or use current version without bumping
   bun run release

   # Commit and push
   git add .
   git commit -m "chore: prepare release"
   git push origin main

   # Create and push tag
   git tag v0.2.6
   git push origin v0.2.6
   ```

## GitHub Actions Workflow

The release workflow consists of three jobs:

### 1. Test Job (Ubuntu)
- Runs test suite with coverage
- Uploads coverage to Codecov
- Must pass before building

### 2. Build Job (macOS ARM64)
Builds all executables on a single macOS ARM64 runner:

| Platform | Target | Output |
|----------|--------|--------|
| macOS ARM64 | `bun-darwin-arm64` | `copima-cli-macos-arm64` |
| macOS Intel | `bun-darwin-x64` | `copima-cli-macos-x64` |
| Windows | `bun-windows-x64` | `copima-cli-windows.exe` |

**Key Points:**
- All binaries built on `macos-latest` (Apple Silicon)
- macOS binaries are ad-hoc signed with `codesign -s -` to prevent Gatekeeper issues
- Cross-compilation from macOS ARM64 works for Windows and macOS Intel
- Simpler and faster than matrix builds across multiple platforms

### 3. Release Job (Ubuntu)
- Downloads all build artifacts
- Updates CHANGELOG.md
- Creates checksums
- Publishes GitHub release with all binaries

## macOS Code Signing

### Why Build on macOS?

Cross-compiling macOS binaries on Linux produces unsigned binaries that macOS Gatekeeper blocks with:
```
"copima-cli-macos-x64" is damaged and can't be opened
```

Building on a macOS runner allows us to sign the binaries, which prevents this issue. Fortunately, we can cross-compile both Windows and macOS Intel binaries from a single macOS ARM64 runner.

### Ad-Hoc Signing

The workflow uses ad-hoc signing (`codesign -s -`) which:
- ✅ Allows binaries to run on macOS
- ✅ Works without developer certificates
- ✅ Sufficient for open-source CLI tools
- ⚠️ Still shows "unidentified developer" warning (user must approve)

### Full Developer Signing (Optional)

For production releases without warnings, you would need:
1. Apple Developer account ($99/year)
2. Developer ID certificate stored in GitHub secrets
3. Notarization with Apple

This is not currently implemented as ad-hoc signing is sufficient for this use case.

## Testing Releases

### Local Testing
```bash
# Build executables
bun run build:executables

# Test on local machine
./dist/copima-cli-macos-arm64 --help  # Apple Silicon
./dist/copima-cli-macos-x64 --help     # Intel Mac
```

### Testing GitHub Release
```bash
# Download from latest release
curl -L -o copima-cli https://github.com/pdiegmann/copima-cli-crawler/releases/latest/download/copima-cli-macos-arm64

# Make executable
chmod +x copima-cli

# Run (may show security warning on first run)
./copima-cli --help

# If security warning appears:
# Go to System Settings > Privacy & Security > Allow anyway
```

## Troubleshooting

### "Damaged" Error on macOS

If you get this error:
```
"copima-cli" is damaged and can't be opened
```

**Cause:** Binary wasn't properly signed during build

**Solution:**
1. Ensure GitHub Actions built on native macOS runner
2. Verify `codesign` step ran successfully in build logs
3. Check artifact was uploaded correctly

### Permission Denied

```bash
chmod +x copima-cli
```

### Unidentified Developer Warning

This is expected with ad-hoc signing:
1. Try to run the binary
2. macOS will block it
3. Go to System Settings > Privacy & Security
4. Click "Allow anyway" next to the blocked app
5. Run again and click "Open"

## Manual Release Process

If automated release fails:

1. **Build locally on macOS**
   ```bash
   # Build all binaries (on macOS)
   mkdir -p dist

   # macOS ARM64
   bun build --compile --target=bun-darwin-arm64 --outfile=dist/copima-cli-macos-arm64 ./src/bin/cli.ts
   codesign -s - --force dist/copima-cli-macos-arm64

   # macOS Intel (cross-compile)
   bun build --compile --target=bun-darwin-x64 --outfile=dist/copima-cli-macos-x64 ./src/bin/cli.ts
   codesign -s - --force dist/copima-cli-macos-x64

   # Windows (cross-compile)
   bun build --compile --target=bun-windows-x64 --outfile=dist/copima-cli-windows.exe ./src/bin/cli.ts
   ```

2. **Create checksums**
   ```bash
   sha256sum copima-cli-* > checksums.txt
   ```

3. **Create GitHub release manually**
   - Go to repository releases page
   - Click "Draft a new release"
   - Choose tag version
   - Upload all binaries and checksums.txt
   - Publish release
