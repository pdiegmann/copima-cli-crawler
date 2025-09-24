import { GitLabGraphQLClient } from "../../api/gitlabGraphQLClient";
import { loadConfig } from "../../config/loader";
import type { CallbackContext } from "../../config/types";
import { createLogger } from "../../utils/logger";
import { StorageManager } from "../../utils/storageManager";

const logger = createLogger("fetchUsers");

/**
 * Fetches all users from the GitLab API, processes them using a callback, and writes them to a JSONL file.
 * @param callback - A function to process, filter, or modify each user object.
 */
export const fetchUsers = async (callback: (user: unknown, context: CallbackContext) => unknown | null): Promise<void> => {
  const config = loadConfig();
  const client = new GitLabGraphQLClient(config.gitlab.host, config.gitlab.accessToken);
  const storageManager = new StorageManager(config.output);

  try {
    logger.info("Fetching users from GitLab...");
    const users = await client.fetchUsers();

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
    const writtenCount = storageManager.writeJsonlFile(filePath, processedUsers, false); // Overwrite existing file

    logger.info(`Successfully wrote ${writtenCount} users to ${filePath}`);
  } catch (error) {
    logger.error("Failed to fetch users:", error);
    throw error;
  }
};
