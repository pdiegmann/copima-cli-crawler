import { buildCommand } from '@stricli/core';
import type { LocalContext } from '../../context';

export const addAccountCommand = buildCommand({
  loader: async () => {
    const { addAccount } = await import('./impl.js');
    return addAccount;
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
        brief: 'GitLab instance host (e.g., gitlab.com)',
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
      'account-id': {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'Account identifier (optional, will be generated if not provided)',
        optional: true,
      },
      name: {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'Display name for the account',
        optional: true,
      },
      email: {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'Email address associated with the account',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Add a new GitLab account with OAuth2 credentials',
  },
});

export const listAccountsCommand = buildCommand({
  loader: async () => {
    const { listAccounts } = await import('./impl.js');
    return listAccounts;
  },
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [],
    },
    flags: {
      format: {
        kind: 'parsed',
        parse: (input: string) => {
          const format = input.toLowerCase();
          if (['table', 'json', 'yaml'].includes(format)) {
            return format;
          }
          return 'table';
        },
        brief: 'Output format (table|json|yaml)',
        optional: true,
      },
      'show-tokens': {
        kind: 'parsed',
        parse: (input: string) => input.toLowerCase() === 'true',
        brief: 'Include access/refresh tokens in output (security risk)',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'List all stored GitLab accounts',
  },
});

export const removeAccountCommand = buildCommand({
  loader: async () => {
    const { removeAccount } = await import('./impl.js');
    return removeAccount;
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
      'account-id': {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'Account identifier',
        optional: true,
      },
      force: {
        kind: 'parsed',
        parse: (input: string) => input.toLowerCase() === 'true',
        brief: 'Skip confirmation prompt',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Remove a GitLab account',
  },
});

export const refreshTokenCommand = buildCommand({
  loader: async () => {
    const { refreshToken } = await import('./impl.js');
    return refreshToken;
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
      'account-id': {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'Account identifier',
        optional: true,
      },
      'client-id': {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'OAuth2 client ID',
        optional: true,
      },
      'client-secret': {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'OAuth2 client secret',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Refresh OAuth2 tokens for an account',
  },
});
