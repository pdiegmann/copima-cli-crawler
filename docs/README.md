# Documentation Directory

This directory contains **technical reference documentation** for developers working directly with the codebase.

## What Belongs Here

✅ **Technical references** - Low-level implementation details and schemas
✅ **Architecture diagrams** - Technical system architecture documentation
✅ **Development notes** - Internal development reference materials

## What Does NOT Belong Here

❌ **User guides** - Belong in the [GitHub Wiki](https://github.com/pdiegmann/copima-cli-crawler/wiki)
❌ **Getting started docs** - Belong in the [GitHub Wiki](https://github.com/pdiegmann/copima-cli-crawler/wiki)
❌ **How-to guides** - Belong in the [GitHub Wiki](https://github.com/pdiegmann/copima-cli-crawler/wiki)
❌ **CI/CD reports** - Belong in `.github/reports/` (auto-generated)
❌ **Release notes** - Belong in `CHANGELOG.md` and GitHub Releases
❌ **Historical fixes** - Belong in git history and PR descriptions

## Current Documentation

### Technical References

| File                                                       | Purpose                                   | Wiki Equivalent                                                                                                                                     |
| ---------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`crawling-process.md`](crawling-process.md)               | Quick reference for 4-step crawl workflow | [architecture-Crawling-Process](https://github.com/pdiegmann/copima-cli-crawler/wiki/architecture-Crawling-Process) (more detailed)                 |
| [`graphql-schema-to-steps.md`](graphql-schema-to-steps.md) | GraphQL type → crawl step mapping table   | [architecture-GraphQL-Schema-Reference](https://github.com/pdiegmann/copima-cli-crawler/wiki/architecture-GraphQL-Schema-Reference) (more detailed) |
| [`deduplication.md`](deduplication.md)                     | Deduplication system technical reference  | [core-concepts-Deduplication](https://github.com/pdiegmann/copima-cli-crawler/wiki/core-concepts-Deduplication) (more detailed)                     |

## Documentation Hierarchy

```
copima-cli-crawler/
├── README.md                    # Project overview, quick start
├── CHANGELOG.md                 # Version history
├── CLAUDE.md                    # AI assistant project guide
│
├── docs/                        # Technical references (this directory)
│   ├── README.md               # This file
│   ├── crawling-process.md     # Quick reference
│   ├── graphql-schema-to-steps.md  # Schema mapping
│   └── deduplication.md        # Technical reference
│
├── .github/
│   └── reports/                # CI/CD generated reports
│       └── code-quality-report.md  # Latest quality analysis
│
└── Wiki (GitHub)               # Comprehensive user and developer docs
    ├── Getting Started/        # Installation, quick start, first crawl
    ├── Guides/                 # Command reference, how-tos
    ├── Core Concepts/          # Configuration, auth, storage, dedup
    ├── Architecture/           # System design, API integration, crawling
    ├── Development/            # Setup, contributing, testing, releases
    └── Troubleshooting/        # Common issues, FAQ
```

## Contributing Documentation

### Adding Technical References

If you need to add technical reference documentation:

1. **Check if it belongs in the wiki first** - Most documentation should go there
2. **Keep it concise** - These are quick references, not comprehensive guides
3. **Link to wiki** - Always reference the detailed wiki version
4. **Update this README** - Add your new file to the table above

### Adding User-Facing Documentation

User-facing documentation should go in the [GitHub Wiki](https://github.com/pdiegmann/copima-cli-crawler/wiki):

1. Clone the wiki repository:

   ```bash
   git clone https://github.com/pdiegmann/copima-cli-crawler.wiki.git
   ```

2. Add your documentation file following the naming convention:
   - `getting-started-*.md` - Getting started guides
   - `guides-*.md` - How-to guides
   - `core-concepts-*.md` - Conceptual documentation
   - `architecture-*.md` - Architecture and design docs
   - `development-*.md` - Development guides
   - `api-reference-*.md` - API documentation
   - `troubleshooting-*.md` - Problem-solving guides

3. Commit and push:

   ```bash
   git add your-new-file.md
   git commit -m "Add [topic] documentation"
   git push origin master
   ```

4. Update the wiki's [Home page](https://github.com/pdiegmann/copima-cli-crawler/wiki/Home) with a link to your new page

## See Also

- [GitHub Wiki Home](https://github.com/pdiegmann/copima-cli-crawler/wiki/Home) - Complete documentation
- [Contributing Guidelines](https://github.com/pdiegmann/copima-cli-crawler/wiki/development-Contributing) - How to contribute
- [Development Setup](https://github.com/pdiegmann/copima-cli-crawler/wiki/development-Setup) - Local development
