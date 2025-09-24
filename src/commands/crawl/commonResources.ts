import { GitLabGraphQLClient } from "../../api/gitlabGraphQLClient";
import { loadConfig } from "../../config/loader";
import type { CallbackContext } from "../../config/types";
import { createLogger } from "../../utils/logger";
import { StorageManager } from "../../utils/storageManager";

const logger = createLogger("commonResources");

/**
 * Fetches common resources that are available across groups and projects
 * This implements Step 3 of the GitLab crawling workflow
 */
export class CommonResourcesFetcher {
  private config = loadConfig();
  private client: GitLabGraphQLClient;
  private storageManager: StorageManager;

  constructor() {
    this.client = new GitLabGraphQLClient(this.config.gitlab.host, this.config.gitlab.accessToken);
    this.storageManager = new StorageManager(this.config.output);
  }

  /**
   * Fetches members for a specific group or project
   */
  async fetchMembers(areaType: "group" | "project", areaId: string, areaPath: string, callback: (member: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      const query = `
        query($id: ID!) {
          ${areaType}(id: $id) {
            groupMembers {
              nodes {
                id
                accessLevel {
                  integerValue
                  stringValue
                }
                user {
                  id
                  username
                  name
                  publicEmail
                  createdAt
                }
                createdAt
                updatedAt
                expiresAt
              }
            }
          }
        }
      `;

      logger.info(`Fetching members for ${areaType}: ${areaPath}`);
      const data = await this.client.query(query, { id: areaId });
      const members = (data[areaType] && (data[areaType] as any).groupMembers?.nodes) || [];

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: areaId,
        resourceType: "members",
      };

      // Process members through callback
      const processedMembers: unknown[] = [];
      for (const member of members) {
        const processedMember = callback(member, context);
        if (processedMember) {
          processedMembers.push(processedMember);
        }
      }

      // Store in hierarchical structure
      const hierarchy = areaType === "group" ? ["groups", areaPath] : ["groups", ...areaPath.split("/"), "projects"];
      const filePath = this.storageManager.createHierarchicalPath("members", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedMembers as any, false);

      logger.info(`Successfully wrote ${writtenCount} members for ${areaPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch members for ${areaType} ${areaPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches labels for a specific group or project
   */
  async fetchLabels(areaType: "group" | "project", areaId: string, areaPath: string, callback: (label: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      const query = `
        query($id: ID!) {
          ${areaType}(id: $id) {
            labels {
              nodes {
                id
                title
                description
                color
                textColor
                createdAt
                updatedAt
              }
            }
          }
        }
      `;

      logger.info(`Fetching labels for ${areaType}: ${areaPath}`);
      const data = await this.client.query(query, { id: areaId });
      const labels = (data[areaType] && (data[areaType] as any).labels?.nodes) || [];

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: areaId,
        resourceType: "labels",
      };

      // Process labels through callback
      const processedLabels: unknown[] = [];
      for (const label of labels) {
        const processedLabel = callback(label, context);
        if (processedLabel) {
          processedLabels.push(processedLabel);
        }
      }

      // Store in hierarchical structure
      const hierarchy = areaType === "group" ? ["groups", areaPath] : ["groups", ...areaPath.split("/"), "projects"];
      const filePath = this.storageManager.createHierarchicalPath("labels", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedLabels as any, false);

      logger.info(`Successfully wrote ${writtenCount} labels for ${areaPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch labels for ${areaType} ${areaPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches milestones for a specific group or project
   */
  async fetchMilestones(
    areaType: "group" | "project",
    areaId: string,
    areaPath: string,
    callback: (milestone: unknown, context: CallbackContext) => unknown | null
  ): Promise<void> {
    try {
      const query = `
        query($id: ID!) {
          ${areaType}(id: $id) {
            milestones {
              nodes {
                id
                title
                description
                state
                dueDate
                startDate
                createdAt
                updatedAt
                webUrl
              }
            }
          }
        }
      `;

      logger.info(`Fetching milestones for ${areaType}: ${areaPath}`);
      const data = await this.client.query(query, { id: areaId });
      const milestones = (data[areaType] && (data[areaType] as any).milestones?.nodes) || [];

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: areaId,
        resourceType: "milestones",
      };

      // Process milestones through callback
      const processedMilestones: unknown[] = [];
      for (const milestone of milestones) {
        const processedMilestone = callback(milestone, context);
        if (processedMilestone) {
          processedMilestones.push(processedMilestone);
        }
      }

      // Store in hierarchical structure
      const hierarchy = areaType === "group" ? ["groups", areaPath] : ["groups", ...areaPath.split("/"), "projects"];
      const filePath = this.storageManager.createHierarchicalPath("milestones", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedMilestones as any, false);

      logger.info(`Successfully wrote ${writtenCount} milestones for ${areaPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch milestones for ${areaType} ${areaPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches issues for a specific project
   */
  async fetchIssues(projectId: string, projectPath: string, callback: (issue: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      const query = `
        query($id: ID!, $first: Int, $after: String) {
          project(id: $id) {
            issues(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                iid
                title
                description
                state
                createdAt
                updatedAt
                closedAt
                author {
                  id
                  username
                  name
                }
                assignees {
                  nodes {
                    id
                    username
                    name
                  }
                }
                labels {
                  nodes {
                    id
                    title
                    color
                  }
                }
                milestone {
                  id
                  title
                }
                webUrl
              }
            }
          }
        }
      `;

      logger.info(`Fetching issues for project: ${projectPath}`);

      let hasNextPage = true;
      let after: string | null = null;
      let allIssues: unknown[] = [];

      // Paginate through all issues
      while (hasNextPage) {
        const data: any = await this.client.query(query, {
          id: projectId,
          first: 100,
          after,
        });

        const issuesData: any = (data["project"] && (data["project"] as any).issues) || [];
        const issues = issuesData?.nodes || [];
        allIssues = allIssues.concat(issues);

        hasNextPage = issuesData?.pageInfo?.hasNextPage || false;
        after = issuesData?.pageInfo?.endCursor || null;

        logger.debug(`Fetched ${issues.length} issues (total: ${allIssues.length}) for ${projectPath}`);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "issues",
      };

      // Process issues through callback
      const processedIssues: unknown[] = [];
      for (const issue of allIssues) {
        const processedIssue = callback(issue, context);
        if (processedIssue) {
          processedIssues.push(processedIssue);
        }
      }

      // Store in hierarchical structure
      const hierarchy = ["groups", ...projectPath.split("/"), "projects"];
      const filePath = this.storageManager.createHierarchicalPath("issues", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedIssues as any, false);

      logger.info(`Successfully wrote ${writtenCount} issues for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch issues for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches merge requests for a specific project
   */
  async fetchMergeRequests(projectId: string, projectPath: string, callback: (mergeRequest: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      const query = `
        query($id: ID!, $first: Int, $after: String) {
          project(id: $id) {
            mergeRequests(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                iid
                title
                description
                state
                createdAt
                updatedAt
                mergedAt
                closedAt
                sourceBranch
                targetBranch
                author {
                  id
                  username
                  name
                }
                assignees {
                  nodes {
                    id
                    username
                    name
                  }
                }
                reviewers {
                  nodes {
                    id
                    username
                    name
                  }
                }
                labels {
                  nodes {
                    id
                    title
                    color
                  }
                }
                milestone {
                  id
                  title
                }
                webUrl
              }
            }
          }
        }
      `;

      logger.info(`Fetching merge requests for project: ${projectPath}`);

      let hasNextPage = true;
      let after: string | null = null;
      let allMergeRequests: unknown[] = [];

      // Paginate through all merge requests
      while (hasNextPage) {
        const data: any = await this.client.query(query, {
          id: projectId,
          first: 100,
          after,
        });

        const mergeRequestsData: any = (data["project"] && (data["project"] as any).mergeRequests) || [];
        const mergeRequests = mergeRequestsData?.nodes || [];
        allMergeRequests = allMergeRequests.concat(mergeRequests);

        hasNextPage = mergeRequestsData?.pageInfo?.hasNextPage || false;
        after = mergeRequestsData?.pageInfo?.endCursor || null;

        logger.debug(`Fetched ${mergeRequests.length} merge requests (total: ${allMergeRequests.length}) for ${projectPath}`);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "mergeRequests",
      };

      // Process merge requests through callback
      const processedMergeRequests: unknown[] = [];
      for (const mergeRequest of allMergeRequests) {
        const processedMergeRequest = callback(mergeRequest, context);
        if (processedMergeRequest) {
          processedMergeRequests.push(processedMergeRequest);
        }
      }

      // Store in hierarchical structure
      const hierarchy = ["groups", ...projectPath.split("/"), "projects"];
      const filePath = this.storageManager.createHierarchicalPath("mergerequests", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedMergeRequests as any, false);

      logger.info(`Successfully wrote ${writtenCount} merge requests for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch merge requests for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}

/**
 * Factory function to create a CommonResourcesFetcher instance
 */
export const createCommonResourcesFetcher = (): CommonResourcesFetcher => {
  return new CommonResourcesFetcher();
};
