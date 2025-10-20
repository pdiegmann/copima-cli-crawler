# Development Setup

Guide for setting up a development environment for COPIMA CLI Crawler.

## Prerequisites

### Required Software

- **Node.js** 20.0 or higher
- **Bun** 1.2.8 or higher (recommended)
- **Git** for version control
- **Code editor** (VSCode recommended)

### Verify Installation

```bash
node --version   # Should be 20+
bun --version    # Should be 1.2.8+
git --version
```

## Clone the Repository

```bash
git clone https://github.com/pdiegmann/copima-cli-crawler.git
cd copima-cli-crawler
```

## Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install
```

This installs all dependencies listed in `package.json`.

## Project Structure

```
copima-cli-crawler/
├── src/                  # Source code
│   ├── api/             # GraphQL and REST clients
│   ├── auth/            # Authentication system
│   ├── callback/        # Callback system
│   ├── commands/        # CLI commands
│   ├── config/          # Configuration system
│   ├── logging/         # Logging utilities
│   ├── reporting/       # Progress reporting
│   ├── resume/          # Resume capabilities
│   ├── storage/         # Storage system
│   ├── types/           # TypeScript types
│   ├── app.ts           # Application setup
│   └── bin/cli.ts       # CLI entry point
├── docs/                # Documentation
├── examples/            # Example configurations
├── scripts/             # Build and utility scripts
├── wiki/                # Wiki documentation
├── jest.config.ts       # Jest configuration
├── tsconfig.json        # TypeScript configuration
├── eslint.config.ts     # ESLint configuration
└── package.json         # Package metadata
```

## Development Commands

### Run in Development Mode

```bash
# Run CLI directly with Bun
bun run dev

# With specific command
bun run dev crawl --help

# Disable SSL verification (for self-signed certs)
bun run dev:auth
```

### Build

```bash
# TypeScript compilation
bun run prebuild

# Bundle with tsup
bun run build

# Build platform-specific executables
bun run build:executables

# Clean and rebuild
bun run build:clean
```

### Testing

```bash
# Run all tests (Jest)
bun run test

# Watch mode
bun run test:watch

# Coverage report
bun run test:coverage

# Bun native tests
bun run test:bun

# E2E tests
bun run test:e2e
bun run test:e2e:basic
bun run test:e2e:suite
```

### Linting and Formatting

```bash
# Lint code
bun run lint

# Lint and auto-fix
bun run lint:fix

# Format is handled by ESLint + Prettier
```

### Code Generation

```bash
# Generate GraphQL types from schema
bun run codegen
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/my-feature
```

### 2. Make Changes

Edit files in `src/` directory.

### 3. Test Your Changes

```bash
# Run tests
bun run test

# Run lint
bun run lint

# Test CLI locally
bun run dev <command>
```

### 4. Build

```bash
bun run build
```

### 5. Commit Changes

```bash
git add .
git commit -m "Description of changes"
```

### 6. Push and Create PR

```bash
git push origin feature/my-feature
```

Then create a pull request on GitHub.

## IDE Setup

### VSCode (Recommended)

**Recommended Extensions:**

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- GraphQL
- YAML

**Settings (.vscode/settings.json):**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "eslint.enable": true
}
```

### WebStorm / IntelliJ

1. Open project
2. Enable TypeScript support
3. Configure ESLint and Prettier
4. Set Node.js interpreter

## Debugging

### VSCode Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "runtimeExecutable": "bun",
      "runtimeArgs": ["run", "src/bin/cli.ts"],
      "args": ["crawl", "--help"],
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeExecutable": "bun",
      "runtimeArgs": ["test"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Debug with Node Inspector

```bash
node --inspect-brk dist/cli.js crawl --help
```

Open `chrome://inspect` in Chrome.

## Common Development Tasks

### Add a New Command

1. Create file in `src/commands/<category>/`
2. Define command using Stricli
3. Register in `src/app.ts`
4. Add tests
5. Update documentation

### Add a New API Method

1. Add method to `GitLabGraphQLClient` or `GitLabRestClient`
2. Add query to `src/api/queries/`
3. Add types if needed
4. Write tests
5. Update API documentation

### Modify Storage System

1. Edit `src/storage/*`
2. Ensure backward compatibility
3. Update tests
4. Update documentation

## Troubleshooting

### "Cannot find module"

```bash
rm -rf node_modules bun.lock
bun install
```

### TypeScript Errors

```bash
bun run prebuild
```

### Tests Failing

```bash
# Clear Jest cache
bun run test --clearCache

# Rebuild
bun run build
```

### Bun Issues

Update to latest Bun:

```bash
curl -fsSL https://bun.sh/install | bash
```

## Environment Variables

For development:

```bash
# Create .env file
cat > .env << 'EOF'
GITLAB_HOST=https://gitlab.example.com
GITLAB_TOKEN=your-dev-token
NODE_TLS_REJECT_UNAUTHORIZED=0
COPIMA_LOG_LEVEL=debug
EOF

# Load in terminal
source .env
```

## Next Steps

- Read [Project Structure](Project-Structure.md)
- Review [Code Style](Code-Style.md)
- Check [Contributing Guidelines](Contributing.md)
- Explore [Testing Guide](Testing.md)

---

**Last Updated**: 2025-10-20
