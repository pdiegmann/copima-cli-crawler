// API client factory functions and exports

import { GitLabRestClient } from "./gitlabRestClient";

// Re-export classes
export { GitLabRestClient };

// Factory functions for API clients
export const createRestClient = (baseURL: string, token: string): GitLabRestClient => {
  return new GitLabRestClient(baseURL, token);
};

// Re-export utility functions from REST client
export { fetchGroups, fetchIssues, fetchLabels, fetchMergeRequests, fetchMilestones, fetchProjects, fetchUsers } from "./gitlabRestClient";
