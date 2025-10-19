# COPIMA CLI Crawler Wiki

This directory contains the comprehensive documentation for COPIMA CLI Crawler.

## Documentation Structure

```
wiki/
├── Home.md                          # Wiki home page and navigation
├── getting-started/                 # For new users
│   ├── Quick-Start.md              # 5-minute quickstart
│   ├── Installation.md             # Detailed installation guide
│   └── First-Crawl.md              # Step-by-step first crawl
├── architecture/                    # System design and architecture
│   ├── Overview.md                 # High-level architecture
│   ├── Crawling-Process.md         # Four-step crawling workflow
│   └── API-Integration.md          # GraphQL and REST API usage
├── core-concepts/                   # Deep dives into features
│   ├── Authentication.md           # PAT and OAuth2 authentication
│   ├── Configuration.md            # 5-level configuration system
│   ├── Storage.md                  # JSONL hierarchical storage
│   └── Deduplication.md            # Duplicate prevention
├── guides/                          # Task-oriented documentation
│   └── Command-Reference.md        # Complete CLI command reference
└── troubleshooting/                 # Problem solving
    ├── Common-Issues.md            # Frequent problems and solutions
    └── FAQ.md                      # Frequently asked questions
```

## Quick Links

### For New Users
- Start here: [Quick Start Guide](getting-started/Quick-Start.md)
- [Installation Guide](getting-started/Installation.md)
- [Your First Crawl](getting-started/First-Crawl.md)

### For Developers
- [Architecture Overview](architecture/Overview.md)
- [API Integration](architecture/API-Integration.md)
- [Storage System](core-concepts/Storage.md)

### For Troubleshooting
- [Common Issues](troubleshooting/Common-Issues.md)
- [FAQ](troubleshooting/FAQ.md)

### Reference
- [Command Reference](guides/Command-Reference.md)
- [Configuration System](core-concepts/Configuration.md)
- [Authentication Methods](core-concepts/Authentication.md)

## Contributing to Documentation

Found an error or want to improve the documentation?

1. **Edit Markdown files** in the `wiki/` directory
2. **Follow existing structure** and style
3. **Submit a pull request** with your changes
4. **Update this README** if adding new sections

### Documentation Standards

- Use clear, concise language
- Include code examples where appropriate
- Add links to related documentation
- Keep navigation consistent
- Test all code examples

## Building/Viewing Locally

The Wiki is written in Markdown and can be viewed in any Markdown viewer:

```bash
# View with a Markdown viewer
mdcat wiki/Home.md

# Or browse with VSCode
code wiki/

# Or use a static site generator (optional)
# mkdocs, docsify, etc.
```

## License

Documentation is licensed under MIT License, same as the project.

---

**Documentation maintained by**: COPIMA Contributors  
**Last updated**: 2025-10-19
