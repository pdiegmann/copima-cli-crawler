import fetch from "node-fetch";
import type { HttpMethod, SafeRecord } from "../types/api.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("GitLabRestClient");

export class GitLabRestClient {
  private baseUrl: string;
  private accessToken: string;

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
        body: body ? JSON.stringify(body) : null,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`REST request failed: ${response.status} - ${errorText}`);
        throw new Error(`REST request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error("REST request failed:", error);
      throw error;
    }
  }
  // Fetch repository branches
  async fetchBranches(projectId: string): Promise<any> {
    return await this.request(`/projects/${projectId}/repository/branches`);
  }

  // Fetch repository commits
  async fetchCommits(projectId: string): Promise<any> {
    return await this.request(`/projects/${projectId}/repository/commits`);
  }

  // Fetch repository tags
  async fetchTags(projectId: string): Promise<any> {
    return await this.request(`/projects/${projectId}/repository/tags`);
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
    const queryParams = new URLSearchParams(options).toString();
    const endpoint = `/projects/${projectId}/repository/commits${queryParams ? `?${queryParams}` : ""}`;
    return this.request(endpoint);
  }

  async getRepositoryTree(projectId: string, options: any = {}): Promise<any> {
    const queryParams = new URLSearchParams(options).toString();
    const endpoint = `/projects/${projectId}/repository/tree${queryParams ? `?${queryParams}` : ""}`;
    return this.request(endpoint);
  }

  async getReleases(projectId: string, options: any = {}): Promise<any> {
    const queryParams = new URLSearchParams(options).toString();
    const endpoint = `/projects/${projectId}/releases${queryParams ? `?${queryParams}` : ""}`;
    return this.request(endpoint);
  }

  async getPipelines(projectId: string, options: any = {}): Promise<any> {
    const queryParams = new URLSearchParams(options).toString();
    const endpoint = `/projects/${projectId}/pipelines${queryParams ? `?${queryParams}` : ""}`;
    return this.request(endpoint);
  }

  async getFileContent(projectId: string, filePath: string, ref: string = "main"): Promise<any> {
    const encodedFilePath = encodeURIComponent(filePath);
    return this.request(`/projects/${projectId}/repository/files/${encodedFilePath}?ref=${ref}`);
  }

  async getProject(projectId: string): Promise<any> {
    return this.request(`/projects/${projectId}`);
  }
}

// Standalone utility functions that don't require class instance
export const fetchGroups = async (client: GitLabRestClient): Promise<SafeRecord[]> => {
  return client.request("/groups", "GET");
};

export const fetchProjects = async (client: GitLabRestClient): Promise<SafeRecord[]> => {
  return client.request("/projects", "GET");
};

export const fetchUsers = async (client: GitLabRestClient): Promise<SafeRecord[]> => {
  return client.request("/users", "GET");
};

export const fetchLabels = async (client: GitLabRestClient): Promise<SafeRecord[]> => {
  return client.request("/labels", "GET");
};

export const fetchMilestones = async (client: GitLabRestClient): Promise<SafeRecord[]> => {
  return client.request("/milestones", "GET");
};

export const fetchIssues = async (client: GitLabRestClient): Promise<SafeRecord[]> => {
  return client.request("/issues", "GET");
};

export const fetchMergeRequests = async (client: GitLabRestClient): Promise<SafeRecord[]> => {
  return client.request("/merge_requests", "GET");
};
