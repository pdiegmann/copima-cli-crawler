import type { StricliAutoCompleteContext } from "@stricli/auto-complete";
import type { CommandContext } from "@stricli/core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type LocalContext = {
  readonly process: NodeJS.Process;
  readonly logger: ReturnType<typeof createLogger>;
  readonly graphqlClient: any;
  readonly restClient: any;
  // ...
} & CommandContext &
  StricliAutoCompleteContext;

import { createGraphQLClient, createRestClient } from "./api";
import { createLogger } from "./logging/logger";

export const buildContext = (process: NodeJS.Process, config?: any): LocalContext => {
  // Use actual config values if provided, otherwise fall back to defaults
  const gitlabHost = config?.gitlab?.host || "https://gitlab.example.com";
  const accessToken = config?.gitlab?.accessToken || "your-token";

  return {
    process,
    os,
    fs,
    path,
    logger: createLogger("Context"),
    graphqlClient: createGraphQLClient(gitlabHost, accessToken),
    restClient: createRestClient(gitlabHost, accessToken),
  };
};
