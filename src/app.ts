import { buildInstallCommand, buildUninstallCommand } from "@stricli/auto-complete";
import { buildApplication, buildRouteMap } from "@stricli/core";
import { name, version } from "../package.json";

// Import crawl commands
import { areasCommand, crawlCommand, repositoryCommand, resourcesCommand, usersCommand } from "./commands/crawl/commands";

// Import account commands
import { addAccountCommand, importCSVCommand, listAccountsCommand, refreshTokenCommand, removeAccountCommand } from "./commands/account/command";

// Import config commands
import { setConfigCommand, setupConfigCommand, showConfigCommand, unsetConfigCommand, validateConfigCommand } from "./commands/config/command";

// Import test commands
import { testCommand } from "./commands/test/command";

// Import auth commands
import { authCommand } from "./commands/auth/command";

const routes = buildRouteMap({
  routes: {
    // Crawl commands - implementing the 4-step GitLab crawling workflow
    areas: areasCommand,
    users: usersCommand,
    resources: resourcesCommand,
    repository: repositoryCommand,
    crawl: crawlCommand,

    // Account management commands - OAuth2 credential storage
    "account:add": addAccountCommand,
    "account:list": listAccountsCommand,
    "account:remove": removeAccountCommand,
    "account:refresh": refreshTokenCommand,
    "account:import": importCSVCommand,

    // Configuration management commands - YAML file operations
    "config:show": showConfigCommand,
    "config:set": setConfigCommand,
    "config:unset": unsetConfigCommand,
    "config:validate": validateConfigCommand,
    "config:setup": setupConfigCommand,
    setup: setupConfigCommand,

    // Authentication commands - OAuth2 browser flow
    auth: authCommand,

    // Testing commands - End-to-end test runner
    test: testCommand,

    // Auto-completion commands
    install: buildInstallCommand("copima-cli-crawler", {
      bash: "__copima-cli-crawler_bash_complete",
    }),
    uninstall: buildUninstallCommand("copima-cli-crawler", { bash: true }),
  },
  docs: {
    brief: "GitLab crawler CLI for extracting resources via GraphQL and REST APIs",
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
