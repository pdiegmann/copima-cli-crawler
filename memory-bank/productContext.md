# Project Brief: API Data Collector

This application is designed to function as a robust data collection tool, primarily focused on fetching and organizing data from APIs, with a specific initial focus on GitLab. The core purpose is to provide a highly configurable and extensible solution for a user to extract API data and store it locally for further processing or analysis.

The application must support a flexible configuration hierarchy, allowing users to define settings via command-line arguments, environment variables, or configuration files, with clear rules of precedence.

A key feature of this product is its ability to handle data processing through a customizable callback "hook." This allows users to implement their own logic for data cleaning, filtering (including deduplication), and modification before the data is saved. This ensures that the stored data is clean, relevant, and ready for use.

The final output is a structured, lightweight data storage system. All processed data will be saved in JSONL files, organized in a folder hierarchy that directly mirrors the API's own hierarchical structure (e.g., GitLab groups and projects).