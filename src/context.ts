import type { StricliAutoCompleteContext } from "@stricli/auto-complete";
import type { CommandContext } from "@stricli/core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type LocalContext = {
  readonly process: NodeJS.Process;
  readonly logger: import("winston").Logger;
  readonly graphqlClient: import("../api/graphqlClient").GraphQLClient;
  readonly restClient: import("../api/restClient").RestClient;
  // ...
} & CommandContext &
  StricliAutoCompleteContext;

import { createGraphQLClient } from "./api/graphqlClient";
import { createLogger } from "./utils/logger";

export const buildContext = (process: NodeJS.Process): LocalContext => {
  return {
    process,
    os,
    fs,
    path,
    logger: createLogger("Context"),
    graphqlClient: createGraphQLClient(),
    restClient: createRestClient(),
  };
};
