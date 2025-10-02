import { print } from "graphql";
import { createOAuth2Manager } from "../auth/oauth2Manager";
import { createLogger } from "../logging";
import type { PageInfo as CustomPageInfo, GitLabProject, GitLabUser, GroupNode, SafeRecord } from "../types/api.js";
import { graphql } from "./gql";
// Note: These specific queries may not exist - using comprehensive queries instead
import {
  FETCH_COMPREHENSIVE_GROUP_PROJECTS_QUERY,
  FETCH_COMPREHENSIVE_GROUP_QUERY,
  FETCH_COMPREHENSIVE_GROUPS_QUERY,
  FETCH_COMPREHENSIVE_SUBGROUPS_QUERY,
} from "./queries/groupQueries";
import { FETCH_COMPREHENSIVE_PROJECTS_QUERY } from "./queries/projectQueries";
import { FETCH_COMPREHENSIVE_USERS_QUERY } from "./queries/userQueries";

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

      const queryString = this.getQueryString(query);
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

  private getQueryString(query: any): string {
    if (typeof query === "string") return query;
    if (query?.loc?.source?.body) return query.loc.source.body;

    try {
      return print(query);
    } catch (error) {
      throw new Error(`Unable to serialize GraphQL query: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async fetchUsers(first: number = 100, after?: string): Promise<{ nodes: GitLabUser[]; pageInfo: PageInfo }> {
    try {
      const data = await this.query<any>(FETCH_COMPREHENSIVE_USERS_QUERY, { first, after });
      if (!data.users?.nodes || !data.users.pageInfo) throw new Error("Invalid data format");
      return {
        nodes: data.users.nodes as GitLabUser[],
        pageInfo: { ...data.users.pageInfo, endCursor: data.users.pageInfo.endCursor || undefined },
      };
    } catch (error) {
      logger.error("Failed to fetch users:", { error });
      throw error;
    }
  }

  async fetchAllUsers(): Promise<GitLabUser[]> {
    try {
      let allUsers: GitLabUser[] = [];
      let hasNextPage = true;
      let after: string | undefined = undefined;

      logger.info("Starting to fetch all users with pagination");

      while (hasNextPage) {
        const result = await this.fetchUsers(100, after);
        allUsers = allUsers.concat(result.nodes);

        hasNextPage = result.pageInfo.hasNextPage || false;
        after = result.pageInfo.endCursor || undefined;

        logger.debug(`Fetched ${result.nodes.length} users (total: ${allUsers.length})`);
      }

      logger.info(`Successfully fetched all ${allUsers.length} users across ${Math.ceil(allUsers.length / 100)} pages`);
      return allUsers;
    } catch (error) {
      logger.error("Failed to fetch all users:", { error });
      throw error;
    }
  }

  async fetchGroups(first: number = 100, after?: string): Promise<{ nodes: GroupNode[]; pageInfo: PageInfo }> {
    try {
      const data = await this.query<any>(FETCH_COMPREHENSIVE_GROUPS_QUERY, { first, after });
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

  async fetchAllGroups(): Promise<GroupNode[]> {
    try {
      let allGroups: GroupNode[] = [];
      let hasNextPage = true;
      let after: string | undefined = undefined;

      logger.info("Starting to fetch all groups with pagination");

      while (hasNextPage) {
        const result = await this.fetchGroups(100, after);
        allGroups = allGroups.concat(result.nodes);

        hasNextPage = result.pageInfo.hasNextPage || false;
        after = result.pageInfo.endCursor || undefined;

        logger.debug(`Fetched ${result.nodes.length} groups (total: ${allGroups.length})`);
      }

      logger.info(`Successfully fetched all ${allGroups.length} groups across ${Math.ceil(allGroups.length / 100)} pages`);
      return allGroups;
    } catch (error) {
      logger.error("Failed to fetch all groups:", { error });
      throw error;
    }
  }

  async fetchProjects(first: number = 100, after?: string): Promise<{ nodes: GitLabProject[]; pageInfo: PageInfo }> {
    try {
      const data = await this.query<any>(FETCH_COMPREHENSIVE_PROJECTS_QUERY, { first, after });
      if (!data.projects?.nodes || !data.projects.pageInfo) throw new Error("Invalid data format");
      return {
        nodes: (data.projects.nodes ?? []) as GitLabProject[],
        pageInfo: { ...data.projects.pageInfo, endCursor: data.projects.pageInfo.endCursor || undefined },
      };
    } catch (error) {
      logger.error("Failed to fetch projects:", { error });
      throw error;
    }
  }

  async fetchAllProjects(): Promise<GitLabProject[]> {
    try {
      let allProjects: GitLabProject[] = [];
      let hasNextPage = true;
      let after: string | undefined = undefined;

      logger.info("Starting to fetch all projects with pagination");

      while (hasNextPage) {
        const result = await this.fetchProjects(100, after);
        allProjects = allProjects.concat(result.nodes);

        hasNextPage = result.pageInfo.hasNextPage || false;
        after = result.pageInfo.endCursor || undefined;

        logger.debug(`Fetched ${result.nodes.length} projects (total: ${allProjects.length})`);
      }

      logger.info(`Successfully fetched all ${allProjects.length} projects across ${Math.ceil(allProjects.length / 100)} pages`);
      return allProjects;
    } catch (error) {
      logger.error("Failed to fetch all projects:", { error });
      throw error;
    }
  }

  async fetchGroupProjects(groupId: string, first: number = 100, after?: string): Promise<{ nodes: GitLabProject[]; pageInfo: PageInfo }> {
    try {
      const data = await this.query<any>(FETCH_COMPREHENSIVE_GROUP_PROJECTS_QUERY, { fullPath: groupId, first, after });
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

  async fetchAllGroupProjects(groupId: string): Promise<GitLabProject[]> {
    try {
      let allProjects: GitLabProject[] = [];
      let hasNextPage = true;
      let after: string | undefined = undefined;

      logger.info(`Starting to fetch all projects for group ${groupId} with pagination`);

      while (hasNextPage) {
        const result = await this.fetchGroupProjects(groupId, 100, after);
        allProjects = allProjects.concat(result.nodes);

        hasNextPage = result.pageInfo.hasNextPage || false;
        after = result.pageInfo.endCursor || undefined;

        logger.debug(`Fetched ${result.nodes.length} projects for group ${groupId} (total: ${allProjects.length})`);
      }

      logger.info(`Successfully fetched all ${allProjects.length} projects for group ${groupId} across ${Math.ceil(allProjects.length / 100)} pages`);
      return allProjects;
    } catch (error) {
      logger.error(`Failed to fetch all projects for group ${groupId}:`, { error });
      throw error;
    }
  }

  async fetchSubgroups(groupId: string, first: number = 100, after?: string): Promise<{ nodes: GroupNode[]; pageInfo: PageInfo }> {
    try {
      const data = await this.query<any>(FETCH_COMPREHENSIVE_SUBGROUPS_QUERY, { fullPath: groupId, first, after });
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

  async fetchAllSubgroups(groupId: string): Promise<GroupNode[]> {
    try {
      let allSubgroups: GroupNode[] = [];
      let hasNextPage = true;
      let after: string | undefined = undefined;

      logger.info(`Starting to fetch all subgroups for group ${groupId} with pagination`);

      while (hasNextPage) {
        const result = await this.fetchSubgroups(groupId, 100, after);
        allSubgroups = allSubgroups.concat(result.nodes);

        hasNextPage = result.pageInfo.hasNextPage || false;
        after = result.pageInfo.endCursor || undefined;

        logger.debug(`Fetched ${result.nodes.length} subgroups for group ${groupId} (total: ${allSubgroups.length})`);
      }

      logger.info(`Successfully fetched all ${allSubgroups.length} subgroups for group ${groupId} across ${Math.ceil(allSubgroups.length / 100)} pages`);
      return allSubgroups;
    } catch (error) {
      logger.error(`Failed to fetch all subgroups for group ${groupId}:`, { error });
      throw error;
    }
  }

  async fetchGroup(groupId: string): Promise<GroupNode> {
    try {
      const data = await this.query<any>(FETCH_COMPREHENSIVE_GROUP_QUERY, { fullPath: groupId });
      if (!data.group) throw new Error("Invalid data format");
      return data.group as GroupNode;
    } catch (error) {
      logger.error(`Failed to fetch group ${groupId}:`, { error });
      throw error;
    }
  }

  // Note: Single project fetch not available - use fetchGroupProjects and filter instead
  async fetchProject(_projectId: string): Promise<GitLabProject> {
    logger.warn("fetchProject is not available with current GraphQL schema - use fetchGroupProjects instead");
    throw new Error("fetchProject is not supported - use fetchGroupProjects and filter by project path");
  }
}
