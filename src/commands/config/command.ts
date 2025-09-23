import { buildCommand } from '@stricli/core';
import type { LocalContext } from '../../context';

export const showConfigCommand = buildCommand({
  loader: async () => {
    const { showConfig } = await import('./impl.js');
    return showConfig;
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
      section: {
        kind: 'parsed',
        parse: (input: string) => {
          const section = input.toLowerCase();
          if (['gitlab', 'database', 'output', 'logging', 'progress', 'resume'].includes(section)) {
            return section;
          }
          throw new Error(`Invalid section: ${input}. Must be one of: gitlab, database, output, logging, progress, resume`);
        },
        brief: 'Configuration section to display',
        optional: true,
      },
      source: {
        kind: 'parsed',
        parse: (input: string) => input.toLowerCase() === 'true',
        brief: 'Show configuration source',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Show current configuration values',
  },
});

export const setConfigCommand = buildCommand({
  loader: async () => {
    const { setConfig } = await import('./impl.js');
    return setConfig;
  },
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [],
    },
    flags: {
      key: {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'Configuration key to set',
      },
      value: {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'Configuration value',
      },
      global: {
        kind: 'parsed',
        parse: (input: string) => input.toLowerCase() === 'true',
        brief: 'Set in global config',
        optional: true,
      },
      type: {
        kind: 'parsed',
        parse: (input: string) => {
          const type = input.toLowerCase();
          if (['string', 'number', 'boolean'].includes(type)) {
            return type;
          }
          return 'string';
        },
        brief: 'Value type (string|number|boolean)',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Set a configuration value',
  },
});

export const unsetConfigCommand = buildCommand({
  loader: async () => {
    const { unsetConfig } = await import('./impl.js');
    return unsetConfig;
  },
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [],
    },
    flags: {
      key: {
        kind: 'parsed',
        parse: (input: string) => input,
        brief: 'Configuration key to remove',
      },
      global: {
        kind: 'parsed',
        parse: (input: string) => input.toLowerCase() === 'true',
        brief: 'Remove from global config',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Remove a configuration value',
  },
});

export const validateConfigCommand = buildCommand({
  loader: async () => {
    const { validateConfig } = await import('./impl.js');
    return validateConfig;
  },
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [],
    },
    flags: {
      fix: {
        kind: 'parsed',
        parse: (input: string) => input.toLowerCase() === 'true',
        brief: 'Fix configuration issues',
        optional: true,
      },
      strict: {
        kind: 'parsed',
        parse: (input: string) => input.toLowerCase() === 'true',
        brief: 'Strict validation',
        optional: true,
      },
    },
  },
  docs: {
    brief: 'Validate configuration',
  },
});
