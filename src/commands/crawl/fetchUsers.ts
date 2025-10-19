import { GitLabGraphQLClient } from "../../api/gitlabGraphQLClient";
import { loadConfig } from "../../config/loader";
import type { CallbackContext } from "../../config/types";
import { createLogger } from "../../logging/logger";
import type { SafeRecord } from "../../types/api";

const logger = createLogger("fetchUsers");

/**
 * Fetches all users from the GitLab API, processes them using a callback, and writes them to a JSONL file.
 * @param callback - A function to process, filter, or modify each user object.
 */
export const fetchUsers = async (callback: (user: unknown, context: CallbackContext) => unknown | null): Promise<void> => {
  const config = await loadConfig();
  const accessToken = config.gitlab.token || config.gitlab.accessToken || "";
  const client = new GitLabGraphQLClient(config.gitlab.host, accessToken);

  // Create storage manager with deduplication support
  const { createStorageManagerWithDeduplication } = await import("./storageFactory.js");
  const storageManager = createStorageManagerWithDeduplication(config);

  try {
    logger.info("Fetching users from GitLab...");
    const users = await client.fetchAllUsers();

    const context: CallbackContext = {
      host: config.gitlab.host,
      accountId: "global", // Users are global resources, not tied to a specific account
      resourceType: "users",
    };

    // Process users through callback
    const processedUsers: unknown[] = [];
    for (const user of users) {
      const processedUser = callback(user, context);
      if (processedUser) {
        processedUsers.push(processedUser);
      }
    }

    // Create hierarchical path and write to JSONL file
    // Users are stored at the root level since they're global resources
    const filePath = storageManager.createHierarchicalPath("users", []);
    const writtenCount = storageManager.writeJsonlFile(
      filePath,
      processedUsers as SafeRecord[],
      false,
      "user",
      "id",
    ); // Overwrite existing file with deduplication

    logger.info(`Successfully wrote ${writtenCount} users to ${filePath}`);
  } catch (error) {
    logger.error("Failed to fetch users:", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
};
