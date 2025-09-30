import { GitLabGraphQLClient } from "../../api/gitlabGraphQLClient";
import { loadConfig } from "../../config/loader";
import type { CallbackContext, Config } from "../../config/types";
import { createLogger } from "../../logging/logger";
import { StorageManager } from "../../storage/storageManager";

const logger = createLogger("commonResources");

/**
 * Fetches common resources that are available across groups and projects
 * This implements Step 3 of the GitLab crawling workflow
 */
export class CommonResourcesFetcher {
  private config: Config;
  private client: GitLabGraphQLClient;
  private storageManager: StorageManager;

  constructor(config: Config) {
    this.config = config;
    this.client = new GitLabGraphQLClient(this.config.gitlab.host, this.config.gitlab.accessToken);
    this.storageManager = new StorageManager(this.config.output);
  }

  /**
   * Fetches members for a specific group or project
   */
  async fetchMembers(areaType: "group" | "project", areaId: string, areaPath: string, callback: (member: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      const query = `
        query($id: ID!) {
          ${areaType}(id: $id) {
            groupMembers {
              nodes {
                id
                accessLevel {
                  integerValue
                  stringValue
                }
                user {
                  id
                  username
                  name
                  publicEmail
                  avatarUrl
                  webUrl
                  state
                  bio
                  location
                  organization
                  jobTitle
                  pronouns
                  bot
                  createdAt
                }
                createdBy {
                  id
                  username
                  name
                }
                createdAt
                updatedAt
                expiresAt
                inviteEmail
                inviteAcceptedAt
                requestedAt
                inviteSource
                mergeRequestInteraction {
                  canMerge
                  canUpdate
                }
              }
            }
          }
        }
      `;

      logger.info(`Fetching members for ${areaType}: ${areaPath}`);
      const data = (await this.client.query(query, { id: areaId })) as any;
      const members = (data[areaType] && data[areaType].groupMembers?.nodes) || [];

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: areaId,
        resourceType: "members",
      };

      // Process members through callback
      const processedMembers: unknown[] = [];
      for (const member of members) {
        const processedMember = callback(member, context);
        if (processedMember) {
          processedMembers.push(processedMember);
        }
      }

      // Store in hierarchical structure
      const hierarchy = areaType === "group" ? ["groups", areaPath] : ["groups", ...areaPath.split("/"), "projects"];
      const filePath = this.storageManager.createHierarchicalPath("members", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedMembers as any, false);

      logger.info(`Successfully wrote ${writtenCount} members for ${areaPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch members for ${areaType} ${areaPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches labels for a specific group or project
   */
  async fetchLabels(areaType: "group" | "project", areaId: string, areaPath: string, callback: (label: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      const query = `
        query($id: ID!) {
          ${areaType}(id: $id) {
            labels {
              nodes {
                id
                title
                description
                color
                textColor
                createdAt
                updatedAt
                lockOnMerge
                removeOnClose
              }
            }
          }
        }
      `;

      logger.info(`Fetching labels for ${areaType}: ${areaPath}`);
      const data = (await this.client.query(query, { id: areaId })) as any;
      const labels = (data[areaType] && data[areaType].labels?.nodes) || [];

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: areaId,
        resourceType: "labels",
      };

      // Process labels through callback
      const processedLabels: unknown[] = [];
      for (const label of labels) {
        const processedLabel = callback(label, context);
        if (processedLabel) {
          processedLabels.push(processedLabel);
        }
      }

      // Store in hierarchical structure
      const hierarchy = areaType === "group" ? ["groups", areaPath] : ["groups", ...areaPath.split("/"), "projects"];
      const filePath = this.storageManager.createHierarchicalPath("labels", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedLabels as any, false);

      logger.info(`Successfully wrote ${writtenCount} labels for ${areaPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch labels for ${areaType} ${areaPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches releases for a specific project via GraphQL
   */
  async fetchReleases(projectId: string, projectPath: string, callback: (release: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      const query = `
        query($id: ID!, $first: Int, $after: String) {
          project(id: $id) {
            releases(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                tagName
                tagPath
                name
                description
                descriptionHtml
                createdAt
                releasedAt
                upcomingRelease
                historicalRelease
                milestones {
                  nodes {
                    id
                    title
                    description
                    state
                    webUrl
                  }
                }
                evidences {
                  nodes {
                    id
                    sha
                    filepath
                    collectedAt
                  }
                }
                links {
                  editUrl
                  issuesUrl
                  mergeRequestsUrl
                  selfUrl
                }
                releaseAssets {
                  count
                  sources {
                    nodes {
                      format
                      url
                    }
                  }
                  links {
                    nodes {
                      id
                      name
                      url
                      directAssetUrl
                      linkType
                    }
                  }
                }
                author {
                  id
                  username
                  name
                  avatarUrl
                  webUrl
                  state
                }
                commit {
                  id
                  sha
                  shortId
                  title
                  message
                  authoredDate
                  committedDate
                  webUrl
                  author {
                    name
                    email
                    avatarUrl
                  }
                  committer {
                    name
                    email
                    avatarUrl
                  }
                }
              }
            }
          }
        }
      `;

      logger.info(`Fetching releases for project: ${projectPath}`);

      let hasNextPage = true;
      let after: string | null = null;
      let allReleases: unknown[] = [];

      // Paginate through all releases
      while (hasNextPage) {
        const data: any = await this.client.query(query, {
          id: projectId,
          first: 100,
          after,
        });

        const releasesData: any = (data["project"] && (data["project"] as any).releases) || [];
        const releases = releasesData?.nodes || [];
        allReleases = allReleases.concat(releases);

        hasNextPage = releasesData?.pageInfo?.hasNextPage || false;
        after = releasesData?.pageInfo?.endCursor || null;

        logger.debug(`Fetched ${releases.length} releases (total: ${allReleases.length}) for ${projectPath}`);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "releases",
      };

      // Process releases through callback
      const processedReleases: unknown[] = [];
      for (const release of allReleases) {
        const processedRelease = callback(release, context);
        if (processedRelease) {
          processedReleases.push(processedRelease);
        }
      }

      // Store in hierarchical structure
      const hierarchy = ["groups", ...projectPath.split("/"), "projects"];
      const filePath = this.storageManager.createHierarchicalPath("releases", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedReleases as any, false);

      logger.info(`Successfully wrote ${writtenCount} releases for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch releases for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches pipelines for a specific project via GraphQL
   */
  async fetchPipelines(
    projectId: string,
    projectPath: string,
    callback: (pipeline: unknown, context: CallbackContext) => unknown | null,
    maxPipelines: number = 500
  ): Promise<void> {
    try {
      const query = `
        query($id: ID!, $first: Int, $after: String) {
          project(id: $id) {
            pipelines(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                iid
                sha
                beforeSha
                status
                detailedStatus {
                  id
                  group
                  icon
                  text
                  label
                  tooltip
                  hasDetails
                  detailsPath
                  illustration
                  favicon
                  action {
                    id
                    path
                    title
                    icon
                    buttonTitle
                  }
                }
                source
                ref
                refPath
                tag
                yaml_errors: yamlErrors
                user {
                  id
                  username
                  name
                  avatarUrl
                  webUrl
                  state
                }
                createdAt
                updatedAt
                startedAt
                finishedAt
                committedAt
                duration
                queuedDuration
                coverage
                webUrl
                commit {
                  id
                  sha
                  shortId
                  title
                  message
                  description
                  authoredDate
                  committedDate
                  webUrl
                  author {
                    name
                    email
                    avatarUrl
                  }
                  committer {
                    name
                    email
                    avatarUrl
                  }
                }
                downstream {
                  nodes {
                    id
                    path
                    project {
                      id
                      name
                      fullPath
                    }
                  }
                }
                upstream {
                  id
                  path
                  project {
                    id
                    name
                    fullPath
                  }
                }
                retryable
                cancelable
                userPermissions {
                  adminPipeline
                  destroyPipeline
                  updatePipeline
                }
                configSource
                mergeRequestEventType
                mergeRequest {
                  id
                  iid
                  title
                  webUrl
                }
                warnings
                totalJobs
                warningMessages {
                  nodes {
                    content
                  }
                }
                securityReportSummary {
                  dast {
                    vulnerabilitiesCount
                    scannedResourcesCount
                  }
                  sast {
                    vulnerabilitiesCount
                    scannedResourcesCount
                  }
                  dependencyScanning {
                    vulnerabilitiesCount
                    scannedResourcesCount
                  }
                  containerScanning {
                    vulnerabilitiesCount
                    scannedResourcesCount
                  }
                  secretDetection {
                    vulnerabilitiesCount
                    scannedResourcesCount
                  }
                  coverageFuzzing {
                    vulnerabilitiesCount
                    scannedResourcesCount
                  }
                  apiFuzzing {
                    vulnerabilitiesCount
                    scannedResourcesCount
                  }
                }
                jobs {
                  nodes {
                    id
                    name
                    stage {
                      name
                      id
                    }
                    status
                    detailedStatus {
                      id
                      group
                      icon
                      text
                      label
                      tooltip
                    }
                    createdAt
                    startedAt
                    finishedAt
                    duration
                    queuedDuration
                    webUrl
                    webPath
                    playable
                    retryable
                    cancelable
                    scheduledAt
                    allowFailure
                    tags
                    refName
                    refPath
                    artifacts {
                      nodes {
                        name
                        path
                        fileType
                        fileFormat
                        size
                        downloadPath
                      }
                    }
                    needs {
                      nodes {
                        id
                        name
                      }
                    }
                    userPermissions {
                      readBuild
                      readJobArtifacts
                      updateBuild
                    }
                  }
                }
                stages {
                  nodes {
                    id
                    name
                    status
                    detailedStatus {
                      id
                      group
                      icon
                      text
                      label
                    }
                    groups {
                      nodes {
                        id
                        name
                        size
                        status
                        detailedStatus {
                          id
                          group
                          icon
                          text
                          label
                        }
                        jobs {
                          nodes {
                            id
                            name
                            status
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      logger.info(`Fetching pipelines for project: ${projectPath}`);

      let hasNextPage = true;
      let after: string | null = null;
      let allPipelines: unknown[] = [];

      // Paginate through pipelines until we reach maxPipelines
      while (hasNextPage && allPipelines.length < maxPipelines) {
        const data: any = await this.client.query(query, {
          id: projectId,
          first: Math.min(100, maxPipelines - allPipelines.length),
          after,
        });

        const pipelinesData: any = (data["project"] && (data["project"] as any).pipelines) || [];
        const pipelines = pipelinesData?.nodes || [];
        allPipelines = allPipelines.concat(pipelines);

        hasNextPage = pipelinesData?.pageInfo?.hasNextPage || false;
        after = pipelinesData?.pageInfo?.endCursor || null;

        logger.debug(`Fetched ${pipelines.length} pipelines (total: ${allPipelines.length}) for ${projectPath}`);
      }

      // Trim to maxPipelines if we exceeded the limit
      if (allPipelines.length > maxPipelines) {
        allPipelines = allPipelines.slice(0, maxPipelines);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "pipelines",
      };

      // Process pipelines through callback
      const processedPipelines: unknown[] = [];
      for (const pipeline of allPipelines) {
        const processedPipeline = callback(pipeline, context);
        if (processedPipeline) {
          processedPipelines.push(processedPipeline);
        }
      }

      // Store in hierarchical structure
      const hierarchy = ["groups", ...projectPath.split("/"), "projects"];
      const filePath = this.storageManager.createHierarchicalPath("pipelines", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedPipelines as any, false);

      logger.info(`Successfully wrote ${writtenCount} pipelines for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch pipelines for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches milestones for a specific group or project
   */
  async fetchMilestones(
    areaType: "group" | "project",
    areaId: string,
    areaPath: string,
    callback: (milestone: unknown, context: CallbackContext) => unknown | null
  ): Promise<void> {
    try {
      const query = `
        query($id: ID!) {
          ${areaType}(id: $id) {
            milestones {
              nodes {
                id
                iid
                title
                description
                state
                dueDate
                startDate
                createdAt
                updatedAt
                webUrl
                projectId
                groupId
                expired
                upcomingDue
                stats {
                  totalIssuesCount
                  closedIssuesCount
                }
              }
            }
          }
        }
      `;

      logger.info(`Fetching milestones for ${areaType}: ${areaPath}`);
      const data = (await this.client.query(query, { id: areaId })) as any;
      const milestones = (data[areaType] && data[areaType].milestones?.nodes) || [];

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: areaId,
        resourceType: "milestones",
      };

      // Process milestones through callback
      const processedMilestones: unknown[] = [];
      for (const milestone of milestones) {
        const processedMilestone = callback(milestone, context);
        if (processedMilestone) {
          processedMilestones.push(processedMilestone);
        }
      }

      // Store in hierarchical structure
      const hierarchy = areaType === "group" ? ["groups", areaPath] : ["groups", ...areaPath.split("/"), "projects"];
      const filePath = this.storageManager.createHierarchicalPath("milestones", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedMilestones as any, false);

      logger.info(`Successfully wrote ${writtenCount} milestones for ${areaPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch milestones for ${areaType} ${areaPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches issues for a specific project
   */
  async fetchIssues(projectId: string, projectPath: string, callback: (issue: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      const query = `
        query($id: ID!, $first: Int, $after: String) {
          project(id: $id) {
            issues(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                iid
                title
                description
                descriptionHtml
                state
                createdAt
                updatedAt
                closedAt
                dueDate
                confidential
                discussionLocked
                upvotes
                downvotes
                userNotesCount
                webUrl
                relativePosition
                emailsDisabled
                subscribed
                timeEstimate
                totalTimeSpent
                humanTimeEstimate
                humanTotalTimeSpent
                closedBy {
                  id
                  username
                  name
                }
                author {
                  id
                  username
                  name
                  avatarUrl
                  webUrl
                }
                assignees {
                  nodes {
                    id
                    username
                    name
                    avatarUrl
                    webUrl
                  }
                }
                labels {
                  nodes {
                    id
                    title
                    description
                    color
                    textColor
                  }
                }
                milestone {
                  id
                  iid
                  title
                  description
                  state
                  webUrl
                }
                taskCompletionStatus {
                  count
                  completedCount
                }
                healthStatus
                weight
                blocked
                blockedByCount
                epic {
                  id
                  iid
                  title
                  webUrl
                }
                iteration {
                  id
                  title
                  description
                  state
                  webUrl
                }
                userPermissions {
                  adminIssue
                  createNote
                  pushCode
                  readIssue
                  reopenIssue
                  updateIssue
                }
                reference
                moved
                movedTo {
                  id
                  iid
                  title
                }
                duplicatedTo {
                  id
                  iid
                  title
                }
                serviceType
                severity
                alertManagementAlert {
                  id
                  iid
                  title
                  description
                  severity
                  status
                  service
                  monitoringTool
                  startedAt
                  endedAt
                  eventCount
                  fingerprint
                }
                customerRelationsContacts {
                  nodes {
                    id
                    firstName
                    lastName
                    email
                    phone
                    description
                    organization {
                      id
                      name
                    }
                  }
                }
                escalationStatus
                escalationPolicy {
                  id
                  name
                  description
                }
              }
            }
          }
        }
      `;

      logger.info(`Fetching issues for project: ${projectPath}`);

      let hasNextPage = true;
      let after: string | null = null;
      let allIssues: unknown[] = [];

      // Paginate through all issues
      while (hasNextPage) {
        const data: any = await this.client.query(query, {
          id: projectId,
          first: 100,
          after,
        });

        const issuesData: any = (data["project"] && (data["project"] as any).issues) || [];
        const issues = issuesData?.nodes || [];
        allIssues = allIssues.concat(issues);

        hasNextPage = issuesData?.pageInfo?.hasNextPage || false;
        after = issuesData?.pageInfo?.endCursor || null;

        logger.debug(`Fetched ${issues.length} issues (total: ${allIssues.length}) for ${projectPath}`);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "issues",
      };

      // Process issues through callback
      const processedIssues: unknown[] = [];
      for (const issue of allIssues) {
        const processedIssue = callback(issue, context);
        if (processedIssue) {
          processedIssues.push(processedIssue);
        }
      }

      // Store in hierarchical structure
      const hierarchy = ["groups", ...projectPath.split("/"), "projects"];
      const filePath = this.storageManager.createHierarchicalPath("issues", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedIssues as any, false);

      logger.info(`Successfully wrote ${writtenCount} issues for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch issues for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Fetches merge requests for a specific project
   */
  async fetchMergeRequests(projectId: string, projectPath: string, callback: (mergeRequest: unknown, context: CallbackContext) => unknown | null): Promise<void> {
    try {
      const query = `
        query($id: ID!, $first: Int, $after: String) {
          project(id: $id) {
            mergeRequests(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                iid
                title
                description
                descriptionHtml
                state
                detailedMergeStatus
                createdAt
                updatedAt
                mergedAt
                closedAt
                sourceBranch
                targetBranch
                sourceBranchExists
                targetBranchExists
                reference
                references {
                  full
                  relative
                  short
                }
                webUrl
                upvotes
                downvotes
                userNotesCount
                shouldRemoveSourceBranch
                forceRemoveSourceBranch
                allowCollaboration
                allowMaintainerToPush
                squash
                squashOnMerge
                mergeable
                mergeableDiscussionsState
                workInProgress
                draft
                discussionLocked
                timeEstimate
                totalTimeSpent
                humanTimeEstimate
                humanTotalTimeSpent
                rebaseInProgress
                mergeTrainsCount
                hasSecurityReports
                autoMergeEnabled
                preparedAt
                mergeUser {
                  id
                  username
                  name
                  avatarUrl
                  webUrl
                }
                author {
                  id
                  username
                  name
                  avatarUrl
                  webUrl
                  state
                }
                assignees {
                  nodes {
                    id
                    username
                    name
                    avatarUrl
                    webUrl
                    state
                  }
                }
                reviewers {
                  nodes {
                    id
                    username
                    name
                    avatarUrl
                    webUrl
                    state
                  }
                }
                labels {
                  nodes {
                    id
                    title
                    description
                    color
                    textColor
                  }
                }
                milestone {
                  id
                  iid
                  title
                  description
                  state
                  webUrl
                  dueDate
                  startDate
                }
                userPermissions {
                  adminMergeRequest
                  canMerge
                  cherryPickOnCurrentMergeRequest
                  createNote
                  pushToSourceBranch
                  readMergeRequest
                  removeSourceBranch
                  revertOnCurrentMergeRequest
                  updateMergeRequest
                }
                approved
                approvedBy {
                  nodes {
                    id
                    username
                    name
                    avatarUrl
                  }
                }
                commitCount
                commitsWithoutMergeCommits {
                  nodes {
                    id
                    sha
                    shortId
                    title
                    message
                    authoredDate
                    committedDate
                    webUrl
                    author {
                      name
                      email
                      avatarUrl
                    }
                    committer {
                      name
                      email
                      avatarUrl
                    }
                  }
                }
                headPipeline {
                  id
                  iid
                  sha
                  status
                  detailedStatus {
                    id
                    group
                    icon
                    text
                    label
                    tooltip
                  }
                  createdAt
                  updatedAt
                  startedAt
                  finishedAt
                  duration
                  queuedDuration
                  webUrl
                }
                mergeTrain {
                  id
                  status
                  mergedAt
                  user {
                    id
                    username
                    name
                  }
                }
                diffRefs {
                  baseSha
                  headSha
                  startSha
                }
                diffStats {
                  additions
                  deletions
                  fileCount
                }
                conflicts
                projectId
                targetProjectId
                sourceProjectId
                sourceProject {
                  id
                  name
                  nameWithNamespace
                  fullPath
                  webUrl
                }
                targetProject {
                  id
                  name
                  nameWithNamespace
                  fullPath
                  webUrl
                }
                subscribed
                blocking
                blockedByCount
                taskCompletionStatus {
                  count
                  completedCount
                }
              }
            }
          }
        }
      `;

      logger.info(`Fetching merge requests for project: ${projectPath}`);

      let hasNextPage = true;
      let after: string | null = null;
      let allMergeRequests: unknown[] = [];

      // Paginate through all merge requests
      while (hasNextPage) {
        const data: any = await this.client.query(query, {
          id: projectId,
          first: 100,
          after,
        });

        const mergeRequestsData: any = (data["project"] && (data["project"] as any).mergeRequests) || [];
        const mergeRequests = mergeRequestsData?.nodes || [];
        allMergeRequests = allMergeRequests.concat(mergeRequests);

        hasNextPage = mergeRequestsData?.pageInfo?.hasNextPage || false;
        after = mergeRequestsData?.pageInfo?.endCursor || null;

        logger.debug(`Fetched ${mergeRequests.length} merge requests (total: ${allMergeRequests.length}) for ${projectPath}`);
      }

      const context: CallbackContext = {
        host: this.config.gitlab.host,
        accountId: projectId,
        resourceType: "mergeRequests",
      };

      // Process merge requests through callback
      const processedMergeRequests: unknown[] = [];
      for (const mergeRequest of allMergeRequests) {
        const processedMergeRequest = callback(mergeRequest, context);
        if (processedMergeRequest) {
          processedMergeRequests.push(processedMergeRequest);
        }
      }

      // Store in hierarchical structure
      const hierarchy = ["groups", ...projectPath.split("/"), "projects"];
      const filePath = this.storageManager.createHierarchicalPath("mergerequests", hierarchy);
      const writtenCount = this.storageManager.writeJsonlFile(filePath, processedMergeRequests as any, false);

      logger.info(`Successfully wrote ${writtenCount} merge requests for ${projectPath} to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to fetch merge requests for project ${projectPath}:`, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}

/**
 * Factory function to create a CommonResourcesFetcher instance
 */
export const createCommonResourcesFetcher = async (): Promise<CommonResourcesFetcher> => {
  const config = await loadConfig();
  return new CommonResourcesFetcher(config);
};
