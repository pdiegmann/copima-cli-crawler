import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { GitLabGraphQLClient } from "../../api/gitlabGraphQLClient";
import logger from "../../utils/logger";

/**
 * Fetches all users from the GitLab API, processes them using a callback, and writes them to a JSONL file.
 * @param callback - A function to process, filter, or modify each user object.
 */
export async function fetchUsers(callback: (user: any, context: { host: string; accountId: string; resourceType: string }) => any | null) {
  const client = new GitLabGraphQLClient();
  const outputDir = path.resolve(process.cwd(), "output");
  const outputFile = path.join(outputDir, "users.jsonl");

  try {
    logger.info("Fetching users from GitLab...");
    const users = await client.fetchUsers();

    // Ensure output directory exists
    
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    writeFileSync(outputFile, "", { flag: "w" }); // Clear file if it exists

    const context = { host: client.host, accountId: client.accountId, resourceType: "user" };
    users.forEach((user) => {
      const processedUser = callback(user, context);
      if (processedUser) {
        const jsonLine = JSON.stringify(processedUser);
        writeFileSync(outputFile, jsonLine + "\n", { flag: "a" });
      }
    });

    logger.info(`Successfully wrote ${users.length} users to ${outputFile}`);
  } catch (error) {
    logger.error("Failed to fetch users:", error);
    throw error;
  }
}