import { createLogger } from '../utils/logger';

const logger = createLogger('GitLabRestClient');

import fetch from 'node-fetch';

export class GitLabRestClient {
  private baseUrl: string;
  private accessToken: string;

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  async request(endpoint: string, method: string = 'GET', body: Record<string, any> | null = null): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
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
      logger.error('REST request failed:', error);
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
    return this.request(`/projects/${projectId}/jobs/${jobId}/artifacts`, 'GET');
  }

  // Fetch job logs
  async fetchJobLogs(projectId: string, jobId: string): Promise<any> {
    return this.request(`/projects/${projectId}/jobs/${jobId}/trace`, 'GET');
  }

  // Fetch dependency list
  async fetchDependencyList(projectId: string): Promise<any> {
    return this.request(`/projects/${projectId}/dependencies`, 'GET');
  }

  // Add methods for specialized REST-only domains crawling (security, compliance, package registries)
  async fetchSecurityVulnerabilities(projectId: string): Promise<any> {
    return this.request(`/projects/${projectId}/vulnerabilities`, 'GET');
  }

  async fetchComplianceFrameworks(projectId: string): Promise<any> {
    return this.request(`/projects/${projectId}/compliance_frameworks`, 'GET');
  }

  async fetchPackageRegistries(projectId: string): Promise<any> {
    return this.request(`/projects/${projectId}/packages`, 'GET');
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
    const endpoint = `/projects/${projectId}/repository/commits${queryParams ? `?${queryParams}` : ''}`;
    return this.request(endpoint);
  }

  async getRepositoryTree(projectId: string, options: any = {}): Promise<any> {
    const queryParams = new URLSearchParams(options).toString();
    const endpoint = `/projects/${projectId}/repository/tree${queryParams ? `?${queryParams}` : ''}`;
    return this.request(endpoint);
  }

  async getReleases(projectId: string, options: any = {}): Promise<any> {
    const queryParams = new URLSearchParams(options).toString();
    const endpoint = `/projects/${projectId}/releases${queryParams ? `?${queryParams}` : ''}`;
    return this.request(endpoint);
  }

  async getPipelines(projectId: string, options: any = {}): Promise<any> {
    const queryParams = new URLSearchParams(options).toString();
    const endpoint = `/projects/${projectId}/pipelines${queryParams ? `?${queryParams}` : ''}`;
    return this.request(endpoint);
  }

  async getFileContent(projectId: string, filePath: string, ref: string = 'main'): Promise<any> {
    const encodedFilePath = encodeURIComponent(filePath);
    return this.request(`/projects/${projectId}/repository/files/${encodedFilePath}?ref=${ref}`);
  }

  async getProject(projectId: string): Promise<any> {
    return this.request(`/projects/${projectId}`);
  }
}

// Standalone utility functions that don't require class instance
export async function fetchGroups(client: GitLabRestClient): Promise<any[]> {
  return client.request('/groups', 'GET');
}

export async function fetchProjects(client: GitLabRestClient): Promise<any[]> {
  return client.request('/projects', 'GET');
}

export async function fetchUsers(client: GitLabRestClient): Promise<any[]> {
  return client.request('/users', 'GET');
}

export async function fetchLabels(client: GitLabRestClient): Promise<any[]> {
  return client.request('/labels', 'GET');
}

export async function fetchMilestones(client: GitLabRestClient): Promise<any[]> {
  return client.request('/milestones', 'GET');
}

export async function fetchIssues(client: GitLabRestClient): Promise<any[]> {
  return client.request('/issues', 'GET');
}

export async function fetchMergeRequests(client: GitLabRestClient): Promise<any[]> {
  return client.request('/merge_requests', 'GET');
}
