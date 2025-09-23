import { buildApplication, buildRouteMap } from '@stricli/core';
import { buildInstallCommand, buildUninstallCommand } from '@stricli/auto-complete';
import { name, version, description } from '../package.json';

// Import crawl commands
import { areasCommand, usersCommand, resourcesCommand, repositoryCommand, crawlAllCommand } from './commands/crawl/commands';

// Import account commands
import { addAccountCommand, listAccountsCommand, removeAccountCommand, refreshTokenCommand } from './commands/account/command';

// Import config commands
import { showConfigCommand, setConfigCommand, unsetConfigCommand, validateConfigCommand } from './commands/config/command';

const routes = buildRouteMap({
  routes: {
    // Crawl commands - implementing the 4-step GitLab crawling workflow
    areas: areasCommand,
    users: usersCommand,
    resources: resourcesCommand,
    repository: repositoryCommand,
    crawl: crawlAllCommand,

    // Account management commands - OAuth2 credential storage
    'account:add': addAccountCommand,
    'account:list': listAccountsCommand,
    'account:remove': removeAccountCommand,
    'account:refresh': refreshTokenCommand,

    // Configuration management commands - YAML file operations
    'config:show': showConfigCommand,
    'config:set': setConfigCommand,
    'config:unset': unsetConfigCommand,
    'config:validate': validateConfigCommand,

    // Auto-completion commands
    install: buildInstallCommand('copima-cli-crawler', { bash: '__copima-cli-crawler_bash_complete' }),
    uninstall: buildUninstallCommand('copima-cli-crawler', { bash: true }),
  },
  docs: {
    brief: 'GitLab crawler CLI for extracting resources via GraphQL and REST APIs',
    hideRoute: {
      install: true,
      uninstall: true,
    },
  },
});

export const app = buildApplication(routes, {
  name,
  versionInfo: {
    currentVersion: version,
  },
});
