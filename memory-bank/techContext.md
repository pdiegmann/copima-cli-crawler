# Technical Context: Core Libraries and Utilities

The following technologies and libraries must be used for this project to maintain consistency and adhere to established development patterns.

## Runtime and Package Management

- **Bun**: Used as both the runtime environment and the package manager for the entire project.

## Development Tools

- **ESLint** and **Prettier**: Mandated for all code, ensuring consistent linting and formatting across the codebase.

## Core Libraries

- **`strictly`**: This library is a strict requirement for any component that serves as a command-line interface (CLI) tool.
- **`winston`**: This library must be used as the project's logging provider. All logging should be handled through the central/default logger located at `/src/utils/logger.ts`.
- **`picocolors`**: Required for all terminal output to ensure proper color formatting and readability.
- **`treeify`**: Must be used to convert JavaScript/TypeScript objects into a well-formatted tree structure for terminal output, primarily for debugging or user feedback.
- **`drizzle-orm`**: This ORM is mandatory for all database access. It must be used with Bun's integrated SQLite driver.
