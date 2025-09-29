import { createOAuth2Manager } from "../auth/oauth2Manager";
import { createLogger } from "../logging";
import type { GitLabProject, GitLabUser, GroupNode, PageInfo, SafeRecord } from "../types/api.js";
import { graphql } from "./gql";

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
    logger.debug(graphql.name);

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

  async query<T = SafeRecord>(query: string | any, variables: SafeRecord = {}): Promise<T> {
    const makeRequest = async (token: string, queryString: string): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ query: queryString, variables }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    try {
      logger.debug(`Making GraphQL request to: ${this.baseUrl}`);

      // Extract query string from TypedDocumentNode or use string directly
      const queryString = typeof query === "string" ? query : query.loc.source.body;
      let response = await makeRequest(this.accessToken, queryString);

      // If we get a 401 and have refresh capability, try refreshing the token
      if (response.status === 401 && this.refreshToken && this.oauth2Config) {
        logger.info("Access token appears to be expired, attempting refresh");

        try {
          await this.refreshAccessToken();
          response = await makeRequest(this.accessToken, queryString);
        } catch (error) {
          logger.error("Failed to refresh token, proceeding with original error", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unable to read response body");

        if (response.status === 401) {
          const message = "Authentication failed: Invalid or expired access token. Please run 'copima auth' to re-authenticate.";
          throw new Error(message);
        }

        throw new Error(`GraphQL request failed: ${response.status} - ${errorText}`);
      }

      const result = (await response.json()) as unknown as { data: T; errors?: Array<{ message: string }> };
      if (!result || typeof result !== "object") {
        throw new Error("Invalid GraphQL response format");
      }
      if (result.errors && result.errors.length > 0) {
        throw new Error(`GraphQL query returned errors: ${result.errors.map((e) => e.message).join(", ")}`);
      }

      return result.data;
    } catch (error) {
      logger.error("Caught error in query method:", {
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof Error) {
        if (error.message.includes("Authentication failed")) {
          throw error;
        }

        if (error.name === "AbortError") {
          throw new Error("Request timeout - unable to connect. Is the computer able to access the url?");
        }

        if (
          error.message.includes("fetch failed") ||
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ENOTFOUND") ||
          error.message.includes("EHOSTUNREACH") ||
          error.message.includes("ENETUNREACH")
        ) {
          throw new Error("Unable to connect. Is the computer able to access the url?");
        }
      }

      throw error;
    }
  }

  /**
   * Fetches all users from the GitLab GraphQL API.
   * Step 2 of the crawling workflow.
   */
  async fetchUsers(): Promise<GitLabUser[]> {
    try {
      const data = await this.query(graphql`
        query FetchUsers {
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
      `);
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
    try {
      const data = await this.query(
        graphql`
          query FetchGroups($first: Int, $after: String) {
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
                parent {
                  id
                  fullPath
                }
                subgroupCreationLevel
                projectCreationLevel
              }
            }
          }
        `,
        { first, after }
      );
      return data.groups;
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
    try {
      const data = await this.query(
        graphql`
          query FetchProjects($first: Int, $after: String) {
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
                topics
              }
            }
          }
        `,
        { first, after }
      );
      return data.projects;
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
    try {
      const data = await this.query(
        graphql`
          query FetchGroupProjects($fullPath: ID!, $first: Int, $after: String) {
            group(fullPath: $fullPath) {
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
                  topics
                }
              }
            }
          }
        `,
        { fullPath: groupId, first, after }
      );
      return data.group.projects;
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
    try {
      const data = await this.query(
        graphql`
          query FetchSubgroups($fullPath: ID!, $first: Int, $after: String) {
            group(fullPath: $fullPath) {
              descendantGroups(first: $first, after: $after) {
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
                  parent {
                    id
                    fullPath
                  }
                  subgroupCreationLevel
                  projectCreationLevel
                }
              }
            }
          }
        `,
        { fullPath: groupId, first, after }
      );
      return data.group.descendantGroups;
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
    try {
      const data = await this.query(
        graphql`
          query FetchGroup($fullPath: ID!) {
            group(fullPath: $fullPath) {
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
              parent {
                id
                fullPath
              }
              subgroupCreationLevel
              projectCreationLevel
              actualRepositorySizeLimit
              lfsEnabled
              requestAccessEnabled
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
        `,
        { fullPath: groupId }
      );
      return data.group;
    } catch (error) {
      logger.error(`Failed to fetch group ${groupId}:`, { error });
      throw error;
    }
  }

  /**
   * Fetches a specific project by ID with detailed information.
   */
  async fetchProject(projectId: string): Promise<GitLabProject> {
    try {
      const data = await this.query(
        graphql`
          query FetchProject($fullPath: ID!) {
            project(fullPath: $fullPath) {
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
        `,
        { fullPath: projectId }
      );
      return data.project;
    } catch (error) {
      logger.error(`Failed to fetch project ${projectId}:`, { error });
      throw error;
    }
  }
}
