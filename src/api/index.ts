// API client factory functions and exports

import { GitLabGraphQLClient } from "./gitlabGraphQLClient";
import { GitLabRestClient } from "./gitlabRestClient";

// Re-export classes
export { GitLabGraphQLClient, GitLabRestClient };

// Factory functions for API clients
export const createRestClient = (baseURL: string, token: string): GitLabRestClient => {
  return new GitLabRestClient(baseURL, token);
};

export const createGraphQLClient = (baseURL: string, token: string): GitLabGraphQLClient => {
  return new GitLabGraphQLClient(baseURL, token);
};

// Re-export utility functions from REST client
export { fetchGroups, fetchIssues, fetchLabels, fetchMergeRequests, fetchMilestones, fetchProjects, fetchUsers } from "./gitlabRestClient";
