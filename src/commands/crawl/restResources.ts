import { GitLabRestClient } from "../../api/gitlabRestClient";
import { loadConfig } from "../../config/loader";
import type { CallbackContext } from "../../config/types";
import { createLogger } from "../../utils/logger";
import { StorageManager } from "../../utils/storageManager";

const logger = createLogger("restResources");

/**
 * Fetches REST-only resources such as repository details, commits, and file contents
 * This implements Step 4 of the GitLab crawling workflow
 */
export class RestResourcesFetcher {
  private config = loadConfig();
  private client: GitLabRestClient;
  private storageManager: StorageManager;

  constructor() {
    this.client = new GitLabRestClient(this.config.gitlab.host, this.config.gitlab.accessToken);
    this.storageManager = new StorageManager(this.config.output);
  }

  /**
   * Fetches repository branches for a specific project
   */
  async fetchBranches(projectId: string, projectPath: string, callback: (branch: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      logger.info(`Fetching branches for project: ${projectPath}`);
      const branches = await this.client.getBranches(projectId);

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "branches",
      };

      // Process branches through callback
      const processedBranches: unknown[] = [];
      for (const branch of branches) {
        const processedBranch = callback(branch, context);
        if (processedBranch) {
          processedBranches.push(processedBranch);
        }
      }

      // Store in hierarchical structure
      const hierarchy = ["groups", ...projectPath.split("/"), "projects", "repository"];
      const filePath = this.storageManager.createHierarchicalPath("branches", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedBranches, false);

      logger.info(`Successfully wrote ${writtenCount} branches for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch branches for project ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Fetches repository tags for a specific project
   */
  async fetchTags(projectId: string, projectPath: string, callback: (tag: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      logger.info(`Fetching tags for project: ${projectPath}`);
      const tags = await this.client.getTags(projectId);

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "tags",
      };

      // Process tags through callback
      const processedTags: unknown[] = [];
      for (const tag of tags) {
        const processedTag = callback(tag, context);
        if (processedTag) {
          processedTags.push(processedTag);
        }
      }

      // Store in hierarchical structure
      const hierarchy = ["groups", ...projectPath.split("/"), "projects", "repository"];
      const filePath = this.storageManager.createHierarchicalPath("tags", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedTags, false);

      logger.info(`Successfully wrote ${writtenCount} tags for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch tags for project ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Fetches commits for a specific project and branch
   */
  async fetchCommits(
    projectId: string,
    projectPath: string,
    branchName: string = "main",
    callback: (commit: unknown, context: CallbackContext) => unknown | null,
    maxCommits: number = 1000
  ): Promise<void> {
    try {
      logger.info(`Fetching commits for project: ${projectPath}, branch: ${branchName}`);

      let allCommits: unknown[] = [];
      let page = 1;
      const perPage = 100;

      // Paginate through commits until we reach maxCommits or no more commits
      while (allCommits.length < maxCommits) {
        const commits = await this.client.getCommits(projectId, {
          ref_name: branchName,
          per_page: perPage,
          page,
        });

        if (!commits || commits.length === 0) {
          break;
        }

        allCommits = allCommits.concat(commits);
        page++;

        // Limit to prevent excessive API calls
        if (commits.length < perPage) {
          break; // Last page reached
        }

        logger.debug(`Fetched ${commits.length} commits (total: ${allCommits.length}) for ${projectPath}/${branchName}`);
      }

      // Trim to maxCommits if we exceeded the limit
      if (allCommits.length > maxCommits) {
        allCommits = allCommits.slice(0, maxCommits);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "commits",
      };

      // Process commits through callback
      const processedCommits: unknown[] = [];
      for (const commit of allCommits) {
        const processedCommit = callback(commit, context);
        if (processedCommit) {
          processedCommits.push(processedCommit);
        }
      }

      // Store in hierarchical structure
      const hierarchy = ["groups", ...projectPath.split("/"), "projects", "repository", "branches", branchName];
      const filePath = this.storageManager.createHierarchicalPath("commits", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedCommits, false);

      logger.info(`Successfully wrote ${writtenCount} commits for ${projectPath}/${branchName} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch commits for project ${projectPath}, branch ${branchName}:`, error);
      throw error;
    }
  }

  /**
   * Fetches repository tree (file structure) for a specific project and branch
   */
  async fetchRepositoryTree(
    projectId: string,
    projectPath: string,
    branchName: string = "main",
    callback: (treeItem: unknown, context: CallbackContext) => unknown | null,
    recursive: boolean = true
  ): Promise<void> {
    try {
      logger.info(`Fetching repository tree for project: ${projectPath}, branch: ${branchName}`);
      const tree = await this.client.getRepositoryTree(projectId, {
        ref: branchName,
        recursive: recursive,
        per_page: 1000, // Get as many items as possible in one request
      });

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "tree",
      };

      // Process tree items through callback
      const processedTreeItems: unknown[] = [];
      for (const treeItem of tree) {
        const processedTreeItem = callback(treeItem, context);
        if (processedTreeItem) {
          processedTreeItems.push(processedTreeItem);
        }
      }

      // Store in hierarchical structure
      const hierarchy = ["groups", ...projectPath.split("/"), "projects", "repository", "branches", branchName];
      const filePath = this.storageManager.createHierarchicalPath("tree", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedTreeItems, false);

      logger.info(`Successfully wrote ${writtenCount} tree items for ${projectPath}/${branchName} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch repository tree for project ${projectPath}, branch ${branchName}:`, error);
      throw error;
    }
  }

  /**
   * Fetches project releases for a specific project
   */
  async fetchReleases(projectId: string, projectPath: string, callback: (release: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      logger.info(`Fetching releases for project: ${projectPath}`);

      let allReleases: unknown[] = [];
      let page = 1;
      const perPage = 100;

      // Paginate through releases
      while (true) {
        const releases = await this.client.getReleases(projectId, {
          per_page: perPage,
          page,
        });

        if (!releases || releases.length === 0) {
          break;
        }

        allReleases = allReleases.concat(releases);
        page++;

        if (releases.length < perPage) {
          break; // Last page reached
        }

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
      const hierarchy = ["groups", ...projectPath.split("/"), "projects"];
      const filePath = this.storageManager.createHierarchicalPath("releases", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedReleases, false);

      logger.info(`Successfully wrote ${writtenCount} releases for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch releases for project ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Fetches project pipelines for a specific project
   */
  async fetchPipelines(
    projectId: string,
    projectPath: string,
    callback: (pipeline: unknown, context: CallbackContext) => unknown | null,
    maxPipelines: number = 500
  ): Promise<void> {
    try {
      logger.info(`Fetching pipelines for project: ${projectPath}`);

      let allPipelines: unknown[] = [];
      let page = 1;
      const perPage = 100;

      // Paginate through pipelines until we reach maxPipelines
      while (allPipelines.length < maxPipelines) {
        const pipelines = await this.client.getPipelines(projectId, {
          per_page: perPage,
          page,
        });

        if (!pipelines || pipelines.length === 0) {
          break;
        }

        allPipelines = allPipelines.concat(pipelines);
        page++;

        if (pipelines.length < perPage) {
          break; // Last page reached
        }

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
      const hierarchy = ["groups", ...projectPath.split("/"), "projects"];
      const filePath = this.storageManager.createHierarchicalPath("pipelines", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedPipelines, false);

      logger.info(`Successfully wrote ${writtenCount} pipelines for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch pipelines for project ${projectPath}:`, error);
      throw error;
    }
  }

  /**
   * Fetches file content for a specific file in a project
   */
  async fetchFileContent(
    projectId: string,
    projectPath: string,
    filePath: string,
    branchName: string = "main",
    callback: (fileContent: unknown, context: CallbackContext) => unknown | null
  ): Promise<void> {
    try {
      logger.info(`Fetching file content: ${projectPath}/${filePath} (${branchName})`);
      const fileContent = await this.client.getFileContent(projectId, filePath, branchName);

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "fileContent",
      };

      // Process file content through callback
      const processedContent = callback(fileContent, context);
      if (processedContent) {
        // Store in hierarchical structure
        const sanitizedFilePath = filePath.replace(/[/\\:*?"<>|]/g, "_");
        const hierarchy = ["groups", ...projectPath.split("/"), "projects", "repository", "files"];
        const fileName = `${sanitizedFilePath}_content`;
        const outputPath = this.storageManager.createHierarchicalPath(fileName, hierarchy);
        const writtenCount = this.storageManager.writeJsonlFile(outputPath, [processedContent], false);

        logger.info(`Successfully wrote ${writtenCount} file content for ${filePath} to ${outputPath}`);
      }
    } catch (error) {
      logger.error(`Failed to fetch file content for ${projectPath}/${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Fetches project statistics and metadata
   */
  async fetchProjectMetadata(projectId: string, projectPath: string, callback: (metadata: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      logger.info(`Fetching project metadata for: ${projectPath}`);
      const project = await this.client.getProject(projectId);

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "projectMetadata",
      };

      // Process project metadata through callback
      const processedMetadata = callback(project, context);
      if (processedMetadata) {
        // Store in hierarchical structure
        const hierarchy = ["groups", ...projectPath.split("/"), "projects"];
        const filePath = this.storageManager.createHierarchicalPath("metadata", hierarchy);
        this.storageManager.writeJsonlFile(filePath, [processedMetadata], false);

        logger.info(`Successfully wrote project metadata for ${projectPath} to ${filePath}`);
      }
    } catch (error) {
      logger.error(`Failed to fetch project metadata for ${projectPath}:`, error);
      throw error;
    }
  }
}

/**
 * Factory function to create a RestResourcesFetcher instance
 */
export const createRestResourcesFetcher = (): RestResourcesFetcher => {
  return new RestResourcesFetcher();
};
