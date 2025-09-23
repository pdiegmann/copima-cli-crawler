import type { CommandContext } from '@stricli/core';
import type { StricliAutoCompleteContext } from '@stricli/auto-complete';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type LocalContext = {
  readonly process: NodeJS.Process;
  readonly logger: import('winston').Logger;
  readonly graphqlClient: import('../api/graphqlClient').GraphQLClient;
  readonly restClient: import('../api/restClient').RestClient;
  // ...
} & CommandContext &
  StricliAutoCompleteContext;

import logger from './utils/logger';
import { createGraphQLClient } from './api/graphqlClient';

export function buildContext(process: NodeJS.Process): LocalContext {
  return {
    process,
    os,
    fs: require('node:fs'),
    path: require('node:path'),
    logger,
    graphqlClient: createGraphQLClient(),
    restClient: createRestClient(),
  };
}
