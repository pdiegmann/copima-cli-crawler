# Codacy Configuration

## Overview

This document explains the Codacy configuration (`.codacy.yml`) and why it's needed for this project.

## The Problem

Codacy's ESLint analysis uses a Docker container (`codacy/codacy-eslint9:0.0.48`) that comes with pre-installed ESLint plugins, including `eslint-plugin-angular`. This plugin is incompatible with ESLint 9 because it uses deprecated APIs like `context.getScope()`.

When Codacy attempted to analyze our codebase, it failed with the following error:

```
TypeError: context.getScope is not a function
Occurred while linting /src/build.config.ts:19
Rule: "angular/no-directive-replace"
```

This occurred even though our project:
- Does not use Angular
- Does not include `eslint-plugin-angular` in dependencies
- Uses ESLint 9 flat config (`eslint.config.ts`) with modern plugins

## The Solution

We've disabled Codacy's ESLint engine in `.codacy.yml` because:

1. **Incompatibility**: Codacy's Docker image includes plugins that don't work with ESLint 9
2. **Not Needed**: We already run ESLint locally with our custom configuration
3. **Other Tools**: Codacy still provides value through other engines (duplication detection, metrics)

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
- Disables the ESLint engine
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

If Codacy updates their ESLint Docker image to be compatible with ESLint 9 and removes incompatible plugins, we could re-enable the ESLint engine by updating `.codacy.yml`:

```yaml
engines:
  eslint:
    enabled: true
    # Specify which files to analyze
    exclude_paths:
      - "node_modules/**"
      - "dist/**"
```

However, this would require:
1. Codacy to update `codacy-eslint9` to remove or update `eslint-plugin-angular`
2. Verification that Codacy correctly recognizes ESLint 9 flat config format
3. Testing to ensure no other plugin conflicts exist

## References

- [Codacy ESLint Engine Documentation](https://docs.codacy.com/repositories-configure/configuring-code-patterns/#eslint)
- [ESLint 9 Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [eslint-plugin-angular Issue with ESLint 9](https://github.com/Gillespie59/eslint-plugin-angular/issues/1106)
