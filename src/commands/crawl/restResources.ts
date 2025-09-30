import { GitLabRestClient } from "../../api/gitlabRestClient";
import { loadConfig } from "../../config/loader";
import type { CallbackContext, Config } from "../../config/types";
import { createLogger } from "../../logging/logger";
import { StorageManager } from "../../storage/storageManager";

const logger = createLogger("restResources");

/**
 * Fetches REST-only resources such as repository details, commits, and file contents
 * This implements Step 4 of the GitLab crawling workflow
 */
export class RestResourcesFetcher {
  private config: Config;
  private client: GitLabRestClient;
  private storageManager: StorageManager;

  constructor(config: Config) {
    this.config = config;
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
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedBranches as any, false);

      logger.info(`Successfully wrote ${writtenCount} branches for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch branches for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
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
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedTags as any, false);

      logger.info(`Successfully wrote ${writtenCount} tags for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch tags for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
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
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedCommits as any, false);

      logger.info(`Successfully wrote ${writtenCount} commits for ${projectPath}/${branchName} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch commits for project ${projectPath}, branch ${branchName}:`, { error: error instanceof Error ? error.message : String(error) });
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
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedTreeItems as any, false);

      logger.info(`Successfully wrote ${writtenCount} tree items for ${projectPath}/${branchName} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch repository tree for project ${projectPath}, branch ${branchName}:`, { error: error instanceof Error ? error.message : String(error) });
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
        const writtenCount = this.storageManager.writeJsonlFile(outputPath, [processedContent] as any, false);

        logger.info(`Successfully wrote ${writtenCount} file content for ${filePath} to ${outputPath}`);
      }
    } catch (error) {
      logger.error(`Failed to fetch file content for ${projectPath}/${filePath}:`, { error: error instanceof Error ? error.message : String(error) });
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
        this.storageManager.writeJsonlFile(filePath, [processedMetadata] as any, false);

        logger.info(`Successfully wrote project metadata for ${projectPath} to ${filePath}`);
      }
    } catch (error) {
      logger.error(`Failed to fetch project metadata for ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches commit references (branches and tags) for a specific commit
   */
  async fetchCommitRefs(projectId: string, projectPath: string, commitSha: string, callback: (refs: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      logger.info(`Fetching commit references for: ${projectPath}/${commitSha}`);
      const refs = await this.client.request(`/projects/${projectId}/repository/commits/${commitSha}/refs`);

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "commitRefs",
      };

      // Process commit refs through callback
      const processedRefs = callback(refs, context);
      if (processedRefs) {
        // Store in hierarchical structure
        const hierarchy = ["groups", ...projectPath.split("/"), "projects", "repository", "commits"];
        const filePath = this.storageManager.createHierarchicalPath(`${commitSha}_refs`, hierarchy);
        this.storageManager.writeJsonlFile(filePath, [processedRefs] as any, false);

        logger.info(`Successfully wrote commit refs for ${commitSha} to ${filePath}`);
      }
    } catch (error) {
      logger.error(`Failed to fetch commit refs for ${commitSha}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches job artifacts for project jobs
   */
  async fetchJobArtifacts(projectId: string, projectPath: string, jobId: string, callback: (artifacts: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      logger.info(`Fetching job artifacts for: ${projectPath}/job/${jobId}`);
      const artifacts = await this.client.request(`/projects/${projectId}/jobs/${jobId}/artifacts`);

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "jobArtifacts",
      };

      // Process artifacts through callback
      const processedArtifacts = callback(artifacts, context);
      if (processedArtifacts) {
        // Store in hierarchical structure
        const hierarchy = ["groups", ...projectPath.split("/"), "projects", "jobs"];
        const filePath = this.storageManager.createHierarchicalPath(`${jobId}_artifacts`, hierarchy);
        this.storageManager.writeJsonlFile(filePath, [processedArtifacts] as any, false);

        logger.info(`Successfully wrote job artifacts for job ${jobId} to ${filePath}`);
      }
    } catch (error) {
      logger.error(`Failed to fetch job artifacts for job ${jobId}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches job logs for project jobs
   */
  async fetchJobLogs(projectId: string, projectPath: string, jobId: string, callback: (logs: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      logger.info(`Fetching job logs for: ${projectPath}/job/${jobId}`);
      const logs = await this.client.request(`/projects/${projectId}/jobs/${jobId}/trace`, "GET");

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "jobLogs",
      };

      // Process logs through callback
      const processedLogs = callback(logs, context);
      if (processedLogs) {
        // Store in hierarchical structure
        const hierarchy = ["groups", ...projectPath.split("/"), "projects", "jobs"];
        const filePath = this.storageManager.createHierarchicalPath(`${jobId}_logs`, hierarchy);
        this.storageManager.writeJsonlFile(filePath, [processedLogs] as any, false);

        logger.info(`Successfully wrote job logs for job ${jobId} to ${filePath}`);
      }
    } catch (error) {
      logger.error(`Failed to fetch job logs for job ${jobId}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches project dependencies
   */
  async fetchDependencies(projectId: string, projectPath: string, callback: (dependencies: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      logger.info(`Fetching dependencies for project: ${projectPath}`);

      let allDependencies: unknown[] = [];
      let page = 1;
      const perPage = 100;

      // Paginate through dependencies
      while (true) {
        const dependencies = await this.client.request(`/projects/${projectId}/dependencies?per_page=${perPage}&page=${page}`);

        if (!dependencies || !Array.isArray(dependencies) || dependencies.length === 0) {
          break;
        }

        allDependencies = allDependencies.concat(dependencies);
        page++;

        if (dependencies.length < perPage) {
          break; // Last page reached
        }

        logger.debug(`Fetched ${dependencies.length} dependencies (total: ${allDependencies.length}) for ${projectPath}`);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "dependencies",
      };

      // Process dependencies through callback
      const processedDependencies: unknown[] = [];
      for (const dependency of allDependencies) {
        const processedDependency = callback(dependency, context);
        if (processedDependency) {
          processedDependencies.push(processedDependency);
        }
      }

      // Store in hierarchical structure
      const hierarchy = ["groups", ...projectPath.split("/"), "projects"];
      const filePath = this.storageManager.createHierarchicalPath("dependencies", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedDependencies as any, false);

      logger.info(`Successfully wrote ${writtenCount} dependencies for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch dependencies for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches security vulnerabilities for a project
   */
  async fetchVulnerabilities(projectId: string, projectPath: string, callback: (vulnerability: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      logger.info(`Fetching vulnerabilities for project: ${projectPath}`);

      let allVulnerabilities: unknown[] = [];
      let page = 1;
      const perPage = 100;

      // Paginate through vulnerabilities
      while (true) {
        const vulnerabilities = await this.client.request(`/projects/${projectId}/vulnerabilities?per_page=${perPage}&page=${page}`);

        if (!vulnerabilities || !Array.isArray(vulnerabilities) || vulnerabilities.length === 0) {
          break;
        }

        allVulnerabilities = allVulnerabilities.concat(vulnerabilities);
        page++;

        if (vulnerabilities.length < perPage) {
          break; // Last page reached
        }

        logger.debug(`Fetched ${vulnerabilities.length} vulnerabilities (total: ${allVulnerabilities.length}) for ${projectPath}`);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "vulnerabilities",
      };

      // Process vulnerabilities through callback
      const processedVulnerabilities: unknown[] = [];
      for (const vulnerability of allVulnerabilities) {
        const processedVulnerability = callback(vulnerability, context);
        if (processedVulnerability) {
          processedVulnerabilities.push(processedVulnerability);
        }
      }

      // Store in hierarchical structure
      const hierarchy = ["groups", ...projectPath.split("/"), "projects", "security"];
      const filePath = this.storageManager.createHierarchicalPath("vulnerabilities", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedVulnerabilities as any, false);

      logger.info(`Successfully wrote ${writtenCount} vulnerabilities for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch vulnerabilities for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches packages for a project
   */
  async fetchPackages(projectId: string, projectPath: string, callback: (packageItem: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      logger.info(`Fetching packages for project: ${projectPath}`);

      let allPackages: unknown[] = [];
      let page = 1;
      const perPage = 100;

      // Paginate through packages
      while (true) {
        const packages = await this.client.request(`/projects/${projectId}/packages?per_page=${perPage}&page=${page}`);

        if (!packages || !Array.isArray(packages) || packages.length === 0) {
          break;
        }

        allPackages = allPackages.concat(packages);
        page++;

        if (packages.length < perPage) {
          break; // Last page reached
        }

        logger.debug(`Fetched ${packages.length} packages (total: ${allPackages.length}) for ${projectPath}`);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "packages",
      };

      // Process packages through callback
      const processedPackages: unknown[] = [];
      for (const packageItem of allPackages) {
        const processedPackage = callback(packageItem, context);
        if (processedPackage) {
          processedPackages.push(processedPackage);
        }
      }

      // Store in hierarchical structure
      const hierarchy = ["groups", ...projectPath.split("/"), "projects"];
      const filePath = this.storageManager.createHierarchicalPath("packages", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedPackages as any, false);

      logger.info(`Successfully wrote ${writtenCount} packages for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch packages for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}

/**
 * Factory function to create a RestResourcesFetcher instance
 */
export const createRestResourcesFetcher = async (): Promise<RestResourcesFetcher> => {
  const config = await loadConfig();
  return new RestResourcesFetcher(config);
};
