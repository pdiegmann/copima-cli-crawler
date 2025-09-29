import { createOAuth2Manager } from "../auth/oauth2Manager";
import { createLogger } from "../logging";
import type { PageInfo as CustomPageInfo, GitLabProject, GitLabUser, GroupNode, SafeRecord } from "../types/api.js";
import { graphql } from "./gql";
import type { FetchGroupProjectsQuery, FetchGroupQuery, FetchGroupsQuery, FetchProjectQuery, FetchProjectsQuery, FetchSubgroupsQuery, FetchUsersQuery } from "./gql/graphql";
import {
  FetchGroupDocument,
  FetchGroupProjectsDocument,
  FetchGroupsDocument,
  FetchProjectDocument,
  FetchProjectsDocument,
  FetchSubgroupsDocument,
  FetchUsersDocument,
} from "./gql/graphql";

const logger = createLogger("GitLabGraphQLClient");

type PageInfo = Omit<CustomPageInfo, "endCursor"> & { endCursor?: string | null };

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

  async query<T>(query: any, variables: SafeRecord = {}): Promise<T> {
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

      const queryString = query.loc.source.body;
      let response = await makeRequest(this.accessToken, queryString);

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
          throw new Error("Authentication failed: Invalid or expired access token.");
        }

        throw new Error(`GraphQL request failed: ${response.status} - ${errorText}`);
      }

      const result = (await response.json()) as { data: T; errors?: Array<{ message: string }> };
      if (result.errors && result.errors.length > 0) {
        throw new Error(`GraphQL query returned errors: ${result.errors.map((e) => e.message).join(", ")}`);
      }

      return result.data;
    } catch (error) {
      logger.error("Caught error in query method:", {
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  async fetchUsers(): Promise<GitLabUser[]> {
    try {
      const data = await this.query<FetchUsersQuery>(FetchUsersDocument);
      if (!data.users?.nodes) throw new Error("Invalid data format");
      return data.users.nodes as GitLabUser[];
    } catch (error) {
      logger.error("Failed to fetch users:", { error });
      throw error;
    }
  }

  async fetchGroups(first: number = 100, after?: string): Promise<{ nodes: GroupNode[]; pageInfo: PageInfo }> {
    try {
      const data = await this.query<FetchGroupsQuery>(FetchGroupsDocument, { first, after });
      if (!data.groups?.nodes || !data.groups.pageInfo) throw new Error("Invalid data format");
      return {
        nodes: data.groups.nodes as GroupNode[],
        pageInfo: { ...data.groups.pageInfo, endCursor: data.groups.pageInfo.endCursor || undefined },
      };
    } catch (error) {
      logger.error("Failed to fetch groups:", { error });
      throw error;
    }
  }

  async fetchProjects(first: number = 100, after?: string): Promise<{ nodes: GitLabProject[]; pageInfo: PageInfo }> {
    try {
      const data = await this.query<FetchProjectsQuery>(FetchProjectsDocument, { first, after });
      if (!data.projects?.nodes || !data.projects.pageInfo) throw new Error("Invalid data format");
      return {
        nodes: data.projects.nodes as GitLabProject[],
        pageInfo: { ...data.projects.pageInfo, endCursor: data.projects.pageInfo.endCursor || undefined },
      };
    } catch (error) {
      logger.error("Failed to fetch projects:", { error });
      throw error;
    }
  }

  async fetchGroupProjects(groupId: string, first: number = 100, after?: string): Promise<{ nodes: GitLabProject[]; pageInfo: PageInfo }> {
    try {
      const data = await this.query<FetchGroupProjectsQuery>(FetchGroupProjectsDocument, { fullPath: groupId, first, after });
      if (!data.group?.projects?.nodes || !data.group.projects.pageInfo) throw new Error("Invalid data format");
      return {
        nodes: data.group.projects.nodes as GitLabProject[],
        pageInfo: { ...data.group.projects.pageInfo, endCursor: data.group.projects.pageInfo.endCursor || undefined },
      };
    } catch (error) {
      logger.error(`Failed to fetch projects for group ${groupId}:`, { error });
      throw error;
    }
  }

  async fetchSubgroups(groupId: string, first: number = 100, after?: string): Promise<{ nodes: GroupNode[]; pageInfo: PageInfo }> {
    try {
      const data = await this.query<FetchSubgroupsQuery>(FetchSubgroupsDocument, { fullPath: groupId, first, after });
      if (!data.group?.descendantGroups?.nodes || !data.group.descendantGroups.pageInfo) throw new Error("Invalid data format");
      return {
        nodes: data.group.descendantGroups.nodes as GroupNode[],
        pageInfo: { ...data.group.descendantGroups.pageInfo, endCursor: data.group.descendantGroups.pageInfo.endCursor || undefined },
      };
    } catch (error) {
      logger.error(`Failed to fetch subgroups for group ${groupId}:`, { error });
      throw error;
    }
  }

  async fetchGroup(groupId: string): Promise<GroupNode> {
    try {
      const data = await this.query<FetchGroupQuery>(FetchGroupDocument, { fullPath: groupId });
      if (!data.group) throw new Error("Invalid data format");
      return data.group as GroupNode;
    } catch (error) {
      logger.error(`Failed to fetch group ${groupId}:`, { error });
      throw error;
    }
  }

  async fetchProject(projectId: string): Promise<GitLabProject> {
    try {
      const data = await this.query<FetchProjectQuery>(FetchProjectDocument, { fullPath: projectId });
      if (!data.project) throw new Error("Invalid data format");
      return data.project as GitLabProject;
    } catch (error) {
      logger.error(`Failed to fetch project ${projectId}:`, { error });
      throw error;
    }
  }
}
