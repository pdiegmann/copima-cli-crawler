# Codacy Configuration

## Overview

This document explains the Codacy configuration (`.codacy.yml`) and why it's needed for this project.

## The Problem

Codacy's static analysis uses multiple engines to check code quality:

1. **ESLint Engine**: Uses a Docker container (`codacy/codacy-eslint9:0.0.48`) that comes with pre-installed ESLint plugins, including `eslint-plugin-angular`. This plugin is incompatible with ESLint 9 because it uses deprecated APIs like `context.getScope()`.

2. **PMD JavaScript Engine**: Checks for outdated JavaScript patterns (ES5, Flow type system) that are not applicable to modern TypeScript projects using ES2015+.

When Codacy attempted to analyze our codebase, it raised numerous false positives about:
- "ES2015 modules are forbidden"
- "ES2020 features are forbidden"  
- "Flow type declarations required"
- "Arrow functions are forbidden"

These warnings are inappropriate for a modern TypeScript project that uses ES2015+ features and TypeScript (not Flow) for type checking.

## The Solution

We've disabled both Codacy's ESLint and PMD JavaScript engines in `.codacy.yml` because:

1. **ESLint Incompatibility**: Codacy's Docker image includes plugins that don't work with ESLint 9
2. **PMD False Positives**: PMD checks for outdated ES5/Flow patterns incompatible with modern TypeScript
3. **Not Needed**: We already run ESLint locally with our custom TypeScript-focused configuration
4. **Other Tools**: Codacy still provides value through other engines (duplication detection, metrics)

This is a **TypeScript project using ES2015+**, not a Flow-based or ES5 JavaScript project. The PMD JavaScript rules are designed for legacy codebases and generate hundreds of false positives on modern code.

### Alternative Approaches Considered

1. **Use Codacy's ESLint with our config** - Not possible because Codacy's Docker image pre-loads incompatible plugins
2. **Update Codacy's ESLint version** - Not possible; we don't control Codacy's Docker images
3. **Ignore specific files** - Doesn't solve the root issue; the plugin would still fail on other files

## Local Linting

ESLint is still run locally and in CI/CD pipelines using our custom configuration:

```bash
# Run linting locally
bun run lint

# Run linting with auto-fix
bun run lint:fix
```

Our ESLint configuration (`eslint.config.ts`) uses:
- ESLint 9 flat config format
- TypeScript-ESLint for TypeScript support
- SonarJS for code quality rules
- Prettier for code formatting
- Unicorn and Stylistic plugins for best practices

## Configuration Files

### `.codacy.yml`
Main Codacy configuration that:
- Disables the ESLint engine (incompatible plugins)
- Disables the PMD JavaScript engine (checks for outdated ES5/Flow patterns)
- Enables duplication detection
- Enables metrics analysis
- Excludes test files, build artifacts, and dependencies

### `.dcignore`
Additional exclusions specifically for Codacy's "diff coverage" feature:
- Build scripts (`build.config.ts`, `scripts/`)
- Test files
- Build artifacts (`dist/`)
- Dependencies (`node_modules/`)

## Codacy Analysis

Even with ESLint disabled, Codacy still provides value through:

1. **Duplication Detection**: Identifies duplicate code across the repository
2. **Metrics Analysis**: Tracks code complexity, lines of code, etc.
3. **Coverage Tracking**: Monitors test coverage trends (when integrated with test reports)

## Future Considerations

If Codacy updates their analysis engines to properly support modern TypeScript projects, we could re-enable them:

**For ESLint:**
- Codacy updates `codacy-eslint9` to remove or update `eslint-plugin-angular`
- Verify Codacy correctly recognizes ESLint 9 flat config format
- Test to ensure no other plugin conflicts exist

**For PMD JavaScript:**
- Codacy adds modern JavaScript/TypeScript rule sets that understand ES2015+ and TypeScript
- Rules should be appropriate for TypeScript projects, not Flow or ES5

Until then, we rely on:
1. Local ESLint with TypeScript-ESLint (comprehensive, modern rule set)
2. Codacy's duplication and metrics engines (still valuable)
3. CodeQL security scanning (separate tool, very effective)

## References

- [Codacy ESLint Engine Documentation](https://docs.codacy.com/repositories-configure/configuring-code-patterns/#eslint)
- [ESLint 9 Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [eslint-plugin-angular Issue with ESLint 9](https://github.com/Gillespie59/eslint-plugin-angular/issues/1106)
