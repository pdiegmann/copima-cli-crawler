# COPIMA CLI Crawler Wiki

Welcome to the comprehensive documentation for the COPIMA CLI Crawler - a powerful command-line tool for extracting and crawling data from GitLab instances via GraphQL and REST APIs.

## 📚 Quick Navigation

### Getting Started
- **[Quick Start Guide](getting-started/Quick-Start.md)** - Get up and running in 5 minutes
- **[Installation](getting-started/Installation.md)** - Detailed installation instructions
- **[First Crawl](getting-started/First-Crawl.md)** - Step-by-step guide to your first data extraction

### Architecture & Design
- **[Architecture Overview](architecture/Overview.md)** - High-level system architecture
- **[Four-Step Crawling Process](architecture/Crawling-Process.md)** - Understanding the crawling workflow
- **[API Integration](architecture/API-Integration.md)** - GraphQL and REST API usage patterns
- **[Data Flow](architecture/Data-Flow.md)** - How data moves through the system

### Core Concepts
- **[Authentication Methods](core-concepts/Authentication.md)** - PAT, OAuth2, and token management
- **[Configuration System](core-concepts/Configuration.md)** - 5-level configuration hierarchy
- **[Storage System](core-concepts/Storage.md)** - JSONL files and hierarchical storage
- **[Resume Capabilities](core-concepts/Resume.md)** - Checkpoint and recovery mechanisms
- **[Progress Reporting](core-concepts/Progress-Reporting.md)** - Real-time progress tracking
- **[Deduplication](core-concepts/Deduplication.md)** - Preventing duplicate data writes
- **[Callbacks & Hooks](core-concepts/Callbacks.md)** - Custom data processing

### User Guides
- **[Command Reference](guides/Command-Reference.md)** - Complete CLI command documentation
- **[Authentication Setup](guides/Authentication-Setup.md)** - Setting up authentication methods
- **[Custom Callbacks](guides/Custom-Callbacks.md)** - Implementing data processing hooks
- **[Testing](guides/Testing.md)** - E2E testing and validation

### API Reference
- **[GraphQL Client](api-reference/GraphQL-Client.md)** - GitLabGraphQLClient API
- **[REST Client](api-reference/REST-Client.md)** - GitLabRestClient API
- **[Storage Manager](api-reference/Storage-Manager.md)** - Storage and file operations
- **[Callback Manager](api-reference/Callback-Manager.md)** - Callback system API

### Development
- **[Development Setup](development/Setup.md)** - Setting up development environment
- **[Contributing Guidelines](development/Contributing.md)** - How to contribute

### Troubleshooting & FAQ
- **[Common Issues](troubleshooting/Common-Issues.md)** - Frequently encountered problems
- **[Error Messages](troubleshooting/Error-Messages.md)** - Understanding error messages
- **[Performance Tuning](troubleshooting/Performance.md)** - Optimizing crawl performance
- **[FAQ](troubleshooting/FAQ.md)** - Frequently asked questions

## 🎯 What This Tool Does

The COPIMA CLI Crawler is designed to systematically extract comprehensive data from GitLab instances. It crawls:

- **Groups & Projects** - Organizational structure and metadata
- **Users** - User profiles and information
- **Issues & Merge Requests** - Development workflow artifacts
- **Pipelines** - CI/CD execution history
- **Repository Data** - Commits, branches, tags, and file contents
- **Security & Compliance** - Vulnerabilities, dependencies, and audit logs

All data is stored in structured JSONL (JSON Lines) format for easy processing and analysis.

## 🚀 Quick Start

```bash
# 1. Run interactive setup
copima-cli-crawler setup

# 2. Authenticate with GitLab
copima-cli-crawler auth

# 3. Start crawling
copima-cli-crawler crawl
```

Output will be saved to `./output` directory by default.

## 🔑 Key Features

### Four-Step Crawling Process
1. **Areas** - Gather all accessible groups and projects
2. **Users** - Collect user information
3. **Resources** - Extract issues, MRs, labels, milestones, etc.
4. **Repository** - Crawl commits, branches, tags, and files

### Advanced Capabilities
- **Resume Support** - Pause and resume crawls without data loss
- **Progress Tracking** - Real-time YAML progress reports
- **Deduplication** - Automatic prevention of duplicate data
- **Custom Callbacks** - Hook into the data processing pipeline
- **Flexible Authentication** - PAT tokens or OAuth2 flows
- **Hierarchical Storage** - Mirror GitLab's group/project structure
- **E2E Testing** - Built-in test framework for validation

## 📖 Documentation Structure

This Wiki follows a modular structure designed for both beginners and advanced users:

- **Getting Started** - For new users who want to quickly start using the tool
- **Architecture** - For understanding how the system is designed
- **Core Concepts** - For deep dives into specific features
- **Guides** - For task-oriented how-to documentation
- **API Reference** - For developers integrating or extending the tool
- **Development** - For contributors and developers
- **Troubleshooting** - For solving problems and debugging

## 🛠 Technology Stack

This project is built with:

- **[Stricli](https://bloomberg.github.io/stricli/)** - CLI framework
- **[Bun](https://bun.sh)** - JavaScript runtime and package manager
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Winston](https://github.com/winstonjs/winston)** - Logging framework
- **[Jest](https://jestjs.io/)** - Testing framework
- **GraphQL** - Primary API interface
- **REST API** - Secondary API for REST-only resources

## 📝 Contributing to This Wiki

Found an error or want to improve the documentation? Contributions are welcome!

1. Fork the repository
2. Edit or add Wiki pages in the `wiki/` directory
3. Submit a pull request with your changes
4. Follow the [Contributing Guidelines](development/Contributing.md)

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🔗 Additional Resources

- [Main README](../README.md) - Project overview and technical details
- [HOW_TO Guide](../HOW_TO.md) - Beginner-friendly usage guide
- [GitHub Repository](https://github.com/pdiegmann/copima-cli-crawler)
- [Issue Tracker](https://github.com/pdiegmann/copima-cli-crawler/issues)

---

**Last Updated:** 2025-10-19

**Wiki Version:** 1.0.0
