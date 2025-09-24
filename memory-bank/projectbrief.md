# Project Brief: API Data Collector

This project is aimed at crawling all accessible resources (e.g., groups, projects, repositories) from a GitLab instance via the GraphQL and REST APIs. The primary goal is to provide a robust, configurable, and extensible data collection solution for users to extract API data and store it locally in a structured manner.

## Abstract Workflow

The application's crawling process is organized into four major steps:

- **Steps 1-3** handle GraphQL resources, which are preferred when available.
  - **Step 1:** Gather groups and projects.
  - **Step 2:** Gather all available users.
  - **Step 3:** Iterate over all areas to gather common, group-specific, and project-specific resources.
- **Step 4** covers resources that are only available via REST APIs, such as repository-level details and global REST-only data.

## Core Responsibilities

In addition to crawling, the application must fulfill the following core responsibilities:

- **Progress Reporting:** The application must use advanced terminal formatting and write a YAML-formatted progress report to a file. This file should constantly be updated with the most recent progress and be readable by other processes.
- **Resume Capabilities:** The application should be able to resume work from a previously saved state by reading the state file and skipping already-handled requests.
- **Data Processing Callback:** A configurable "hook" or "callback" must be supported for custom data cleaning, filtering, deduplication, and modification of each parsed object before storage.
- **JSONL Data Storage:** All processed data must be stored in JSONL files. The folder structure should mirror the hierarchical structure of the areas from which the data was collected. File names for each resource type must be deterministic and lowercase (e.g., `users.jsonl`).
- **Configuration:** The application must support a five-level configuration hierarchy in descending order of precedence:
  1.  Command-line arguments.
  2.  Environment variables.
  3.  User's home configuration file (e.g., `~/.config/copima`).
  4.  YAML configuration file in the current working directory.
  5.  Built-time defaults from a YAML file in the project's root directory.
