# Changelog

All notable changes to the Copima CLI Crawler project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.5] - 2025-11-13

### Added

- New features and enhancements in this release

### Fixed

- Bug fixes and improvements

### Changed

- Updates to existing functionality

## [0.2.4] - 2025-10-20

### Added

- New features and enhancements in this release

### Fixed

- Bug fixes and improvements

### Changed

- Updates to existing functionality

## [0.2.0] - 2025-10-19

### Added

- Deduplication system for efficiently handling duplicate resources across crawl runs
- Multi-platform executable builds (Windows x64, macOS Intel x64, macOS Apple Silicon ARM64)
- Automated release workflow via GitHub Actions
- Comprehensive test suite for deduplication functionality

### Fixed

- TypeScript compilation errors in test files (index signature access patterns)
- Type safety improvements in user fetching module

### Changed

- Enhanced storage manager with integrated deduplication support
- Improved build configuration for cross-platform executable generation

### Platform Support

- ✅ Windows x64 (`.exe` executable)
- ✅ macOS Intel (x64 executable)
- ✅ macOS Apple Silicon (ARM64 executable)

## [0.1.0] - Initial Release

### Added

- GitLab API crawler supporting GraphQL and REST endpoints
- Four-step crawling workflow (areas, users, resources, repository)
- OAuth2 and Personal Access Token authentication
- JSONL data storage with hierarchical folder structure
- Progress reporting and resume capabilities
- Interactive configuration setup wizard
- Comprehensive E2E testing framework
- Support for callback-based data processing and filtering
- YAML-based configuration with 5-level precedence system

### Features

- **Step 1 - Areas**: Crawl groups and projects
- **Step 2 - Users**: Fetch all GitLab users
- **Step 3 - Resources**: Crawl issues, merge requests, epics, and other resources
- **Step 4 - Repository**: Crawl branches, commits, tags, and file contents

### Core Components

- GitLab GraphQL and REST API clients with pagination support
- Hierarchical storage manager for JSONL output
- Progress reporter with YAML-based state persistence
- Configuration loader with environment variable and file-based config
- OAuth2 token manager with automatic refresh
- Callback system for custom data processing

[0.2.5]: https://github.com/pdiegmann/copima-cli-crawler/releases/tag/v0.2.5
[0.2.4]: https://github.com/pdiegmann/copima-cli-crawler/releases/tag/v0.2.4
[0.2.0]: https://github.com/pdiegmann/copima-cli-crawler/releases/tag/v0.2.0
[0.1.0]: https://github.com/pdiegmann/copima-cli-crawler/releases/tag/v0.1.0
