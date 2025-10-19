import { GitLabGraphQLClient } from "../../api/gitlabGraphQLClient";
import { loadConfig } from "../../config/loader";
import type { CallbackContext, Config } from "../../config/types";
import { createLogger } from "../../logging/logger";
import { StorageManager } from "../../storage/storageManager";
import { createStorageManagerWithDeduplication } from "./storageFactory.js";

const logger = createLogger("commonResources");

/**
 * Fetches common resources that are available across groups and projects
 * This implements Step 3 of the GitLab crawling workflow
 */
export class CommonResourcesFetcher {
  private config: Config;
  private client: GitLabGraphQLClient;
  private storageManager: StorageManager;

  constructor(config: Config) {
    this.config = config;
    const accessToken = config.gitlab.token || config.gitlab.accessToken || "";
    this.client = new GitLabGraphQLClient(this.config.gitlab.host, accessToken);

    // Create storage manager with deduplication support
    this.storageManager = createStorageManagerWithDeduplication(this.config);
  }

  /**
   * Fetches members for a specific group or project
   */
  async fetchMembers(areaType: "group" | "project", areaId: string, areaPath: string, callback: (member: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      // Use different field names for groups vs projects
      const membersField = areaType === "group" ? "groupMembers" : "projectMembers";

      const query = `
        query($fullPath: ID!) {
          ${areaType}(fullPath: $fullPath) {
            ${membersField} {
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
                  avatarUrl
                  webUrl
                  state
                  bio
                  location
                  organization
                  jobTitle
                  pronouns
                  bot
                  createdAt
                }
                createdBy {
                  id
                  username
                  name
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
      logger.info(`DEBUG: Using variables: { fullPath: "${areaPath}" }`);
      const data = (await this.client.query(query, { fullPath: areaPath })) as any;
      const members = (data[areaType] && data[areaType][membersField]?.nodes) || [];

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
      // Split the full path to create hierarchy (e.g., "group/subgroup" => ["group", "subgroup"])
      const hierarchy = areaPath.split("/");
      const filePath = this.storageManager.createHierarchicalPath("members", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedMembers as any, false, "member", "id");

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
        query($fullPath: ID!) {
          ${areaType}(fullPath: $fullPath) {
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
      const data = (await this.client.query(query, { fullPath: areaPath })) as any;
      const labels = (data[areaType] && data[areaType].labels?.nodes) || [];

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
      // Split the full path to create hierarchy (e.g., "group/subgroup" => ["group", "subgroup"])
      const hierarchy = areaPath.split("/");
      const filePath = this.storageManager.createHierarchicalPath("labels", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedLabels as any, false, "label", "id");

      logger.info(`Successfully wrote ${writtenCount} labels for ${areaPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch labels for ${areaType} ${areaPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches releases for a specific project via GraphQL
   */
  async fetchReleases(projectId: string, projectPath: string, callback: (release: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      const query = `
        query($fullPath: ID!, $first: Int, $after: String) {
          project(fullPath: $fullPath) {
            releases(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                tagName
                tagPath
                name
                description
                descriptionHtml
                createdAt
                releasedAt
                upcomingRelease
                historicalRelease
                milestones {
                  nodes {
                    id
                    title
                    description
                    state
                  }
                }
                evidences {
                  nodes {
                    id
                    sha
                    filepath
                    collectedAt
                  }
                }
                links {
                  editUrl
                  selfUrl
                }
                author {
                  id
                  username
                  name
                  avatarUrl
                  webUrl
                  state
                }
                commit {
                  id
                  sha
                  shortId
                  title
                  message
                  authoredDate
                  committedDate
                  webUrl
                  author {
                    name
                    email
                    avatarUrl
                  }
                }
              }
            }
          }
        }
      `;

      logger.info(`Fetching releases for project: ${projectPath}`);

      let hasNextPage = true;
      let after: string | null = null;
      let allReleases: unknown[] = [];

      // Paginate through all releases
      while (hasNextPage) {
        const data: any = await this.client.query(query, {
          fullPath: projectPath,
          first: 100,
          after,
        });

        const releasesData: any = (data["project"] && (data["project"] as any).releases) || [];
        const releases = releasesData?.nodes || [];
        allReleases = allReleases.concat(releases);

        hasNextPage = releasesData?.pageInfo?.hasNextPage || false;
        after = releasesData?.pageInfo?.endCursor || null;

        logger.debug(`Fetched ${releases.length} releases (total: ${allReleases.length}) for ${projectPath}`);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "releases",
      };

      // Process releases through callback
      const processedReleases: unknown[] = [];
      for (const release of allReleases) {
        const processedRelease = callback(release, context);
        if (processedRelease) {
          processedReleases.push(processedRelease);
        }
      }

      // Store in hierarchical structure
      // Split the full path to create hierarchy (e.g., "group/subgroup/project" => ["group", "subgroup", "project"])
      const hierarchy = projectPath.split("/");
      const filePath = this.storageManager.createHierarchicalPath("releases", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedReleases as any, false);

      logger.info(`Successfully wrote ${writtenCount} releases for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch releases for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches pipelines for a specific project via GraphQL
   */
  async fetchPipelines(
    projectId: string,
    projectPath: string,
    callback: (pipeline: unknown, context: CallbackContext) => unknown | null,
    maxPipelines: number = 500
  ): Promise<void> {
    try {
      const query = `
        query($fullPath: ID!, $first: Int, $after: String) {
          project(fullPath: $fullPath) {
            pipelines(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                iid
                sha
                beforeSha
                status
                source
                ref
                refPath
                user {
                  id
                  username
                  name
                }
                createdAt
                updatedAt
                startedAt
                finishedAt
                duration
                coverage
                commit {
                  id
                  sha
                  shortId
                  title
                  authoredDate
                  committedDate
                }
                retryable
                cancelable
                totalJobs
              }
            }
          }
        }
      `;

      logger.info(`Fetching pipelines for project: ${projectPath}`);

      let hasNextPage = true;
      let after: string | null = null;
      let allPipelines: unknown[] = [];

      // Paginate through pipelines until we reach maxPipelines
      while (hasNextPage && allPipelines.length < maxPipelines) {
        const data: any = await this.client.query(query, {
          fullPath: projectPath,
          first: Math.min(100, maxPipelines - allPipelines.length),
          after,
        });

        const pipelinesData: any = (data["project"] && (data["project"] as any).pipelines) || [];
        const pipelines = pipelinesData?.nodes || [];
        allPipelines = allPipelines.concat(pipelines);

        hasNextPage = pipelinesData?.pageInfo?.hasNextPage || false;
        after = pipelinesData?.pageInfo?.endCursor || null;

        logger.debug(`Fetched ${pipelines.length} pipelines (total: ${allPipelines.length}) for ${projectPath}`);
      }

      // Trim to maxPipelines if we exceeded the limit
      if (allPipelines.length > maxPipelines) {
        allPipelines = allPipelines.slice(0, maxPipelines);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "pipelines",
      };

      // Process pipelines through callback
      const processedPipelines: unknown[] = [];
      for (const pipeline of allPipelines) {
        const processedPipeline = callback(pipeline, context);
        if (processedPipeline) {
          processedPipelines.push(processedPipeline);
        }
      }

      // Store in hierarchical structure
      // Split the full path to create hierarchy (e.g., "group/subgroup/project" => ["group", "subgroup", "project"])
      const hierarchy = projectPath.split("/");
      const filePath = this.storageManager.createHierarchicalPath("pipelines", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedPipelines as any, false, "pipeline", "id");

      logger.info(`Successfully wrote ${writtenCount} pipelines for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch pipelines for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
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
        query($fullPath: ID!) {
          ${areaType}(fullPath: $fullPath) {
            milestones {
              nodes {
                id
                iid
                title
                description
                state
                dueDate
                startDate
                createdAt
                updatedAt
                expired
                stats {
                  totalIssuesCount
                  closedIssuesCount
                }
              }
            }
          }
        }
      `;

      logger.info(`Fetching milestones for ${areaType}: ${areaPath}`);
      const data = (await this.client.query(query, { fullPath: areaPath })) as any;
      const milestones = (data[areaType] && data[areaType].milestones?.nodes) || [];

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
      // Split the full path to create hierarchy (e.g., "group/subgroup" => ["group", "subgroup"])
      const hierarchy = areaPath.split("/");
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
        query($fullPath: ID!, $first: Int, $after: String) {
          project(fullPath: $fullPath) {
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
                descriptionHtml
                state
                createdAt
                updatedAt
                closedAt
                dueDate
                confidential
                discussionLocked
                upvotes
                downvotes
                userNotesCount
                webUrl
                relativePosition
                emailsDisabled
                subscribed
                timeEstimate
                totalTimeSpent
                humanTimeEstimate
                humanTotalTimeSpent
                author {
                  id
                  username
                  name
                  avatarUrl
                  webUrl
                }
                assignees {
                  nodes {
                    id
                    username
                    name
                    avatarUrl
                    webUrl
                  }
                }
                labels {
                  nodes {
                    id
                    title
                    description
                    color
                    textColor
                  }
                }
                milestone {
                  id
                  iid
                  title
                  description
                  state
                }
                taskCompletionStatus {
                  count
                  completedCount
                }
                reference
                moved
                severity
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
          fullPath: projectPath,
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
      // Split the full path to create hierarchy (e.g., "group/subgroup/project" => ["group", "subgroup", "project"])
      const hierarchy = projectPath.split("/");
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
        query($fullPath: ID!, $first: Int, $after: String) {
          project(fullPath: $fullPath) {
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
                reference
                webUrl
                upvotes
                downvotes
                userNotesCount
                draft
                mergeable
                author {
                  id
                  username
                  name
                  avatarUrl
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
                  state
                }
                approved
                commitCount
                diffStats {
                  additions
                  deletions
                }
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
          fullPath: projectPath,
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
      // Split the full path to create hierarchy (e.g., "group/subgroup/project" => ["group", "subgroup", "project"])
      const hierarchy = projectPath.split("/");
      const filePath = this.storageManager.createHierarchicalPath("mergerequests", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedMergeRequests as any, false, "merge_request", "id");

      logger.info(`Successfully wrote ${writtenCount} merge requests for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch merge requests for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetch snippets for a project
   */
  async fetchSnippets(projectId: string, projectPath: string, callback: (snippet: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      const query = `
        query($fullPath: ID!, $first: Int, $after: String) {
          project(fullPath: $fullPath) {
            snippets(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                title
                description
                fileName
                visibilityLevel
                createdAt
                updatedAt
                author {
                  id
                  username
                  name
                }
                blobs {
                  nodes {
                    name
                    path
                  }
                }
              }
            }
          }
        }
      `;

      logger.info(`Fetching snippets for project: ${projectPath}`);

      let hasNextPage = true;
      let after: string | null = null;
      let allSnippets: unknown[] = [];

      while (hasNextPage) {
        const data: any = await this.client.query(query, {
          fullPath: projectPath,
          first: 100,
          after,
        });

        const snippetsData: any = (data["project"] && (data["project"] as any).snippets) || [];
        const snippets = snippetsData?.nodes || [];
        allSnippets = allSnippets.concat(snippets);

        hasNextPage = snippetsData?.pageInfo?.hasNextPage || false;
        after = snippetsData?.pageInfo?.endCursor || null;

        logger.debug(`Fetched ${snippets.length} snippets (total: ${allSnippets.length}) for ${projectPath}`);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "snippets",
      };

      const processedSnippets: unknown[] = [];
      for (const snippet of allSnippets) {
        const processedSnippet = callback(snippet, context);
        if (processedSnippet) {
          processedSnippets.push(processedSnippet);
        }
      }

      const hierarchy = projectPath.split("/");
      const filePath = this.storageManager.createHierarchicalPath("snippets", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedSnippets as any, false, "snippet", "id");

      logger.info(`Successfully wrote ${writtenCount} snippets for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch snippets for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetch boards for a group or project
   */
  async fetchBoards(areaType: "group" | "project", areaId: string, areaPath: string, callback: (board: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      const query = `
        query($fullPath: ID!, $first: Int, $after: String) {
          ${areaType}(fullPath: $fullPath) {
            boards(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                name
                createdAt
                updatedAt
                lists {
                  nodes {
                    id
                    title
                    listType
                    position
                  }
                }
              }
            }
          }
        }
      `;

      logger.info(`Fetching boards for ${areaType}: ${areaPath}`);

      let hasNextPage = true;
      let after: string | null = null;
      let allBoards: unknown[] = [];

      while (hasNextPage) {
        const data: any = await this.client.query(query, {
          fullPath: areaPath,
          first: 100,
          after,
        });

        const boardsData: any = (data[areaType] && (data[areaType] as any).boards) || [];
        const boards = boardsData?.nodes || [];
        allBoards = allBoards.concat(boards);

        hasNextPage = boardsData?.pageInfo?.hasNextPage || false;
        after = boardsData?.pageInfo?.endCursor || null;

        logger.debug(`Fetched ${boards.length} boards (total: ${allBoards.length}) for ${areaPath}`);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: areaId,
        resourceType: "boards",
      };

      const processedBoards: unknown[] = [];
      for (const board of allBoards) {
        const processedBoard = callback(board, context);
        if (processedBoard) {
          processedBoards.push(processedBoard);
        }
      }

      const hierarchy = areaPath.split("/");
      const filePath = this.storageManager.createHierarchicalPath("boards", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedBoards as any, false, "board", "id");

      logger.info(`Successfully wrote ${writtenCount} boards for ${areaPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch boards for ${areaType} ${areaPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetch tags for a project
   */
  async fetchTags(projectId: string, projectPath: string, callback: (tag: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      const query = `
        query($fullPath: ID!, $first: Int, $after: String) {
          project(fullPath: $fullPath) {
            repository {
              tags(first: $first, after: $after) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  name
                  message
                  target {
                    ... on Commit {
                      id
                      sha
                      shortId
                      title
                      authoredDate
                      committedDate
                      author {
                        name
                        email
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      logger.info(`Fetching tags for project: ${projectPath}`);

      let hasNextPage = true;
      let after: string | null = null;
      let allTags: unknown[] = [];

      while (hasNextPage) {
        const data: any = await this.client.query(query, {
          fullPath: projectPath,
          first: 100,
          after,
        });

        const tagsData: any = (data["project"]?.repository && (data["project"].repository as any).tags) || [];
        const tags = tagsData?.nodes || [];
        allTags = allTags.concat(tags);

        hasNextPage = tagsData?.pageInfo?.hasNextPage || false;
        after = tagsData?.pageInfo?.endCursor || null;

        logger.debug(`Fetched ${tags.length} tags (total: ${allTags.length}) for ${projectPath}`);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "tags",
      };

      const processedTags: unknown[] = [];
      for (const tag of allTags) {
        const processedTag = callback(tag, context);
        if (processedTag) {
          processedTags.push(processedTag);
        }
      }

      const hierarchy = projectPath.split("/");
      const filePath = this.storageManager.createHierarchicalPath("tags", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedTags as any, false);

      logger.info(`Successfully wrote ${writtenCount} tags for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch tags for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetch discussions (with notes) for a project
   */
  async fetchDiscussions(projectId: string, projectPath: string, callback: (discussion: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      const query = `
        query($fullPath: ID!, $first: Int, $after: String) {
          project(fullPath: $fullPath) {
            issues(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                iid
                discussions {
                  nodes {
                    id
                    createdAt
                    notes {
                      nodes {
                        id
                        body
                        createdAt
                        updatedAt
                        author {
                          id
                          username
                          name
                        }
                        system
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      logger.info(`Fetching discussions for project: ${projectPath}`);

      let hasNextPage = true;
      let after: string | null = null;
      const allDiscussions: unknown[] = [];

      while (hasNextPage) {
        const data: any = await this.client.query(query, {
          fullPath: projectPath,
          first: 100,
          after,
        });

        const issuesData: any = (data["project"] && (data["project"] as any).issues) || [];
        const issues = issuesData?.nodes || [];

        // Extract discussions from issues
        for (const issue of issues) {
          const discussions = issue.discussions?.nodes || [];
          for (const discussion of discussions) {
            allDiscussions.push({
              ...discussion,
              issueIid: issue.iid,
            });
          }
        }

        hasNextPage = issuesData?.pageInfo?.hasNextPage || false;
        after = issuesData?.pageInfo?.endCursor || null;

        logger.debug(`Fetched discussions from ${issues.length} issues (total: ${allDiscussions.length}) for ${projectPath}`);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "discussions",
      };

      const processedDiscussions: unknown[] = [];
      for (const discussion of allDiscussions) {
        const processedDiscussion = callback(discussion, context);
        if (processedDiscussion) {
          processedDiscussions.push(processedDiscussion);
        }
      }

      const hierarchy = projectPath.split("/");
      const filePath = this.storageManager.createHierarchicalPath("discussions", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedDiscussions as any, false);

      logger.info(`Successfully wrote ${writtenCount} discussions for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch discussions for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetch epics for a group (premium/ultimate feature)
   */
  async fetchEpics(groupId: string, groupPath: string, callback: (epic: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      const query = `
        query($fullPath: ID!, $first: Int, $after: String) {
          group(fullPath: $fullPath) {
            epics(first: $first, after: $after) {
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
                startDate
                dueDate
                author {
                  id
                  username
                  name
                }
                labels {
                  nodes {
                    id
                    title
                    color
                  }
                }
              }
            }
          }
        }
      `;

      logger.info(`Fetching epics for group: ${groupPath}`);

      let hasNextPage = true;
      let after: string | null = null;
      let allEpics: unknown[] = [];

      while (hasNextPage) {
        const data: any = await this.client.query(query, {
          fullPath: groupPath,
          first: 100,
          after,
        });

        const epicsData: any = (data["group"] && (data["group"] as any).epics) || [];
        const epics = epicsData?.nodes || [];
        allEpics = allEpics.concat(epics);

        hasNextPage = epicsData?.pageInfo?.hasNextPage || false;
        after = epicsData?.pageInfo?.endCursor || null;

        logger.debug(`Fetched ${epics.length} epics (total: ${allEpics.length}) for ${groupPath}`);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: groupId,
        resourceType: "epics",
      };

      const processedEpics: unknown[] = [];
      for (const epic of allEpics) {
        const processedEpic = callback(epic, context);
        if (processedEpic) {
          processedEpics.push(processedEpic);
        }
      }

      const hierarchy = groupPath.split("/");
      const filePath = this.storageManager.createHierarchicalPath("epics", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedEpics as any, false);

      logger.info(`Successfully wrote ${writtenCount} epics for ${groupPath} to ${filePath}`);
    } catch (error) {
      // Epics are a premium/ultimate feature - log as warning if not available
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("epics") || errorMessage.includes("Field") || errorMessage.includes("premium") || errorMessage.includes("ultimate")) {
        logger.warn(`Epics feature not available for group ${groupPath} (requires GitLab Premium/Ultimate):`, { error: errorMessage });
      } else {
        logger.error(`Failed to fetch epics for group ${groupPath}:`, { error: errorMessage });
        throw error;
      }
    }
  }
}

/**
 * Factory function to create a CommonResourcesFetcher instance
 */
export const createCommonResourcesFetcher = async (): Promise<CommonResourcesFetcher> => {
  const config = await loadConfig();
  return new CommonResourcesFetcher(config);
};
