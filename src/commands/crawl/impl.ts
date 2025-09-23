import type { LocalContext } from '../../context.js';

export async function areas(this: LocalContext, flags: any): Promise<void> {
  const logger = this.logger;
  const { graphqlClient } = this;

  try {
    logger.info('Starting Step 1: Crawling areas (groups and projects)');

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

    // Implement JSONL storage logic
    const outputDir = this.path.resolve('output', 'areas');
    this.fs.mkdirSync(outputDir, { recursive: true });

    const groupsFile = this.path.join(outputDir, 'groups.jsonl');
    const projectsFile = this.path.join(outputDir, 'projects.jsonl');

    const writeJSONL = (filePath: string, data: any[]) => {
      const stream = this.fs.createWriteStream(filePath, { flags: 'a' });
      data.forEach((item) => {
        stream.write(`${JSON.stringify(item)}\n`);
      });
      stream.end();
    };

    writeJSONL(groupsFile, groups);
    writeJSONL(projectsFile, projects);

    logger.info(`Stored groups in ${groupsFile}`);
    logger.info(`Stored projects in ${projectsFile}`);
  } catch (error) {
    logger.error('Error during Step 1: Crawling areas', error);
    throw error;
  }
}

export async function users(this: LocalContext, flags: any): Promise<void> {
  const logger = this.logger;
  const { graphqlClient } = this;

  try {
    logger.info('Starting Step 2: Crawling users');

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

    // Implement JSONL storage logic
    const path = require('path');
    const fs = require('fs');

    const outputDir = path.resolve('output', 'users');
    fs.mkdirSync(outputDir, { recursive: true });

    const usersFile = path.join(outputDir, 'users.jsonl');

    const writeJSONL = (filePath: string, data: any[]) => {
      const stream = fs.createWriteStream(filePath, { flags: 'a' });
      data.forEach((item) => {
        stream.write(`${JSON.stringify(item)}\n`);
      });
      stream.end();
    };

    writeJSONL(usersFile, users.data.users.nodes);

    logger.info(`Stored users in ${usersFile}`);
  } catch (error) {
    logger.error('Error during Step 2: Crawling users', error);
    throw error;
  }
}

export async function resources(this: LocalContext, flags: any): Promise<void> {
  const logger = this.logger;
  const { graphqlClient, restClient } = this;

  try {
    logger.info('Starting Step 3: Crawling area-specific resources');

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
    const branches = await restClient.get('/projects/:id/repository/branches');
    logger.info(`Fetched ${branches.length} branches`);

    // Implement JSONL storage logic for resources
    const outputDir = require('path').resolve('output', 'resources');
    require('fs').mkdirSync(outputDir, { recursive: true });

    const writeJSONL = (filePath: string, data: any[]) => {
      const stream = require('fs').createWriteStream(filePath, { flags: 'a' });
      data.forEach((item) => {
        stream.write(`${JSON.stringify(item)}\n`);
      });
      stream.end();
    };

    writeJSONL(require('path').join(outputDir, 'labels.jsonl'), labels.data.labels.nodes);
    writeJSONL(require('path').join(outputDir, 'issues.jsonl'), issues.data.issues.nodes);
    writeJSONL(require('path').join(outputDir, 'boards.jsonl'), boards.data.boards.nodes);
    writeJSONL(require('path').join(outputDir, 'snippets.jsonl'), snippets.data.snippets.nodes);
    writeJSONL(require('path').join(outputDir, 'branches.jsonl'), branches);

    logger.info('Stored all resources in JSONL files');
  } catch (error) {
    logger.error('Error during Step 3: Crawling resources', error);
    throw error;
  }
}

export async function repository(this: LocalContext, flags: any): Promise<void> {
  const logger = this.logger;
  const { restClient } = this;

  try {
    logger.info('Starting Step 4: Crawling repository resources');

    // Fetch repository-level details using REST client
    const branches = await restClient.get('/projects/:id/repository/branches');
    const commits = await restClient.get('/projects/:id/repository/commits');
    const tags = await restClient.get('/projects/:id/repository/tags');

    logger.info(`Fetched ${branches.length} branches`);
    logger.info(`Fetched ${commits.length} commits`);
    logger.info(`Fetched ${tags.length} tags`);

    // Implement JSONL storage logic
    const outputDir = require('path').resolve('output', 'repository');
    require('fs').mkdirSync(outputDir, { recursive: true });

    const writeJSONL = (filePath: string, data: any[]) => {
      const stream = require('fs').createWriteStream(filePath, { flags: 'a' });
      data.forEach((item) => {
        stream.write(`${JSON.stringify(item)}\n`);
      });
      stream.end();
    };

    writeJSONL(require('path').join(outputDir, 'branches.jsonl'), branches);
    writeJSONL(require('path').join(outputDir, 'commits.jsonl'), commits);
    writeJSONL(require('path').join(outputDir, 'tags.jsonl'), tags);

    logger.info(`Stored branches in ${outputDir}/branches.jsonl`);
    logger.info(`Stored commits in ${outputDir}/commits.jsonl`);
    logger.info(`Stored tags in ${outputDir}/tags.jsonl`);
  } catch (error) {
    logger.error('Error during Step 4: Crawling repository resources', error);
    throw error;
  }
}

export async function crawlAll(this: LocalContext, flags: any): Promise<void> {
  // Implementing complete GitLab crawl (all 4 steps)
  console.log('🚀 Starting complete GitLab crawl');
  // Define and implement crawl methods
  import { fetchGroups, fetchProjects, fetchUsers, fetchLabels, fetchMilestones, fetchIssues, fetchMergeRequests, fetchArtifacts, fetchJobLogs, fetchDependencyList } from '../../api/gitlabRestClient';
  
  const crawlAreas = async (flags: any) => {
      console.log('Crawling areas...');
      // Optimized implementation for crawling areas
      // Fetch groups and projects concurrently using Promise.all
      const [groups, projects] = await Promise.all([
        fetchGroups(flags),
        fetchProjects(flags),
      ]);
      console.log(`Fetched ${groups.length} groups and ${projects.length} projects.`);
  };
  
  const crawlUsers = async (flags: any) => {
      console.log('Crawling users...');
      // Optimized implementation for crawling users
      const users = await fetchUsers(flags);
      console.log(`Fetched ${users.length} users.`);
  };
  
  const crawlCommonResources = async (flags: any) => {
      console.log('Crawling common resources...');
      // Optimized implementation for crawling common resources
      await Promise.all([
        fetchLabels(flags),
        fetchMilestones(flags),
        fetchIssues(flags),
        fetchMergeRequests(flags),
      ]);
      console.log('Fetched common resources.');
  };
  
  const crawlRestOnlyResources = async (flags: any) => {
      console.log('Crawling REST-only resources...');
      // Optimized implementation for crawling REST-only resources
      await Promise.all([
        fetchArtifacts(flags),
        fetchJobLogs(flags),
        fetchDependencyList(flags),
      ]);
      console.log('Fetched REST-only resources.');
  };

  // Execute crawl steps
  await crawlAreas(flags);
  await crawlUsers(flags);
  await crawlCommonResources(flags);
  await crawlRestOnlyResources(flags);
  console.log('✅ GitLab crawl completed successfully');
}
