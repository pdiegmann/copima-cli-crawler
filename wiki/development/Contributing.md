# Contributing Guidelines

Guidelines for contributing to COPIMA CLI Crawler.

## Welcome Contributors!

We welcome contributions of all kinds: bug reports, feature requests, documentation improvements, and code contributions.

## Ways to Contribute

### 1. Report Bugs

Found a bug? [Create an issue](https://github.com/pdiegmann/copima-cli-crawler/issues/new).

**Include:**
- COPIMA version (`copima-cli-crawler --version`)
- GitLab version
- Steps to reproduce
- Expected vs actual behavior
- Error messages and logs

### 2. Suggest Features

Have an idea? [Open a feature request](https://github.com/pdiegmann/copima-cli-crawler/issues/new).

**Describe:**
- What you want to accomplish
- Why it's useful
- How it should work
- Possible alternatives

### 3. Improve Documentation

Documentation improvements are always welcome:

- Fix typos or unclear explanations
- Add examples
- Expand guides
- Translate content

### 4. Contribute Code

See [Development Setup](Setup.md) to get started.

## Code Contribution Process

### 1. Find or Create an Issue

- Check [existing issues](https://github.com/pdiegmann/copima-cli-crawler/issues)
- Comment that you'd like to work on it
- Wait for maintainer feedback

### 2. Fork and Clone

```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR_USERNAME/copima-cli-crawler.git
cd copima-cli-crawler
git remote add upstream https://github.com/pdiegmann/copima-cli-crawler.git
```

### 3. Create a Branch

```bash
git checkout -b feature/my-feature
# or
git checkout -b fix/bug-description
```

**Branch Naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Test additions

### 4. Make Changes

Follow our [Code Style](Code-Style.md) guidelines.

**Best Practices:**
- Make small, focused commits
- Write clear commit messages
- Add tests for new features
- Update documentation
- Keep changes minimal

### 5. Test Your Changes

```bash
# Run tests
bun run test

# Run linter
bun run lint

# Test CLI
bun run dev <command>

# Run E2E tests
bun run test:e2e:basic
```

### 6. Commit

```bash
git add .
git commit -m "Brief description of changes"
```

**Commit Message Format:**

```
type: Brief description (50 chars or less)

More detailed explanation if needed. Wrap at 72 characters.

- List changes if helpful
- Reference issues: Fixes #123
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting, no code change
- `refactor:` - Code restructuring
- `test:` - Test additions
- `chore:` - Maintenance

### 7. Push and Create PR

```bash
git push origin feature/my-feature
```

Then create a pull request on GitHub.

## Pull Request Guidelines

### PR Title

Use the commit message format:

```
feat: Add support for custom rate limits
fix: Handle expired OAuth2 tokens correctly
docs: Add authentication troubleshooting guide
```

### PR Description

Include:

```markdown
## Description
Brief summary of changes

## Motivation
Why this change is needed

## Changes
- List of changes
- Bullet points

## Testing
How you tested this

## Checklist
- [ ] Tests pass
- [ ] Linter passes
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (if applicable)
```

### PR Review Process

1. Automated checks run (tests, lint)
2. Maintainer reviews code
3. Feedback addressed
4. Approved and merged

**Review Timeline:**
- Small PRs: 1-3 days
- Large PRs: 1 week
- Documentation: 1-2 days

## Code Standards

### Mandatory Libraries

Use these libraries (don't add alternatives):

- **Stricli** - CLI framework
- **Winston** - Logging
- **js-yaml** - YAML handling
- **picocolors** - Terminal colors
- **treeify** - Tree formatting

### Don't Duplicate Code

- Extend existing files, don't create variants
- Reuse existing functions
- Check if library exists before implementing

### Keep It Simple

- Prefer simple solutions
- Avoid over-engineering
- Write readable code

## Testing Requirements

### Test Coverage

- All new features need tests
- Bug fixes need regression tests
- Aim for >80% coverage

### Test Types

```bash
# Unit tests (required)
src/myFeature.test.ts

# Integration tests (if applicable)
src/__tests__/integration/

# E2E tests (for major features)
examples/test-configs/
```

### Writing Tests

```typescript
import { describe, it, expect } from '@jest/globals';

describe('MyFeature', () => {
  it('should do something correctly', () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });
  
  it('should handle errors gracefully', () => {
    expect(() => myFunction(invalid)).toThrow();
  });
});
```

## Documentation Requirements

### Code Documentation

```typescript
/**
 * Brief description of function.
 * 
 * @param param1 - Description of param1
 * @param param2 - Description of param2
 * @returns Description of return value
 * 
 * @example
 * ```typescript
 * const result = myFunction('value');
 * ```
 */
export function myFunction(param1: string, param2: number): boolean {
  // Implementation
}
```

### User Documentation

Update these when relevant:

- `README.md` - For user-facing changes
- `wiki/` - For detailed documentation
- `CHANGELOG.md` - For release notes
- Code comments - For complex logic

## Security Guidelines

### Never Commit

- Tokens or credentials
- API keys
- Private keys
- User data

### Review for Security

- Input validation
- Secrets handling
- File operations
- Network requests

## Code Review Checklist

Before submitting:

- [ ] Code follows style guide
- [ ] Tests added and passing
- [ ] Linter passes
- [ ] Documentation updated
- [ ] CHANGELOG updated (if needed)
- [ ] Commit messages clear
- [ ] No debug code left in
- [ ] No commented-out code
- [ ] No console.log statements
- [ ] Security reviewed

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Issues**: Check existing issues first
- **Chat**: Comment on related issue
- **Email**: Contact maintainers

## Recognition

Contributors are recognized in:

- GitHub Contributors page
- CHANGELOG.md (for significant contributions)
- Release notes

Thank you for contributing! 🎉

---

**Last Updated**: 2025-10-20
