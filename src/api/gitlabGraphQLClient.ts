import { readFileSync } from "fs";
import { join } from "path";
import { createOAuth2Manager } from "../auth/oauth2Manager";
import { createLogger } from "../logging";
import type { GitLabProject, GitLabUser, GraphQLResponse, GroupNode, PageInfo, SafeRecord } from "../types/api.js";

const logger = createLogger("GitLabGraphQLClient");

// Load GraphQL queries
const loadQuery = (filename: string): string => {
  const queryPath = join(__dirname, "queries", filename);
  return readFileSync(queryPath, "utf-8").trim();
};

const FETCH_USERS_QUERY = loadQuery("fetchUsers.gql");
const FETCH_GROUPS_QUERY = loadQuery("fetchGroups.gql");
const FETCH_PROJECTS_QUERY = loadQuery("fetchProjects.gql");
const FETCH_GROUP_PROJECTS_QUERY = loadQuery("fetchGroupProjects.gql");
const FETCH_SUBGROUPS_QUERY = loadQuery("fetchSubgroups.gql");
const FETCH_GROUP_QUERY = loadQuery("fetchGroup.gql");
const FETCH_PROJECT_QUERY = loadQuery("fetchProject.gql");

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
      // Create abort controller for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        logger.debug(`Making fetch request to: ${this.baseUrl}`);
        logger.debug(`Using token: ${token.substring(0, 10)}...`);

        // For development environments with self-signed certificates, we need to disable TLS verification
        // This is handled by setting NODE_TLS_REJECT_UNAUTHORIZED=0 in the environment if needed
        console.log("FETCH REQUEST DETAILS:", {
          url: this.baseUrl,
          token: `${token.substring(0, 20)}...`,
          queryLength: query.length,
        });

        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ query, variables }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        logger.debug(`Fetch response status: ${response.status}`);
        console.log("FETCH RESPONSE DETAILS:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          ok: response.ok,
        });
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        logger.error("Fetch request failed with error:", {
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : "Unknown",
          errorStack: error instanceof Error ? error.stack : "No stack",
        });
        console.log(
          "DETAILED FETCH ERROR:",
          JSON.stringify(
            {
              message: error instanceof Error ? error.message : String(error),
              name: error instanceof Error ? error.name : "Unknown",
              stack: error instanceof Error ? error.stack : "No stack",
              cause: error instanceof Error ? error.cause : undefined,
            },
            null,
            2
          )
        );
        throw error;
      }
    };

    try {
      logger.debug(`Making GraphQL request to: ${this.baseUrl}`);

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
        const errorText = await response.text().catch(() => "Unable to read response body");
        logger.error(`Response not OK - Status: ${response.status}, Text: ${errorText}`);

        // Check if the error indicates an invalid or expired token
        if (response.status === 401) {
          const message = "Authentication failed: Invalid or expired access token. Please run 'copima auth' to re-authenticate.";
          logger.error(message, { status: response.status, response: errorText });
          throw new Error(message);
        }

        logger.error(`GraphQL request failed: ${response.status} - ${errorText}`);
        throw new Error(`GraphQL request failed: ${response.status} - ${errorText}`);
      }

      const result = (await response.json()) as unknown as GraphQLResponse<T>;
      if (!result || typeof result !== "object") {
        throw new Error("Invalid GraphQL response format");
      }
      if (result.errors && result.errors.length > 0) {
        logger.error("GraphQL errors:", { errors: result.errors });
        // Log the specific error details for debugging
        result.errors.forEach((error, index) => {
          logger.error(`GraphQL Error ${index + 1}:`, {
            message: error.message,
            locations: error.locations,
            path: error.path,
            extensions: (error as any).extensions,
          });
        });
        throw new Error(`GraphQL query returned errors: ${result.errors.map((e) => e.message).join(", ")}`);
      }

      return result.data;
    } catch (error) {
      logger.error("Caught error in query method:", {
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : "Unknown",
        errorType: typeof error,
      });

      // Handle specific connection errors
      if (error instanceof Error) {
        // Don't transform authentication errors into connection errors
        if (error.message.includes("Authentication failed")) {
          logger.error("Re-throwing authentication error as-is");
          throw error;
        }

        if (error.name === "AbortError") {
          const message = "Request timeout - unable to connect. Is the computer able to access the url?";
          logger.error(`Creating timeout error message: ${message}`);
          throw new Error(message);
        }

        if (
          error.message.includes("fetch failed") ||
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ENOTFOUND") ||
          error.message.includes("EHOSTUNREACH") ||
          error.message.includes("ENETUNREACH")
        ) {
          const message = "Unable to connect. Is the computer able to access the url?";
          logger.error(`Creating connection error message: ${message} (original: ${error.message})`);
          throw new Error(message);
        }
      }

      logger.error("Re-throwing original error:", {
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
    try {
      const data = await this.query<{ users: { nodes: GitLabUser[] } }>(FETCH_USERS_QUERY);
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
      const data = await this.query(FETCH_GROUPS_QUERY, { first, after });
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
    try {
      const data = await this.query(FETCH_PROJECTS_QUERY, { first, after });
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
    const query = FETCH_GROUP_PROJECTS_QUERY;

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
    const query = FETCH_SUBGROUPS_QUERY;

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
    const query = FETCH_GROUP_QUERY;

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
    const query = FETCH_PROJECT_QUERY;

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
