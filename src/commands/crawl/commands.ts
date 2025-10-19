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
        brief: "GitLab instance URL (e.g., https://gitlab.com)",
        optional: true,
      },
      token: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Personal Access Token (PAT)",
        optional: true,
      },
      "access-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "GitLab access token for authentication",
        optional: true,
      },
      "refresh-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 refresh token (optional)",
        optional: true,
      },
      "account-id": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Account ID from stored accounts (optional)",
        optional: true,
      },
      output: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Output directory for data files (default: ./output)",
        optional: true,
      },
      resume: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase(),
        brief: "Resume from previous crawl (true/false)",
        optional: true,
      },
      database: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Database file path (default: ./database.yaml)",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Crawl groups and projects (Step 1 of 4)",
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
        brief: "GitLab instance URL (e.g., https://gitlab.com)",
        optional: true,
      },
      token: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Personal Access Token (PAT)",
        optional: true,
      },
      "access-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "GitLab access token for authentication",
        optional: true,
      },
      "refresh-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 refresh token (optional)",
        optional: true,
      },
      "account-id": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Account ID from stored accounts (optional)",
        optional: true,
      },
      output: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Output directory for data files (default: ./output)",
        optional: true,
      },
      resume: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase(),
        brief: "Resume from previous crawl (true/false)",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Crawl all users from GitLab instance (Step 2 of 4)",
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
        brief: "GitLab instance URL (e.g., https://gitlab.com)",
        optional: true,
      },
      token: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Personal Access Token (PAT)",
        optional: true,
      },
      "access-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "GitLab access token for authentication",
        optional: true,
      },
      "refresh-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 refresh token (optional)",
        optional: true,
      },
      "account-id": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Account ID from stored accounts (optional)",
        optional: true,
      },
      output: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Output directory for data files (default: ./output)",
        optional: true,
      },
      resume: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase(),
        brief: "Resume from previous crawl (true/false)",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Crawl issues, MRs, labels, and other resources (Step 3 of 4)",
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
        brief: "GitLab instance URL (e.g., https://gitlab.com)",
        optional: true,
      },
      token: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Personal Access Token (PAT)",
        optional: true,
      },
      "access-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "GitLab access token for authentication",
        optional: true,
      },
      "refresh-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 refresh token (optional)",
        optional: true,
      },
      "account-id": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Account ID from stored accounts (optional)",
        optional: true,
      },
      output: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Output directory for data files (default: ./output)",
        optional: true,
      },
      resume: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase(),
        brief: "Resume from previous crawl (true/false)",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Crawl commits, branches, tags, and files (Step 4 of 4)",
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
        brief: "GitLab instance URL (e.g., https://gitlab.com)",
        optional: true,
      },
      token: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Personal Access Token (PAT)",
        optional: true,
      },
      "access-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "GitLab access token for authentication",
        optional: true,
      },
      "refresh-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "OAuth2 refresh token (optional)",
        optional: true,
      },
      "account-id": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Account ID from stored accounts (optional)",
        optional: true,
      },
      output: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Output directory for data files (default: ./output)",
        optional: true,
      },
      database: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Database file path (default: ./database.yaml)",
        optional: true,
      },
      resume: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase() === "true",
        brief: "Resume from previous crawl (true/false)",
        optional: true,
      },
      steps: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Comma-separated steps: areas,users,resources,repository (default: all)",
        optional: true,
      },
      verbose: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase() === "true",
        brief: "Enable detailed logging output",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Run complete GitLab crawl with all 4 steps",
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
      host: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "GitLab instance URL (e.g., https://gitlab.com)",
        optional: true,
      },
      "access-token": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "GitLab access token for authentication",
        optional: true,
      },
      "account-id": {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Account ID to use for authentication (from stored accounts)",
        optional: true,
      },
      output: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Output directory for crawled data (default: ./output)",
        optional: true,
      },
      database: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Database file path (default: ./database.yaml)",
        optional: true,
      },
      steps: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Comma-separated steps to run: areas,users,resources,repository (default: all)",
        optional: true,
      },
      token: {
        kind: "parsed",
        parse: (input: string) => input,
        brief: "Personal Access Token (PAT)",
        optional: true,
      },
      resume: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase() === "true",
        brief: "Resume from last successful step",
        optional: true,
      },
      "dry-run": {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase() === "true",
        brief: "Validate configuration without crawling data",
        optional: true,
      },
      verbose: {
        kind: "parsed",
        parse: (input: string) => input.toLowerCase() === "true",
        brief: "Enable detailed logging output",
        optional: true,
      },
    },
  },
  docs: {
    brief: "Crawl GitLab instance and extract data (all steps or specific ones)",
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
