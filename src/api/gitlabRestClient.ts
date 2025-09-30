import { createLogger } from "../logging/logger";
import type { HttpMethod, SafeRecord } from "../types/api.js";

const logger = createLogger("GitLabRestClient");

export class GitLabRestClient {
  private readonly baseUrl: string;
  private readonly accessToken: string;

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  async request<T = SafeRecord>(endpoint: string, method: HttpMethod = "GET", body: SafeRecord | null = null): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`REST request failed: ${response.status} - ${errorText}`);
        throw new Error(`REST request failed: ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      logger.error("REST request failed:", error as SafeRecord);
      throw error;
    }
  }
  // Fetch repository branches with pagination
  async fetchBranches(projectId: string): Promise<any> {
    return await this.fetchAllPaginated(`/projects/${projectId}/repository/branches`);
  }

  // Fetch repository commits with pagination
  async fetchCommits(projectId: string): Promise<any> {
    return await this.fetchAllPaginated(`/projects/${projectId}/repository/commits`);
  }

  // Fetch repository tags with pagination
  async fetchTags(projectId: string): Promise<any> {
    return await this.fetchAllPaginated(`/projects/${projectId}/repository/tags`);
  }

  // Generic pagination method for REST APIs
  private async fetchAllPaginated(endpoint: string, options: { maxPages?: number; perPage?: number } = {}): Promise<any[]> {
    const maxPages = options.maxPages || 100; // Prevent infinite loops
    const perPage = options.perPage || 100;

    let allData: any[] = [];
    let page = 1;

    while (page <= maxPages) {
      try {
        const separator = endpoint.includes("?") ? "&" : "?";
        const paginatedEndpoint = `${endpoint}${separator}per_page=${perPage}&page=${page}`;

        const data = await this.request<any[]>(paginatedEndpoint);

        if (!Array.isArray(data) || data.length === 0) {
          break; // No more data
        }

        allData = allData.concat(data);

        // If we got fewer items than requested, we've reached the end
        if (data.length < perPage) {
          break;
        }

        page++;
      } catch (error) {
        logger.error(`Failed to fetch page ${page} from ${endpoint}:`, { error });
        break; // Stop on errors to prevent infinite loops
      }
    }

    logger.debug(`Fetched ${allData.length} items across ${page - 1} pages from ${endpoint}`);
    return allData;
  }

  // Fetch file blobs
  async fetchFileBlob(projectId: string, sha: string): Promise<any> {
    return await this.request(`/projects/${projectId}/repository/blobs/${sha}`);
  }

  // Fetch repository tree
  async fetchRepositoryTree(projectId: string): Promise<any> {
    return await this.request(`/projects/${projectId}/repository/tree`);
  }

  // Fetch job artifacts
  async fetchArtifacts(projectId: string, jobId: string): Promise<any> {
    return this.request(`/projects/${projectId}/jobs/${jobId}/artifacts`, "GET");
  }

  // Fetch job logs
  async fetchJobLogs(projectId: string, jobId: string): Promise<any> {
    return this.request(`/projects/${projectId}/jobs/${jobId}/trace`, "GET");
  }

  // Fetch dependency list
  async fetchDependencyList(projectId: string): Promise<any> {
    return this.request(`/projects/${projectId}/dependencies`, "GET");
  }

  // Add methods for specialized REST-only domains crawling (security, compliance, package registries)
  async fetchSecurityVulnerabilities(projectId: string): Promise<any> {
    return this.request(`/projects/${projectId}/vulnerabilities`, "GET");
  }

  async fetchComplianceFrameworks(projectId: string): Promise<any> {
    return this.request(`/projects/${projectId}/compliance_frameworks`, "GET");
  }

  async fetchPackageRegistries(projectId: string): Promise<any> {
    return this.request(`/projects/${projectId}/packages`, "GET");
  }

  // Additional methods for complete REST API coverage
  async getBranches(projectId: string): Promise<any> {
    return this.fetchBranches(projectId);
  }

  async getTags(projectId: string): Promise<any> {
    return this.fetchTags(projectId);
  }

  async getCommits(projectId: string, options: any = {}): Promise<any> {
    const baseEndpoint = `/projects/${projectId}/repository/commits`;

    // Handle pagination separately from other options
    const { per_page, page, ...otherOptions } = options;
    const queryParams = new URLSearchParams(otherOptions).toString();
    const baseUrl = queryParams ? `${baseEndpoint}?${queryParams}` : baseEndpoint;

    // If specific pagination is requested, use it; otherwise fetch all
    if (page !== undefined) {
      const separator = baseUrl.includes("?") ? "&" : "?";
      return this.request(`${baseUrl}${separator}per_page=${per_page || 100}&page=${page}`);
    }

    return this.fetchAllPaginated(baseUrl);
  }

  async getRepositoryTree(projectId: string, options: any = {}): Promise<any> {
    const baseEndpoint = `/projects/${projectId}/repository/tree`;

    // Handle pagination separately from other options
    const { per_page, page, ...otherOptions } = options;
    const queryParams = new URLSearchParams(otherOptions).toString();
    const baseUrl = queryParams ? `${baseEndpoint}?${queryParams}` : baseEndpoint;

    // If specific pagination is requested, use it; otherwise fetch all
    if (page !== undefined) {
      const separator = baseUrl.includes("?") ? "&" : "?";
      return this.request(`${baseUrl}${separator}per_page=${per_page || 100}&page=${page}`);
    }

    return this.fetchAllPaginated(baseUrl);
  }

  async getReleases(projectId: string, options: any = {}): Promise<any> {
    const baseEndpoint = `/projects/${projectId}/releases`;

    // Handle pagination separately from other options
    const { per_page, page, ...otherOptions } = options;
    const queryParams = new URLSearchParams(otherOptions).toString();
    const baseUrl = queryParams ? `${baseEndpoint}?${queryParams}` : baseEndpoint;

    // If specific pagination is requested, use it; otherwise fetch all
    if (page !== undefined) {
      const separator = baseUrl.includes("?") ? "&" : "?";
      return this.request(`${baseUrl}${separator}per_page=${per_page || 100}&page=${page}`);
    }

    return this.fetchAllPaginated(baseUrl);
  }

  async getPipelines(projectId: string, options: any = {}): Promise<any> {
    const baseEndpoint = `/projects/${projectId}/pipelines`;

    // Handle pagination separately from other options
    const { per_page, page, ...otherOptions } = options;
    const queryParams = new URLSearchParams(otherOptions).toString();
    const baseUrl = queryParams ? `${baseEndpoint}?${queryParams}` : baseEndpoint;

    // If specific pagination is requested, use it; otherwise fetch all
    if (page !== undefined) {
      const separator = baseUrl.includes("?") ? "&" : "?";
      return this.request(`${baseUrl}${separator}per_page=${per_page || 100}&page=${page}`);
    }

    return this.fetchAllPaginated(baseUrl);
  }

  async getFileContent(projectId: string, filePath: string, ref: string = "main"): Promise<any> {
    const encodedFilePath = encodeURIComponent(filePath);
    return this.request(`/projects/${projectId}/repository/files/${encodedFilePath}?ref=${ref}`);
  }

  async getProject(projectId: string): Promise<any> {
    return this.request(`/projects/${projectId}`);
  }
}

// Standalone utility functions that don't require class instance - now with pagination
export const fetchGroups = async (client: GitLabRestClient): Promise<SafeRecord[]> => {
  return (client as any).fetchAllPaginated("/groups");
};

export const fetchProjects = async (client: GitLabRestClient): Promise<SafeRecord[]> => {
  return (client as any).fetchAllPaginated("/projects");
};

export const fetchUsers = async (client: GitLabRestClient): Promise<SafeRecord[]> => {
  return (client as any).fetchAllPaginated("/users");
};

export const fetchLabels = async (client: GitLabRestClient): Promise<SafeRecord[]> => {
  return (client as any).fetchAllPaginated("/labels");
};

export const fetchMilestones = async (client: GitLabRestClient): Promise<SafeRecord[]> => {
  return (client as any).fetchAllPaginated("/milestones");
};

export const fetchIssues = async (client: GitLabRestClient): Promise<SafeRecord[]> => {
  return (client as any).fetchAllPaginated("/issues");
};

export const fetchMergeRequests = async (client: GitLabRestClient): Promise<SafeRecord[]> => {
  return (client as any).fetchAllPaginated("/merge_requests");
};
