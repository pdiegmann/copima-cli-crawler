import { createOAuth2Manager } from "../auth/oauth2Manager";
import { createLogger } from "../logging";
import type { GitLabProject, GitLabUser, GraphQLResponse, GroupNode, PageInfo, SafeRecord } from "../types/api.js";

const logger = createLogger("GitLabGraphQLClient");

export class GitLabGraphQLClient {
  private baseUrl: string;
  private accessToken: string;
  private refreshToken?: string;
  private oauth2Config?: {
    clientId: string;
    clientSecret: string;
    tokenEndpoint: string;
  };

  constructor(
    baseUrl: string,
    accessToken: string,
    options?: {
      refreshToken?: string;
      oauth2?: {
        clientId: string;
        clientSecret: string;
        tokenEndpoint?: string;
      };
    }
  ) {
    this.baseUrl = `${baseUrl}/api/graphql`;
    this.accessToken = accessToken;
    this.refreshToken = options?.refreshToken;

    if (options?.oauth2) {
      this.oauth2Config = {
        ...options.oauth2,
        tokenEndpoint: options.oauth2.tokenEndpoint || `${baseUrl}/oauth/token`,
      };
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken || !this.oauth2Config) {
      throw new Error("Cannot refresh token: missing refresh token or OAuth2 configuration");
    }

    logger.info("Attempting to refresh expired access token");

    const oauth2Manager = createOAuth2Manager({
      enabled: true,
      clientId: this.oauth2Config.clientId,
      clientSecret: this.oauth2Config.clientSecret,
      tokenEndpoint: this.oauth2Config.tokenEndpoint,
      refreshThreshold: 300,
      maxRetries: 3,
    });

    try {
      const refreshedTokens = await oauth2Manager.refreshAccessToken({
        refreshToken: this.refreshToken,
        clientId: this.oauth2Config.clientId,
        clientSecret: this.oauth2Config.clientSecret,
      });

      // Update tokens
      this.accessToken = refreshedTokens.access_token;
      if (refreshedTokens.refresh_token) {
        this.refreshToken = refreshedTokens.refresh_token;
      }

      logger.info("Access token refreshed successfully");
    } catch (error) {
      logger.error("Failed to refresh access token:", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async query<T = SafeRecord>(query: string, variables: SafeRecord = {}): Promise<T> {
    const makeRequest = async (token: string): Promise<Response> => {
      // For development environments with self-signed certificates, we need to disable TLS verification
      // This is handled by setting NODE_TLS_REJECT_UNAUTHORIZED=0 in the environment if needed
      return await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
      });
    };

    try {
      let response = await makeRequest(this.accessToken);

      // If we get a 401 and have refresh capability, try refreshing the token
      if (response.status === 401 && this.refreshToken && this.oauth2Config) {
        logger.info("Access token appears to be expired, attempting refresh");

        try {
          await this.refreshAccessToken();
          // Retry with new token
          response = await makeRequest(this.accessToken);
        } catch (error) {
          logger.error("Failed to refresh token, proceeding with original error", {
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue with original 401 response
        }
      }

      if (!response.ok) {
        const errorText = await response.text();

        // Check if the error indicates an invalid or expired token
        if (response.status === 401 && (errorText.includes("invalid_token") || errorText.includes("Invalid token"))) {
          throw new Error(`Authentication failed: ${errorText}. The access token may be expired or invalid.`);
        }

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
