# Implementation Plan

[Overview]
The goal of this implementation plan is to enhance the copima-cli-crawler to fully meet the requirements outlined in the project brief for crawling GitLab resources.

This plan addresses the gaps identified in the current codebase concerning data storage hierarchy, progress reporting formatting, and complete coverage of the four-step crawling workflow. The application aims to provide a robust, configurable, and extensible solution for extracting API data from GitLab using both GraphQL and REST APIs, storing it locally in a structured manner. The implementation will ensure compliance with core responsibilities such as progress reporting, resume capabilities, data processing callbacks, JSONL data storage with hierarchical folder structure, and a five-level configuration hierarchy. This fits into the existing system by enhancing the crawl commands and utility functions to handle all specified requirements seamlessly.

[Types]
This section defines the necessary type system changes to support the implementation.

- Update `Config` type in `src/config/types.ts` to include any additional fields for controlling hierarchical storage options if needed.
- Define new types in `src/db/types.ts` for tracking hierarchical relationships if database storage of structure is required.
- Extend `CallbackContext` in `src/config/types.ts` to include hierarchical path information for processed resources, aiding in storage decisions.

[Files]
This section outlines the file modifications and creations needed for the implementation.

- **New Files:**
  - `src/utils/storageManager.ts`: Manages the creation of hierarchical folder structures and writing JSONL files based on API resource hierarchy.
  - `src/commands/crawl/commonResources.ts`: Handles fetching common resources across groups and projects as part of Step 3 of the workflow.
  - `src/commands/crawl/restResources.ts`: Implements Step 4 of the workflow for REST-only resources like repository details.
- **Modified Files:**
  - `src/commands/crawl/fetchUsers.ts`: Update to use the new `StorageManager` for writing user data to JSONL files, potentially under a global or specific hierarchy.
  - `src/utils/progressReporter.ts`: Enhance to include advanced terminal formatting for progress display in addition to YAML file output.
  - `src/api/gitlabGraphQLClient.ts`: Extend to cover all GraphQL resources as per Steps 1-3 of the workflow, including groups, projects, and associated resources.
  - `src/api/gitlabRestClient.ts`: Extend to handle REST-specific resources as per Step 4, ensuring complete coverage of repository-level details.
  - `src/config/loader.ts`: Ensure configuration supports options for hierarchical storage preferences if applicable.
- **Configuration Updates:**
  - `src/config/defaults.ts`: Add default settings for hierarchical storage if needed.

[Functions]
This section details the function modifications and additions required.

- **New Functions:**
  - `createHierarchicalPath` in `src/utils/storageManager.ts`: Generates folder paths based on resource hierarchy (e.g., groups/projects).
  - `writeJsonlFile` in `src/utils/storageManager.ts`: Writes processed data to JSONL files in the correct hierarchical location.
  - `fetchCommonResources` in `src/commands/crawl/commonResources.ts`: Fetches resources common to groups and projects.
  - `fetchRestResources` in `src/commands/crawl/restResources.ts`: Fetches REST-only resources.
- **Modified Functions:**
  - `fetchUsers` in `src/commands/crawl/fetchUsers.ts`: Update to use `StorageManager` for hierarchical storage.
  - `writeProgress` in `src/utils/progressReporter.ts`: Enhance to output formatted progress to terminal alongside YAML file updates.
  - `fetchGroupsAndProjects` (or similar) in `src/api/gitlabGraphQLClient.ts`: Ensure it captures all necessary area data for Step 1.
- **Removed Functions:**
  - None identified at this stage.

[Classes]
This section describes class modifications and additions.

- **New Classes:**
  - `StorageManager` in `src/utils/storageManager.ts`: Manages hierarchical data storage, ensuring folder structures mirror API hierarchy.
- **Modified Classes:**
  - `ProgressReporter` in `src/utils/progressReporter.ts`: Add methods for terminal formatting of progress output.
  - `GitLabGraphQLClient` in `src/api/gitlabGraphQLClient.ts`: Extend to handle all GraphQL resources comprehensively.
  - `GitLabRestClient` in `src/api/gitlabRestClient.ts`: Extend to cover REST-specific resources.
- **Removed Classes:**
  - None identified at this stage.

[Dependencies]
This section lists dependency modifications needed for the implementation.

- No new dependencies are anticipated at this stage. Existing dependencies like `fs` for file operations and `js-yaml` for progress reporting are sufficient.

[Testing]
This section outlines the testing approach to validate the implementation.

- Create new test files for `StorageManager` in `src/utils/storageManager.test.ts` to verify hierarchical path creation and JSONL writing.
- Update existing test files like `src/api/gitlabRestClient.test.ts` to cover new REST resource fetching functions.
- Add test cases in `src/utils/progressReporter.test.ts` to ensure terminal formatting works as expected.
- Validate hierarchical storage by testing output folder structures against mock API hierarchy data.

[Implementation Order]
This section defines the sequence of implementation to minimize conflicts.

1. Implement `StorageManager` in `src/utils/storageManager.ts` to handle hierarchical data storage.
2. Update `fetchUsers` in `src/commands/crawl/fetchUsers.ts` to use the new storage system.
3. Enhance `ProgressReporter` in `src/utils/progressReporter.ts` for advanced terminal formatting.
4. Extend `GitLabGraphQLClient` in `src/api/gitlabGraphQLClient.ts` to cover all GraphQL resources (Steps 1-3).
5. Add `commonResources.ts` for Step 3 of the workflow to fetch common resources.
6. Extend `GitLabRestClient` in `src/api/gitlabRestClient.ts` and add `restResources.ts` for Step 4 REST resources.
7. Update configuration if needed to support storage preferences.
8. Develop and run tests to validate each component, starting with storage and progressing to API interactions.
