import { buildCommand, buildRouteMap } from '@stricli/core';

export const areasCommand = buildCommand({
  loader: async () => {
    const { areas } = await import('./impl.js');
    return areas;
  },
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [],
    },
    flags: {
      host: {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'GitLab instance host',
        optional: true,
      },
      'access-token': {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'OAuth2 access token',
        optional: true,
      },
      'refresh-token': {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'OAuth2 refresh token',
        optional: true,
      },
      output: {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'Output directory for JSONL files',
        optional: true,
      },
      resume: {
        kind: 'parsed',
        parse: (input: string) => input.toLowerCase() === 'true',
        brief: 'Resume from previous crawl state',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Step 1: Crawl available areas (groups and projects)',
  },
});

export const usersCommand = buildCommand({
  loader: async () => {
    const { users } = await import('./impl.js');
    return users;
  },
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [],
    },
    flags: {
      host: {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'GitLab instance host',
        optional: true,
      },
      'access-token': {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'OAuth2 access token',
        optional: true,
      },
      'refresh-token': {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'OAuth2 refresh token',
        optional: true,
      },
      output: {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'Output directory for JSONL files',
        optional: true,
      },
      resume: {
        kind: 'parsed',
        parse: (input: string) => input.toLowerCase() === 'true',
        brief: 'Resume from previous crawl state',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Step 2: Crawl all available users',
  },
});

export const resourcesCommand = buildCommand({
  loader: async () => {
    const { resources } = await import('./impl.js');
    return resources;
  },
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [],
    },
    flags: {
      host: {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'GitLab instance host',
        optional: true,
      },
      'access-token': {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'OAuth2 access token',
        optional: true,
      },
      'refresh-token': {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'OAuth2 refresh token',
        optional: true,
      },
      output: {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'Output directory for JSONL files',
        optional: true,
      },
      resume: {
        kind: 'parsed',
        parse: (input: string) => input.toLowerCase() === 'true',
        brief: 'Resume from previous crawl state',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Step 3: Crawl area-specific resources',
  },
});

export const repositoryCommand = buildCommand({
  loader: async () => {
    const { repository } = await import('./impl.js');
    return repository;
  },
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [],
    },
    flags: {
      host: {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'GitLab instance host',
        optional: true,
      },
      'access-token': {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'OAuth2 access token',
        optional: true,
      },
      'refresh-token': {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'OAuth2 refresh token',
        optional: true,
      },
      output: {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'Output directory for JSONL files',
        optional: true,
      },
      resume: {
        kind: 'parsed',
        parse: (input: string) => input.toLowerCase() === 'true',
        brief: 'Resume from previous crawl state',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Step 4: Crawl repository resources',
  },
});

export const crawlAllCommand = buildCommand({
  loader: async () => {
    const { crawlAll } = await import('./impl.js');
    return crawlAll;
  },
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [],
    },
    flags: {
      host: {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'GitLab instance host',
        optional: true,
      },
      'access-token': {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'OAuth2 access token',
        optional: true,
      },
      'refresh-token': {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'OAuth2 refresh token',
        optional: true,
      },
      output: {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'Output directory for JSONL files',
        optional: true,
      },
      resume: {
        kind: 'parsed',
        parse: (input: string) => input.toLowerCase() === 'true',
        brief: 'Resume from previous crawl state',
        optional: true,
      },
      steps: {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'Comma-separated list of steps to run (areas,users,resources,repository)',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Run complete GitLab crawl (all 4 steps)',
  },
});

export const crawlRoutes = buildRouteMap({
  routes: {
    areas: areasCommand,
    users: usersCommand,
    resources: resourcesCommand,
    repository: repositoryCommand,
  },
  docs: {
    brief: 'GitLab crawling commands',
  },
});
