import fetch from "node-fetch";
import { createLogger } from "../logging";
import type { GitLabProject, GitLabUser, GraphQLResponse, GroupNode, PageInfo, SafeRecord } from "../types/api.js";

const logger = createLogger("GitLabGraphQLClient");

export class GitLabGraphQLClient {
  private baseUrl: string;
  private accessToken: string;

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = `${baseUrl}/api/graphql`;
    this.accessToken = accessToken;
  }

  async query<T = SafeRecord>(query: string, variables: SafeRecord = {}): Promise<T> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`GraphQL request failed: ${response.status} - ${errorText}`);
        throw new Error(`GraphQL request failed: ${response.status}`);
      }

      const result = (await response.json()) as unknown as GraphQLResponse<T>;
      if (!result || typeof result !== "object") {
        throw new Error("Invalid GraphQL response format");
      }
      if (result.errors && result.errors.length > 0) {
        logger.error("GraphQL errors:", { errors: result.errors });
        throw new Error("GraphQL query returned errors");
      }

      return result.data;
    } catch (error) {
      logger.error("GraphQL query failed:", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetches all users from the GitLab GraphQL API.
   * Step 2 of the crawling workflow.
   */
  async fetchUsers(): Promise<GitLabUser[]> {
    const query = `
      query {
        users {
          nodes {
            id
            username
            name
            publicEmail
            createdAt
          }
        }
      }
    `;

    try {
      const data = await this.query<{ users: { nodes: GitLabUser[] } }>(query);
      return data.users.nodes;
    } catch (error) {
      logger.error("Failed to fetch users:", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetches all groups from the GitLab GraphQL API.
   * Step 1 of the crawling workflow.
   */
  async fetchGroups(first: number = 100, after?: string): Promise<{ nodes: GroupNode[]; pageInfo: PageInfo }> {
    const query = `
      query($first: Int, $after: String) {
        groups(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            name
            path
            fullName
            fullPath
            description
            visibility
            createdAt
            updatedAt
            webUrl
            avatarUrl
            parentId
            subgroupCreationLevel
            projectCreationLevel
          }
        }
      }
    `;

    try {
      const data = await this.query(query, { first, after });
      if (!data || typeof data !== "object" || !("groups" in data)) {
        throw new Error("Invalid response format for groups");
      }
      return (data as { groups: { nodes: GroupNode[]; pageInfo: PageInfo } }).groups;
    } catch (error) {
      logger.error("Failed to fetch groups:", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetches all projects from the GitLab GraphQL API.
   * Step 1 of the crawling workflow.
   */
  async fetchProjects(first: number = 100, after?: string): Promise<{ nodes: GitLabProject[]; pageInfo: PageInfo }> {
    const query = `
      query($first: Int, $after: String) {
        projects(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            name
            path
            fullPath
            description
            visibility
            createdAt
            updatedAt
            lastActivityAt
            webUrl
            avatarUrl
            defaultBranch
            archived
            forksCount
            starCount
            issuesEnabled
            mergeRequestsEnabled
            wikiEnabled
            snippetsEnabled
            containerRegistryEnabled
            lfsEnabled
            requestAccessEnabled
            nameWithNamespace
            pathWithNamespace
            topics
          }
        }
      }
    `;

    try {
      const data = await this.query(query, { first, after });
      return data["projects"] as { nodes: GitLabProject[]; pageInfo: PageInfo };
    } catch (error) {
      logger.error("Failed to fetch projects:", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetches projects within a specific group.
   * Part of Step 1 of the crawling workflow.
   */
  async fetchGroupProjects(groupId: string, first: number = 100, after?: string): Promise<{ nodes: GitLabProject[]; pageInfo: PageInfo }> {
    const query = `
      query($id: ID!, $first: Int, $after: String) {
        group(id: $id) {
          projects(first: $first, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              name
              path
              fullPath
              description
              visibility
              createdAt
              updatedAt
              lastActivityAt
              webUrl
              avatarUrl
              defaultBranch
              archived
              forksCount
              starCount
              issuesEnabled
              mergeRequestsEnabled
              wikiEnabled
              snippetsEnabled
              containerRegistryEnabled
              lfsEnabled
              requestAccessEnabled
              nameWithNamespace
              pathWithNamespace
              topics
            }
          }
        }
      }
    `;

    try {
      const data = await this.query(query, { id: groupId, first, after });
      if (!data || typeof data !== "object" || !("group" in data)) {
        throw new Error("Invalid response format for group projects");
      }
      return (
        (
          data as {
            group: { projects: { nodes: GitLabProject[]; pageInfo: PageInfo } };
          }
        ).group?.["projects"] || { nodes: [], pageInfo: { hasNextPage: false } }
      );
    } catch (error) {
      logger.error(`Failed to fetch projects for group ${groupId}:`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetches subgroups within a specific group.
   * Part of Step 1 of the crawling workflow.
   */
  async fetchSubgroups(groupId: string, first: number = 100, after?: string): Promise<{ nodes: GroupNode[]; pageInfo: PageInfo }> {
    const query = `
      query($id: ID!, $first: Int, $after: String) {
        group(id: $id) {
          subgroups(first: $first, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              name
              path
              fullName
              fullPath
              description
              visibility
              createdAt
              updatedAt
              webUrl
              avatarUrl
              parentId
              subgroupCreationLevel
              projectCreationLevel
            }
          }
        }
      }
    `;

    try {
      const data = await this.query(query, { id: groupId, first, after });
      if (!data || typeof data !== "object" || !("group" in data)) {
        throw new Error("Invalid response format for subgroups");
      }
      return (
        (
          data as {
            group: { subgroups: { nodes: GroupNode[]; pageInfo: PageInfo } };
          }
        ).group?.subgroups || { nodes: [], pageInfo: { hasNextPage: false } }
      );
    } catch (error) {
      logger.error(`Failed to fetch subgroups for group ${groupId}:`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Fetches a specific group by ID with detailed information.
   */
  async fetchGroup(groupId: string): Promise<GroupNode> {
    const query = `
      query($id: ID!) {
        group(id: $id) {
          id
          name
          path
          fullName
          fullPath
          description
          visibility
          createdAt
          updatedAt
          webUrl
          avatarUrl
          parentId
          subgroupCreationLevel
          projectCreationLevel
          repositorySizeLimit
          lfsEnabled
          requestAccessEnabled
          fullName
          fullPath
          rootStorageStatistics {
            storageSize
            repositorySize
            lfsObjectsSize
            buildArtifactsSize
            packagesSize
            snippetsSize
            uploadsSize
          }
        }
      }
    `;

    try {
      const data = await this.query(query, { id: groupId });
      if (!data || typeof data !== "object" || !("group" in data)) {
        throw new Error("Invalid response format for group");
      }
      return (data as { group: GroupNode }).group;
    } catch (error) {
      logger.error(`Failed to fetch group ${groupId}:`, { error });
      throw error;
    }
  }

  /**
   * Fetches a specific project by ID with detailed information.
   */
  async fetchProject(projectId: string): Promise<GitLabProject> {
    const query = `
      query($id: ID!) {
        project(id: $id) {
          id
          name
          path
          fullPath
          description
          visibility
          createdAt
          updatedAt
          lastActivityAt
          webUrl
          avatarUrl
          defaultBranch
          archived
          forksCount
          starCount
          issuesEnabled
          mergeRequestsEnabled
          wikiEnabled
          snippetsEnabled
          containerRegistryEnabled
          lfsEnabled
          requestAccessEnabled
          nameWithNamespace
          pathWithNamespace
          topics
          repository {
            exists
            empty
            rootRef
          }
          statistics {
            commitCount
            storageSize
            repositorySize
            lfsObjectsSize
            buildArtifactsSize
            packagesSize
            snippetsSize
            uploadsSize
          }
        }
      }
    `;

    try {
      const data = await this.query(query, { id: projectId });
      if (!data || typeof data !== "object" || !("project" in data)) {
        throw new Error("Invalid response format for project");
      }
      return (data as { project: GitLabProject }).project;
    } catch (error) {
      logger.error(`Failed to fetch project ${projectId}:`, { error });
      throw error;
    }
  }
}
