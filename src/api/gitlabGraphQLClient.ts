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

type ProgressCallback = (current: number, total: number, phase: string) => void;
type PageCallback<T> = (nodes: T[], pageInfo: { hasNextPage: boolean; endCursor?: string }, totalFetched: number) => Promise<void>;

export class GitLabGraphQLClient {
  private baseUrl: string;
  private accessToken: string;
  private refreshToken?: string;
  private oauth2Config?: {
    clientId: string;
    clientSecret: string;
    tokenEndpoint: string;
  };
  private progressCallback?: ProgressCallback;

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
      onProgress?: ProgressCallback;
    }
  ) {
    this.baseUrl = `${baseUrl}/api/graphql`;
    this.accessToken = accessToken;
    this.refreshToken = options?.refreshToken;
    this.progressCallback = options?.onProgress;
    logger.debug(graphql.name);

    if (options?.oauth2) {
      this.oauth2Config = {
        ...options.oauth2,
        tokenEndpoint: options.oauth2.tokenEndpoint || `${baseUrl}/oauth/token`,
      };
    }
  }

  /**
   * Set progress callback for tracking fetch operations
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
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
      const errorMessages = result.errors.map((e) => e.message).join(", ");
      const errorMessage = `GraphQL query returned errors: ${errorMessages}`;
      // Don't log here - let calling code decide how to handle/log
      throw new Error(errorMessage);
    }

    return result.data;
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

  async fetchUsers(first: number = 40, after?: string): Promise<{ nodes: GitLabUser[]; pageInfo: PageInfo }> {
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

  /**
   * Stream users with incremental processing (recommended for large datasets)
   * @param onPage Callback invoked for each page of results - should store data immediately
   * @param options Fetching options including max users and resume cursor
   */
  async streamUsers(onPage: PageCallback<GitLabUser>, options?: { maxUsers?: number; resumeAfter?: string }): Promise<{ totalFetched: number; lastCursor?: string }> {
    try {
      let totalFetched = 0;
      let hasNextPage = true;
      let after: string | undefined = options?.resumeAfter;
      const maxUsers = options?.maxUsers;

      logger.info(
        maxUsers
          ? `Starting to stream users with pagination (max: ${maxUsers}${after ? `, resuming from cursor` : ""})`
          : `Starting to stream all users with pagination${after ? ` (resuming from cursor)` : ""}`
      );

      while (hasNextPage) {
        // If we have a max limit, adjust page size to not overfetch
        const pageSize = maxUsers ? Math.min(40, maxUsers - totalFetched) : 40;

        if (pageSize <= 0) break;

        const result = await this.fetchUsers(pageSize, after);

        // Process page immediately via callback (stores to disk)
        await onPage(
          result.nodes,
          {
            hasNextPage: result.pageInfo.hasNextPage || false,
            endCursor: result.pageInfo.endCursor || undefined,
          },
          totalFetched + result.nodes.length
        );

        totalFetched += result.nodes.length;

        // Report progress
        if (this.progressCallback) {
          this.progressCallback(totalFetched, maxUsers || totalFetched, "fetching");
        }

        // Check if we've hit the max limit
        if (maxUsers && totalFetched >= maxUsers) {
          logger.info(`Reached maximum user limit of ${maxUsers}`);
          break;
        }

        hasNextPage = result.pageInfo.hasNextPage || false;
        after = result.pageInfo.endCursor || undefined;

        logger.debug(`Fetched ${result.nodes.length} users (total: ${totalFetched})`);
      }

      logger.info(`Successfully streamed ${totalFetched} users across ${Math.ceil(totalFetched / 40)} pages`);
      return { totalFetched, lastCursor: after };
    } catch (error) {
      logger.error("Failed to stream users:", { error });
      throw error;
    }
  }

  /**
   * Fetch all users (legacy method - buffers in memory)
   * @deprecated Use streamUsers for better memory efficiency and resume support
   */
  async fetchAllUsers(options?: { maxUsers?: number }): Promise<GitLabUser[]> {
    const allUsers: GitLabUser[] = [];

    await this.streamUsers(async (nodes) => {
      allUsers.push(...nodes);
    }, options);

    return allUsers;
  }

  async fetchGroups(first: number = 40, after?: string): Promise<{ nodes: GroupNode[]; pageInfo: PageInfo }> {
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

  /**
   * Stream groups with incremental processing (recommended for large datasets)
   * @param onPage Callback invoked for each page of results - should store data immediately
   * @param options Fetching options including max groups and resume cursor
   */
  async streamGroups(onPage: PageCallback<GroupNode>, options?: { maxGroups?: number; resumeAfter?: string }): Promise<{ totalFetched: number; lastCursor?: string }> {
    try {
      let totalFetched = 0;
      let hasNextPage = true;
      let after: string | undefined = options?.resumeAfter;
      const maxGroups = options?.maxGroups;

      logger.info(
        maxGroups
          ? `Starting to stream groups with pagination (max: ${maxGroups}${after ? `, resuming from cursor` : ""})`
          : `Starting to stream all groups with pagination${after ? ` (resuming from cursor)` : ""}`
      );

      while (hasNextPage) {
        // If we have a max limit, adjust page size to not overfetch
        const pageSize = maxGroups ? Math.min(40, maxGroups - totalFetched) : 40;

        if (pageSize <= 0) break;

        const result = await this.fetchGroups(pageSize, after);

        // Process page immediately via callback (stores to disk)
        await onPage(
          result.nodes,
          {
            hasNextPage: result.pageInfo.hasNextPage || false,
            endCursor: result.pageInfo.endCursor || undefined,
          },
          totalFetched + result.nodes.length
        );

        totalFetched += result.nodes.length;

        // Report progress
        if (this.progressCallback) {
          this.progressCallback(totalFetched, maxGroups || totalFetched, "fetching");
        }

        // Check if we've hit the max limit
        if (maxGroups && totalFetched >= maxGroups) {
          logger.info(`Reached maximum group limit of ${maxGroups}`);
          break;
        }

        hasNextPage = result.pageInfo.hasNextPage || false;
        after = result.pageInfo.endCursor || undefined;

        logger.debug(`Fetched ${result.nodes.length} groups (total: ${totalFetched})`);
      }

      logger.info(`Successfully streamed ${totalFetched} groups across ${Math.ceil(totalFetched / 40)} pages`);
      return { totalFetched, lastCursor: after };
    } catch (error) {
      logger.error("Failed to stream groups:", { error });
      throw error;
    }
  }

  /**
   * Fetch all groups (legacy method - buffers in memory)
   * @deprecated Use streamGroups for better memory efficiency and resume support
   */
  async fetchAllGroups(options?: { maxGroups?: number }): Promise<GroupNode[]> {
    const allGroups: GroupNode[] = [];

    await this.streamGroups(async (nodes) => {
      allGroups.push(...nodes);
    }, options);

    return allGroups;
  }

  async fetchProjects(first: number = 40, after?: string): Promise<{ nodes: GitLabProject[]; pageInfo: PageInfo }> {
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

  /**
   * Stream projects with incremental processing (recommended for large datasets)
   * @param onPage Callback invoked for each page of results - should store data immediately
   * @param options Fetching options including max projects and resume cursor
   */
  async streamProjects(onPage: PageCallback<GitLabProject>, options?: { maxProjects?: number; resumeAfter?: string }): Promise<{ totalFetched: number; lastCursor?: string }> {
    try {
      let totalFetched = 0;
      let hasNextPage = true;
      let after: string | undefined = options?.resumeAfter;
      const maxProjects = options?.maxProjects;

      logger.info(
        maxProjects
          ? `Starting to stream projects with pagination (max: ${maxProjects}${after ? `, resuming from cursor` : ""})`
          : `Starting to stream all projects with pagination${after ? ` (resuming from cursor)` : ""}`
      );

      while (hasNextPage) {
        // If we have a max limit, adjust page size to not overfetch
        const pageSize = maxProjects ? Math.min(40, maxProjects - totalFetched) : 40;

        if (pageSize <= 0) break;

        const result = await this.fetchProjects(pageSize, after);

        // Process page immediately via callback (stores to disk)
        await onPage(
          result.nodes,
          {
            hasNextPage: result.pageInfo.hasNextPage || false,
            endCursor: result.pageInfo.endCursor || undefined,
          },
          totalFetched + result.nodes.length
        );

        totalFetched += result.nodes.length;

        // Report progress
        if (this.progressCallback) {
          this.progressCallback(totalFetched, maxProjects || totalFetched, "fetching");
        }

        // Check if we've hit the max limit
        if (maxProjects && totalFetched >= maxProjects) {
          logger.info(`Reached maximum project limit of ${maxProjects}`);
          break;
        }

        hasNextPage = result.pageInfo.hasNextPage || false;
        after = result.pageInfo.endCursor || undefined;

        logger.debug(`Fetched ${result.nodes.length} projects (total: ${totalFetched})`);
      }

      logger.info(`Successfully streamed ${totalFetched} projects across ${Math.ceil(totalFetched / 40)} pages`);
      return { totalFetched, lastCursor: after };
    } catch (error) {
      logger.error("Failed to stream projects:", { error });
      throw error;
    }
  }

  /**
   * Fetch all projects (legacy method - buffers in memory)
   * @deprecated Use streamProjects for better memory efficiency and resume support
   */
  async fetchAllProjects(options?: { maxProjects?: number }): Promise<GitLabProject[]> {
    const allProjects: GitLabProject[] = [];

    await this.streamProjects(async (nodes) => {
      allProjects.push(...nodes);
    }, options);

    return allProjects;
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
