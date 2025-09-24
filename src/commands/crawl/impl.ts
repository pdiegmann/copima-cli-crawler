import type { CallbackContext } from "../../config/types.js";
import type { LocalContext } from "../../context.js";
import { createCallbackManager } from "../../utils/callbackManager.js";

export const areas = async function (this: LocalContext, _flags: Record<string, unknown>): Promise<void> {
  const logger = this.logger;
  const { graphqlClient } = this;

  try {
    logger.info("Starting Step 1: Crawling areas (groups and projects)");

    // Initialize callback manager
    const callbackManager = createCallbackManager(this.config.callbacks);
    const callbackContext: CallbackContext = {
      host: this.config.gitlab.host,
      accountId: this.config.gitlab.accessToken, // Using access token as account identifier
      resourceType: "", // Will be set for each resource type
    };

    // Fetch groups and projects using GraphQL client
    const query = `
      query {
        groups {
          nodes {
            id
            fullPath
            name
            visibility
            description
            createdAt
            updatedAt
          }
        }
        projects {
          nodes {
            id
            fullPath
            name
            visibility
            description
            createdAt
            updatedAt
          }
        }
      }
    `;

    const data = await graphqlClient.query(query);

    const groups = data.groups.nodes;
    const projects = data.projects.nodes;

    // Log and store results
    logger.info(`Fetched ${groups.length} groups`);
    logger.info(`Fetched ${projects.length} projects`);

    // Implement JSONL storage logic with callback processing
    const outputDir = this.path.resolve("output", "areas");
    this.fs.mkdirSync(outputDir, { recursive: true });

    const writeJSONL = async (filePath: string, data: any[], resourceType: string): Promise<undefined> => {
      // Process data through callback system
      callbackContext.resourceType = resourceType;
      const processedData = await callbackManager.processObjects(callbackContext, data);

      const stream = this.fs.createWriteStream(filePath, { flags: "a" });
      processedData.forEach((item) => {
        stream.write(`${JSON.stringify(item)}\n`);
      });
      stream.end();

      // Log statistics
      if (processedData.length !== data.length) {
        logger.info(`${resourceType}: ${data.length} original → ${processedData.length} processed (${data.length - processedData.length} filtered)`);
      }
    };

    await writeJSONL(this.path.join(outputDir, "groups.jsonl"), groups, "group");
    await writeJSONL(this.path.join(outputDir, "projects.jsonl"), projects, "project");

    logger.info("Stored areas in JSONL files with callback processing");
  } catch (error) {
    logger.error("Error during Step 1: Crawling areas", error);
    throw error;
  }
};

export const users = async function (this: LocalContext, _flags: Record<string, unknown>): Promise<void> {
  const logger = this.logger;
  const { graphqlClient } = this;

  try {
    logger.info("Starting Step 2: Crawling users");

    // Initialize callback manager
    const callbackManager = createCallbackManager(this.config.callbacks);
    const callbackContext: CallbackContext = {
      host: this.config.gitlab.host,
      accountId: this.config.gitlab.accessToken, // Using access token as account identifier
      resourceType: "user",
    };

    // Fetch users using GraphQL client
    const users = await graphqlClient.query(`
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
        `);

    // Log and store results
    logger.info(`Fetched ${users.data.users.nodes.length} users`);

    // Implement JSONL storage logic with callback processing
    const outputDir = this.path.resolve("output", "users");
    this.fs.mkdirSync(outputDir, { recursive: true });

    const writeJSONL = async (filePath: string, data: any[], resourceType: string): Promise<undefined> => {
      // Process data through callback system
      callbackContext.resourceType = resourceType;
      const processedData = await callbackManager.processObjects(callbackContext, data);

      const stream = this.fs.createWriteStream(filePath, { flags: "a" });
      processedData.forEach((item) => {
        stream.write(`${JSON.stringify(item)}\n`);
      });
      stream.end();

      // Log statistics
      if (processedData.length !== data.length) {
        logger.info(`${resourceType}: ${data.length} original → ${processedData.length} processed (${data.length - processedData.length} filtered)`);
      }
    };

    await writeJSONL(this.path.join(outputDir, "users.jsonl"), users.data.users.nodes, "user");

    logger.info("Stored users in JSONL files with callback processing");
  } catch (error) {
    logger.error("Error during Step 2: Crawling users", error);
    throw error;
  }
};

export const resources = async function (this: LocalContext, _flags: Record<string, unknown>): Promise<void> {
  const logger = this.logger;
  const { graphqlClient, restClient } = this;

  try {
    logger.info("Starting Step 3: Crawling area-specific resources");

    // Initialize callback manager
    const callbackManager = createCallbackManager(this.config.callbacks);
    const callbackContext: CallbackContext = {
      host: this.config.gitlab.host,
      accountId: this.config.gitlab.accessToken, // Using access token as account identifier
      resourceType: "", // Will be set for each resource type
    };

    // Fetch common resources
    const labels = await graphqlClient.query(`
            query {
                labels {
                    nodes {
                        id
                        title
                        color
                        description
                    }
                }
            }
        `);
    const issues = await graphqlClient.query(`
            query {
                issues {
                    nodes {
                        id
                        title
                        state
                        createdAt
                        updatedAt
                    }
                }
            }
        `);
    logger.info(`Fetched ${labels.data.labels.nodes.length} labels`);
    logger.info(`Fetched ${issues.data.issues.nodes.length} issues`);

    // Fetch group-specific resources
    const boards = await graphqlClient.query(`
            query {
                boards {
                    nodes {
                        id
                        name
                        lists {
                            id
                            name
                        }
                    }
                }
            }
        `);
    logger.info(`Fetched ${boards.data.boards.nodes.length} boards`);

    // Fetch epic hierarchy
    const epicHierarchy = await graphqlClient.query(`
            query {
                epics {
                    nodes {
                        id
                        title
                        parent {
                            id
                        }
                        children {
                            nodes {
                                id
                                title
                            }
                        }
                    }
                }
            }
        `);
    logger.info(`Fetched ${epicHierarchy.data.epics.nodes.length} epics`);

    // Fetch audit events
    const auditEvents = await graphqlClient.query(`
            query {
                auditEvents {
                    nodes {
                        id
                        action
                        author {
                            id
                            username
                        }
                        createdAt
                    }
                }
            }
        `);
    logger.info(`Fetched ${auditEvents.data.auditEvents.nodes.length} audit events`);

    // Fetch project-specific resources
    const snippets = await graphqlClient.query(`
            query {
                snippets {
                    nodes {
                        id
                        title
                        createdAt
                    }
                }
            }
        `);
    logger.info(`Fetched ${snippets.data.snippets.nodes.length} snippets`);

    // Fetch project metadata
    const metadata = await graphqlClient.query(`
            query {
                project {
                    id
                    name
                    description
                    createdAt
                    updatedAt
                }
            }
        `);
    logger.info(`Fetched metadata for project: ${metadata.data.project.name}`);

    // Fetch project pipelines
    const pipelines = await graphqlClient.query(`
            query {
                pipelines {
                    nodes {
                        id
                        status
                        ref
                        createdAt
                        finishedAt
                        duration
                    }
                }
            }
        `);
    logger.info(`Fetched ${pipelines.data.pipelines.nodes.length} pipelines`);

    // Fetch project releases
    const releases = await graphqlClient.query(`
            query {
                releases {
                    nodes {
                        id
                        name
                        tagName
                        releasedAt
                        description
                    }
                }
            }
        `);
    logger.info(`Fetched ${releases.data.releases.nodes.length} releases`);

    // Fetch REST-only resources
    const branches = await restClient.get("/projects/:id/repository/branches");
    logger.info(`Fetched ${branches.length} branches`);

    // Implement JSONL storage logic for resources with callback processing
    const outputDir = this.path.resolve("output", "resources");
    this.fs.mkdirSync(outputDir, { recursive: true });

    const writeJSONL = async (filePath: string, data: any[], resourceType: string): Promise<undefined> => {
      // Process data through callback system
      callbackContext.resourceType = resourceType;
      const processedData = await callbackManager.processObjects(callbackContext, data);

      const stream = this.fs.createWriteStream(filePath, { flags: "a" });
      processedData.forEach((item) => {
        stream.write(`${JSON.stringify(item)}\n`);
      });
      stream.end();

      // Log statistics
      if (processedData.length !== data.length) {
        logger.info(`${resourceType}: ${data.length} original → ${processedData.length} processed (${data.length - processedData.length} filtered)`);
      }
    };

    // Write all resources with callback processing
    await writeJSONL(this.path.join(outputDir, "labels.jsonl"), labels.data.labels.nodes, "label");
    await writeJSONL(this.path.join(outputDir, "issues.jsonl"), issues.data.issues.nodes, "issue");
    await writeJSONL(this.path.join(outputDir, "boards.jsonl"), boards.data.boards.nodes, "board");
    await writeJSONL(this.path.join(outputDir, "epics.jsonl"), epicHierarchy.data.epics.nodes, "epic");
    await writeJSONL(this.path.join(outputDir, "audit_events.jsonl"), auditEvents.data.auditEvents.nodes, "audit_event");
    await writeJSONL(this.path.join(outputDir, "snippets.jsonl"), snippets.data.snippets.nodes, "snippet");
    await writeJSONL(this.path.join(outputDir, "metadata.jsonl"), [metadata.data.project], "project_metadata");
    await writeJSONL(this.path.join(outputDir, "pipelines.jsonl"), pipelines.data.pipelines.nodes, "pipeline");
    await writeJSONL(this.path.join(outputDir, "releases.jsonl"), releases.data.releases.nodes, "release");
    await writeJSONL(this.path.join(outputDir, "branches.jsonl"), branches, "branch");

    logger.info("Stored all resources in JSONL files with callback processing");
  } catch (error) {
    logger.error("Error during Step 3: Crawling resources", error);
    throw error;
  }
};

export const repository = async function (this: LocalContext, _flags: Record<string, unknown>): Promise<void> {
  const logger = this.logger;
  const { restClient } = this;

  try {
    logger.info("Starting Step 4: Crawling repository resources");

    // Initialize callback manager
    const callbackManager = createCallbackManager(this.config.callbacks);
    const callbackContext: CallbackContext = {
      host: this.config.gitlab.host,
      accountId: this.config.gitlab.accessToken, // Using access token as account identifier
      resourceType: "", // Will be set for each resource type
    };

    // Fetch repository-level details using REST client
    const branches = await restClient.get("/projects/:id/repository/branches");
    const commits = await restClient.get("/projects/:id/repository/commits");
    const tags = await restClient.get("/projects/:id/repository/tags");

    logger.info(`Fetched ${branches.length} branches`);
    logger.info(`Fetched ${commits.length} commits`);
    logger.info(`Fetched ${tags.length} tags`);

    // Implement JSONL storage logic with callback processing
    const outputDir = this.path.resolve("output", "repository");
    this.fs.mkdirSync(outputDir, { recursive: true });

    const writeJSONL = async (filePath: string, data: any[], resourceType: string): Promise<undefined> => {
      // Process data through callback system
      callbackContext.resourceType = resourceType;
      const processedData = await callbackManager.processObjects(callbackContext, data);

      const stream = this.fs.createWriteStream(filePath, { flags: "a" });
      processedData.forEach((item) => {
        stream.write(`${JSON.stringify(item)}\n`);
      });
      stream.end();

      // Log statistics
      if (processedData.length !== data.length) {
        logger.info(`${resourceType}: ${data.length} original → ${processedData.length} processed (${data.length - processedData.length} filtered)`);
      }
    };

    // Write all resources with callback processing
    await writeJSONL(this.path.join(outputDir, "branches.jsonl"), branches, "branch");
    await writeJSONL(this.path.join(outputDir, "commits.jsonl"), commits, "commit");
    await writeJSONL(this.path.join(outputDir, "tags.jsonl"), tags, "tag");

    logger.info("Stored all repository resources in JSONL files with callback processing");
  } catch (error) {
    logger.error("Error during Step 4: Crawling repository resources", error);
    throw error;
  }
};

// Legacy individual step functions remain available for backward compatibility
// New orchestrated crawl implementation
export const crawlAll = async (this: LocalContext, flags: any): Promise<void> => {
  const logger = this.logger;

  logger.info("🚀 Starting complete GitLab crawl with enhanced orchestrator");

  try {
    // Import the new crawl implementation
    const { crawlAll: newCrawlAll } = await import("./newImpl.js");

    // Convert LocalContext config to standard config format
    const config = this.config;

    // Execute the new crawl implementation
    const result = await newCrawlAll(config, {
      sessionId: `crawl-${Date.now()}`,
      resumeEnabled: config.resume?.enabled !== false,
      progressReporting: config.progress?.enabled !== false,
    });

    if (result.success) {
      logger.info("✅ GitLab crawl completed successfully", {
        totalProcessingTime: `${result.totalProcessingTime}ms`,
        summary: result.summary,
      });
    } else {
      logger.warn("⚠️ GitLab crawl completed with errors", {
        errors: result.summary.errors,
        summary: result.summary,
      });
    }
  } catch (error) {
    logger.error("❌ GitLab crawl failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Fall back to legacy implementation if new one fails
    logger.info("Falling back to legacy crawl implementation");
    await this.legacyCrawlAll(flags);
  }
};

// Preserve original implementation as legacy fallback
export const legacyCrawlAll = async function (this: LocalContext, flags: any): Promise<void> {
  // Implementing complete GitLab crawl (all 4 steps)
  console.log("🚀 Starting complete GitLab crawl (legacy mode)");
  // Define and implement crawl methods
  const { fetchGroups, fetchProjects, fetchUsers, fetchLabels, fetchMilestones, fetchIssues, fetchMergeRequests, fetchArtifacts, fetchJobLogs, fetchDependencyList } = await import(
    "../../api/gitlabRestClient"
  );

  const crawlAreas = async (flags: any): Promise<undefined> => {
    console.log("Crawling areas...");
    // Optimized implementation for crawling areas
    // Fetch groups and projects concurrently using Promise.all
    const [groups, projects] = await Promise.all([fetchGroups(flags), fetchProjects(flags)]);
    console.log(`Fetched ${groups.length} groups and ${projects.length} projects.`);
  };

  const crawlUsers = async (flags: any): Promise<undefined> => {
    console.log("Crawling users...");
    // Optimized implementation for crawling users
    const users = await fetchUsers(flags);
    console.log(`Fetched ${users.length} users.`);
  };

  const crawlCommonResources = async (flags: any): Promise<undefined> => {
    console.log("Crawling common resources...");
    // Optimized implementation for crawling common resources
    await Promise.all([fetchLabels(flags), fetchMilestones(flags), fetchIssues(flags), fetchMergeRequests(flags)]);
    console.log("Fetched common resources.");
  };

  const crawlRestOnlyResources = async (flags: any): Promise<undefined> => {
    console.log("Crawling REST-only resources...");
    // Optimized implementation for crawling REST-only resources
    await Promise.all([fetchArtifacts(flags), fetchJobLogs(flags), fetchDependencyList(flags)]);
    console.log("Fetched REST-only resources.");
  };

  // Execute crawl steps
  await crawlAreas(flags);
  await crawlUsers(flags);
  await crawlCommonResources(flags);
  await crawlRestOnlyResources(flags);
  console.log("✅ GitLab crawl completed successfully");
};
