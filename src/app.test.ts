/**
 * Test suite for main application configuration
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Mock Stricli functions
const mockBuildRouteMap = jest.fn();
const mockBuildApplication = jest.fn();
const mockBuildInstallCommand = jest.fn();
const mockBuildUninstallCommand = jest.fn();

jest.mock("@stricli/core", () => ({
  __esModule: true,
  buildRouteMap: mockBuildRouteMap,
  buildApplication: mockBuildApplication,
}));

jest.mock("@stricli/auto-complete", () => ({
  __esModule: true,
  buildInstallCommand: mockBuildInstallCommand,
  buildUninstallCommand: mockBuildUninstallCommand,
}));

// Mock package.json with proper module resolution
jest.mock(
  "../package.json",
  () => ({
    __esModule: true,
    name: "copima-cli-crawler",
    version: "1.0.0",
  }),
  { virtual: true }
);

// Mock all command imports
jest.mock("./commands/crawl/commands", () => ({
  areasCommand: { name: "areasCommand" },
  crawlCommand: { name: "crawlCommand" },
  repositoryCommand: { name: "repositoryCommand" },
  resourcesCommand: { name: "resourcesCommand" },
  usersCommand: { name: "usersCommand" },
}));

jest.mock("./commands/account/command", () => ({
  addAccountCommand: { name: "addAccountCommand" },
  listAccountsCommand: { name: "listAccountsCommand" },
  refreshTokenCommand: { name: "refreshTokenCommand" },
  removeAccountCommand: { name: "removeAccountCommand" },
}));

jest.mock("./commands/config/command", () => ({
  setConfigCommand: { name: "setConfigCommand" },
  showConfigCommand: { name: "showConfigCommand" },
  unsetConfigCommand: { name: "unsetConfigCommand" },
  setupConfigCommand: { name: "setupConfigCommand" },
  validateConfigCommand: { name: "validateConfigCommand" },
}));

jest.mock("./commands/test/command", () => ({
  testCommand: { name: "testCommand" },
}));

jest.mock("./commands/auth/command", () => ({
  authCommand: { name: "authCommand" },
}));

describe("Application Configuration", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Set up default mock returns
    mockBuildRouteMap.mockReturnValue({ type: "routeMap" });
    mockBuildApplication.mockReturnValue({ type: "application" });
    mockBuildInstallCommand.mockReturnValue({ type: "installCommand" });
    mockBuildUninstallCommand.mockReturnValue({ type: "uninstallCommand" });
  });

  describe("route configuration", () => {
    it("should build route map with all required commands", () => {
      // Import app to trigger the route building
      require("./app");

      expect(mockBuildRouteMap).toHaveBeenCalledWith({
        routes: expect.objectContaining({
          // Crawl commands
          areas: { name: "areasCommand" },
          users: { name: "usersCommand" },
          resources: { name: "resourcesCommand" },
          repository: { name: "repositoryCommand" },
          crawl: { name: "crawlCommand" },

          // Account commands
          "account:add": { name: "addAccountCommand" },
          "account:list": { name: "listAccountsCommand" },
          "account:remove": { name: "removeAccountCommand" },
          "account:refresh": { name: "refreshTokenCommand" },

          // Config commands
          "config:show": { name: "showConfigCommand" },
          "config:set": { name: "setConfigCommand" },
          "config:unset": { name: "unsetConfigCommand" },
          "config:setup": { name: "setupConfigCommand" },
          "config:validate": { name: "validateConfigCommand" },
          setup: { name: "setupConfigCommand" },

          // Auth command
          auth: { name: "authCommand" },

          // Test command
          test: { name: "testCommand" },

          // Auto-completion commands
          install: { type: "installCommand" },
          uninstall: { type: "uninstallCommand" },
        }),
        docs: {
          brief: "GitLab crawler CLI for extracting resources via GraphQL and REST APIs",
          hideRoute: {
            install: true,
            uninstall: true,
          },
        },
      });
    });

    it("should configure auto-completion commands correctly", () => {
      require("./app");

      expect(mockBuildInstallCommand).toHaveBeenCalledWith("copima-cli-crawler", {
        bash: "__copima-cli-crawler_bash_complete",
      });

      expect(mockBuildUninstallCommand).toHaveBeenCalledWith("copima-cli-crawler", {
        bash: true,
      });
    });
  });

  describe("application building", () => {
    it("should build application with correct configuration", () => {
      require("./app");

      expect(mockBuildApplication).toHaveBeenCalledWith(
        { type: "routeMap" },
        {
          name: "copima-cli-crawler",
          versionInfo: {
            currentVersion: "1.0.0",
          },
        }
      );
    });

    it("should export the built application", () => {
      const { app } = require("./app");

      expect(app).toEqual({ type: "application" });
    });
  });

  describe("route structure", () => {
    it("should include all crawl workflow commands", async () => {
      await import("./app");

      expect(mockBuildRouteMap.mock.calls).toHaveLength(1);
      const routeConfig = mockBuildRouteMap.mock.calls[0]?.[0] as any;

      // Verify crawl workflow commands are present
      expect(routeConfig.routes).toHaveProperty("areas");
      expect(routeConfig.routes).toHaveProperty("users");
      expect(routeConfig.routes).toHaveProperty("resources");
      expect(routeConfig.routes).toHaveProperty("repository");
      expect(routeConfig.routes).toHaveProperty("crawl");
    });

    it("should include all account management commands", async () => {
      await import("./app");

      expect(mockBuildRouteMap.mock.calls).toHaveLength(1);
      const routeConfig = mockBuildRouteMap.mock.calls[0]?.[0] as any;

      expect(routeConfig.routes).toHaveProperty("account:add");
      expect(routeConfig.routes).toHaveProperty("account:list");
      expect(routeConfig.routes).toHaveProperty("account:remove");
      expect(routeConfig.routes).toHaveProperty("account:refresh");
    });

    it("should include all configuration management commands", async () => {
      await import("./app");

      expect(mockBuildRouteMap.mock.calls).toHaveLength(1);
      const routeConfig = mockBuildRouteMap.mock.calls[0]?.[0] as any;

      expect(routeConfig.routes).toHaveProperty("config:show");
      expect(routeConfig.routes).toHaveProperty("config:set");
      expect(routeConfig.routes).toHaveProperty("config:unset");
      expect(routeConfig.routes).toHaveProperty("config:setup");
      expect(routeConfig.routes).toHaveProperty("config:validate");
      expect(routeConfig.routes).toHaveProperty("setup");
    });

    it("should include authentication and testing commands", async () => {
      await import("./app");

      expect(mockBuildRouteMap.mock.calls).toHaveLength(1);
      const routeConfig = mockBuildRouteMap.mock.calls[0]?.[0] as any;

      expect(routeConfig.routes).toHaveProperty("auth");
      expect(routeConfig.routes).toHaveProperty("test");
    });

    it("should hide auto-completion commands in documentation", async () => {
      await import("./app");

      expect(mockBuildRouteMap.mock.calls).toHaveLength(1);
      const routeConfig = mockBuildRouteMap.mock.calls[0]?.[0] as any;

      expect(routeConfig.docs.hideRoute.install).toBe(true);
      expect(routeConfig.docs.hideRoute.uninstall).toBe(true);
    });
  });
});
