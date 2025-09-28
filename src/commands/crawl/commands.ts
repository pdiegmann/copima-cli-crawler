import { buildCommand, buildRouteMap } from "@stricli/core";

export const areasCommand = buildCommand({
  loader: async () => {
    const { areas } = await import("./impl.js");
    return areas;
  },
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      host: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "GitLab instance host",
        optional: true,
      },
      "access-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 access token",
        optional: true,
      },
      "refresh-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 refresh token",
        optional: true,
      },
      "account-id": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Account ID to use for authentication",
        optional: true,
      },
      output: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Output directory for JSONL files",
        optional: true,
      },
      resume: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase(),
        brief: "Resume from previous crawl state",
        optional: true,
      },
      database: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Database file path",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Step 1: Crawl available areas (groups and projects)",
  },
});

export const usersCommand = buildCommand({
  loader: async () => {
    const { users } = await import("./impl.js");
    return users;
  },
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      host: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "GitLab instance host",
        optional: true,
      },
      "access-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 access token",
        optional: true,
      },
      "refresh-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 refresh token",
        optional: true,
      },
      "account-id": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Account ID to use for authentication",
        optional: true,
      },
      output: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Output directory for JSONL files",
        optional: true,
      },
      resume: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase(),
        brief: "Resume from previous crawl state",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Step 2: Crawl all available users",
  },
});

export const resourcesCommand = buildCommand({
  loader: async () => {
    const { resources } = await import("./impl.js");
    return resources;
  },
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      host: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "GitLab instance host",
        optional: true,
      },
      "access-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 access token",
        optional: true,
      },
      "refresh-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 refresh token",
        optional: true,
      },
      "account-id": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Account ID to use for authentication",
        optional: true,
      },
      output: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Output directory for JSONL files",
        optional: true,
      },
      resume: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase(),
        brief: "Resume from previous crawl state",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Step 3: Crawl area-specific resources",
  },
});

export const repositoryCommand = buildCommand({
  loader: async () => {
    const { repository } = await import("./impl.js");
    return repository;
  },
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      host: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "GitLab instance host",
        optional: true,
      },
      "access-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 access token",
        optional: true,
      },
      "refresh-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 refresh token",
        optional: true,
      },
      "account-id": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Account ID to use for authentication",
        optional: true,
      },
      output: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Output directory for JSONL files",
        optional: true,
      },
      resume: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase(),
        brief: "Resume from previous crawl state",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Step 4: Crawl repository resources",
  },
});

export const crawlAllCommand = buildCommand({
  loader: async () => {
    const { crawlAll } = await import("./impl.js");
    return crawlAll;
  },
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      host: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "GitLab instance host",
        optional: true,
      },
      "access-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 access token",
        optional: true,
      },
      "refresh-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 refresh token",
        optional: true,
      },
      "account-id": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Account ID to use for authentication",
        optional: true,
      },
      output: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Output directory for JSONL files",
        optional: true,
      },
      database: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Database file path",
        optional: true,
      },
      resume: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase() === "true",
        brief: "Resume from previous crawl state",
        optional: true,
      },
      steps: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Comma-separated list of steps to run (areas,users,resources,repository)",
        optional: true,
      },
      verbose: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase() === "true",
        brief: "Enable verbose logging",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Run complete GitLab crawl (all 4 steps)",
  },
});

export const crawlCommand = buildCommand({
  loader: async () => {
    const { crawlCommand } = await import("./impl.js");
    return crawlCommand;
  },
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
    flags: {
      "dry-run": {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase() === "true",
        brief: "Run in dry-run mode (no data will be written)",
        optional: true,
      },
      "output-dir": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Output directory for crawled data",
        optional: true,
      },
      resume: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase() === "true",
        brief: "Resume from last successful step",
        optional: true,
      },
      step: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Start from specific step (areas, users, projects)",
        optional: true,
      },
      "gitlab-url": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "GitLab instance URL",
        optional: true,
      },
      "access-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "GitLab access token",
        optional: true,
      },
      "account-id": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Account ID to use for authentication",
        optional: true,
      },
      steps: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Comma-separated list of steps to run (areas,users,resources,repository)",
        optional: true,
      },
      host: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "GitLab instance host",
        optional: true,
      },
      output: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Output directory for JSONL files",
        optional: true,
      },
      database: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Database file path",
        optional: true,
      },
      verbose: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase() === "true",
        brief: "Enable verbose logging",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Run GitLab crawl operation",
  },
});

export const crawlRoutes = buildRouteMap({
  routes: {
    areas: areasCommand,
    users: usersCommand,
    resources: resourcesCommand,
    repository: repositoryCommand,
    crawl: crawlCommand,
    crawlAll: crawlAllCommand,
  },
  docs: {
    brief: "GitLab crawling commands",
  },
});
