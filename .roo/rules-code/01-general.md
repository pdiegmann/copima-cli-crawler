# General Rules

The following rules are in addition to all "common sense", "default", or "general rules.

## Must-Use Libraries and Utilities

This project REQUIRES the STRICT USAGE of CERTAIN LIBRARIES AND UTILITIES whenever applicable:

1. [strictly](https://bloomberg.github.io/stricli/docs/getting-started/overview) for anything interfacing with the usage of this project as CLI tool
2. Bun as runtime and package manager
3. ESLint and Prettier for linting and formatting
4. [winston](https://github.com/winstonjs/winston) as logging provider with /src/utils/logger.ts being the central/default logger
5. [picocolors](https://github.com/alexeyraspopov/picocolors) for terminal output formatting with colors
6. [treeify](https://github.com/notatestuser/treeify) for converting JS/TS objects into nicely formatted trees for terminal output
7. [drizzle-orm](https://orm.drizzle.team/docs/overview) for database access and as ORM with Bun's integrated sqlite driver

## Crawling Process

Details on the crawling process can be found, if necessary, in the [Crawling Process document](02-crwaling-process.md)

## Account and Credentials Database Schema

Details on the account and credentials database schema can be found, if necessary, in the [Account Database Schema document](03-account-db-schema.md)