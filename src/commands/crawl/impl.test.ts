// src/commands/crawl/impl.test.ts

import { getDatabase } from "../../account/storage.js";
import { createGraphQLClient, createRestClient } from "../../api/index.js";
import { TokenManager } from "../../auth/tokenManager.js";
import { createCallbackManager } from "../../callback";
import { loadConfig } from "../../config/loader.js";
import { createLogger } from "../../logging/index.js";
import * as impl from "./impl";

// Mock dependencies
jest.mock("../../account/storage.js");
jest.mock("../../api/index.js");
jest.mock("../../auth/tokenManager.js");
jest.mock("../../callback");
jest.mock("../../config/loader.js");
jest.mock("../../logging/index.js");
jest.mock("fs");
jest.mock("path");

describe("crawl impl", () => {
  let mockLogger: any;
  let mockGraphQLClient: any;
  let mockRestClient: any;
  let mockDatabase: any;
  let mockTokenManager: any;
  let mockCallbackManager: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    // Setup mock GraphQL client
    mockGraphQLClient = {
      fetchAllGroups: jest.fn().mockResolvedValue([
        { id: "1", fullPath: "group1", name: "Group 1" },
        { id: "2", fullPath: "group2", name: "Group 2" },
      ]),
      fetchAllProjects: jest.fn().mockResolvedValue([
        { id: "1", fullPath: "project1", name: "Project 1" },
      ]),
      fetchUsers: jest.fn().mockResolvedValue([
        { id: "1", username: "user1", name: "User 1" },
      ]),
      fetchProjects: jest.fn().mockResolvedValue({
        nodes: [{ id: "1", name: "Project 1" }],
      }),
    };
    (createGraphQLClient as jest.Mock).mockReturnValue(mockGraphQLClient);

    // Setup mock REST client
    mockRestClient = {};
    (createRestClient as jest.Mock).mockReturnValue(mockRestClient);

    // Setup mock database and TokenManager
    mockDatabase = {
      upsertUser: jest.fn(),
      insertAccount: jest.fn(),
    };
    (getDatabase as jest.Mock).mockReturnValue(mockDatabase);

    mockTokenManager = {
      resolveAccountId: jest.fn().mockResolvedValue("account-1"),
      getAccessToken: jest.fn().mockResolvedValue("valid-token"),
    };
    (TokenManager as jest.Mock).mockImplementation(() => mockTokenManager);

    // Setup mock callback manager
    mockCallbackManager = {
      processObjects: jest.fn().mockImplementation((ctx, data) => Promise.resolve(data)),
    };
    (createCallbackManager as jest.Mock).mockReturnValue(mockCallbackManager);

    // Setup mock config
    (loadConfig as jest.Mock).mockResolvedValue({
      gitlab: {
        host: "https://gitlab.example.com",
        accessToken: "config-token",
      },
      callbacks: { enabled: false },
      resume: { enabled: false },
      progress: { enabled: false },
    });
  });

  describe("markFlagsFromOrchestrator", () => {
    it("should add orchestrator flag to empty flags", () => {
      const result = impl.markFlagsFromOrchestrator(undefined);
      expect(result).toEqual({ __copimaCrawlOrchestrator__: true });
    });

    it("should add orchestrator flag to existing flags", () => {
      const flags = { host: "https://gitlab.com", accountId: "acc1" };
      const result = impl.markFlagsFromOrchestrator(flags);
      expect(result).toEqual({
        host: "https://gitlab.com",
        accountId: "acc1",
        __copimaCrawlOrchestrator__: true,
      });
    });

    it("should not duplicate orchestrator flag if already present", () => {
      const flags = { __copimaCrawlOrchestrator__: true, host: "https://gitlab.com" };
      const result = impl.markFlagsFromOrchestrator(flags);
      expect(result).toBe(flags);
    });
  });

  describe("isCalledFromOrchestrator", () => {
    it("should return true when orchestrator flag is present", () => {
      const flags = { __copimaCrawlOrchestrator__: true };
      expect(impl.isCalledFromOrchestrator(flags)).toBe(true);
    });

    it("should return false when orchestrator flag is absent", () => {
      const flags = { host: "https://gitlab.com" };
      expect(impl.isCalledFromOrchestrator(flags)).toBe(false);
    });

    it("should return false for null flags", () => {
      expect(impl.isCalledFromOrchestrator(null)).toBe(false);
    });

    it("should return false for undefined flags", () => {
      expect(impl.isCalledFromOrchestrator(undefined)).toBe(false);
    });
  });

  describe("crawlCommand", () => {
    let mockFs: any;
    let mockPath: any;

    beforeEach(() => {
      // Mock fs module
      mockFs = {
        existsSync: jest.fn().mockReturnValue(true),
        mkdirSync: jest.fn(),
        writeFileSync: jest.fn(),
        createWriteStream: jest.fn().mockReturnValue({
          write: jest.fn(),
          end: jest.fn(),
        }),
      };
      jest.doMock("fs", () => mockFs);

      // Mock path module
      mockPath = {
        dirname: jest.fn().mockReturnValue("./"),
        resolve: jest.fn().mockReturnValue("output/areas"),
        join: jest.fn().mockImplementation((...args) => args.join("/")),
      };
      jest.doMock("path", () => mockPath);
    });

    it("should execute areas and users steps by default", async () => {
      const options = {
        database: "./test-db.yaml",
        accessToken: "test-token",
        host: "https://gitlab.example.com",
      };

      await impl.crawlCommand(options);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Starting complete GitLab crawl"));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Executing steps: areas, users"));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("completed successfully"));
    });

    it("should handle custom steps parameter", async () => {
      const options = {
        steps: "areas,resources",
        database: "./test-db.yaml",
        accessToken: "test-token",
        host: "https://gitlab.example.com",
      };

      await impl.crawlCommand(options);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Executing steps: areas, resources"));
    });

    it("should handle test mode with test token", async () => {
      const options = {
        database: "./test-db.yaml",
        accessToken: "test_token_123",
        host: "https://gitlab.example.com",
      };

      await impl.crawlCommand(options);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Test mode detected"));
    });

    it("should handle global test token", async () => {
      (global as any).testAccessToken = "global-test-token";

      const options = {
        database: "./test-db.yaml",
        host: "https://gitlab.example.com",
      };

      await impl.crawlCommand(options);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Using access token passed via test parameter"));

      delete (global as any).testAccessToken;
    });

    it("should warn when no token is available", async () => {
      mockTokenManager.resolveAccountId.mockResolvedValue(null);

      const options = {
        database: "./test-db.yaml",
        host: "https://gitlab.example.com",
      };

      await impl.crawlCommand(options);

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Unable to determine which account to use"));
    });

    it("should handle database token resolution", async () => {
      const options = {
        database: "./test-db.yaml",
        accountId: "account-1",
        host: "https://gitlab.example.com",
      };

      await impl.crawlCommand(options);

      expect(mockTokenManager.resolveAccountId).toHaveBeenCalledWith("account-1");
      expect(mockTokenManager.getAccessToken).toHaveBeenCalledWith("account-1");
    });

    it("should handle errors gracefully", async () => {
      mockGraphQLClient.fetchAllGroups.mockRejectedValue(new Error("API Error"));

      const options = {
        database: "./test-db.yaml",
        accessToken: "valid-token",
        host: "https://gitlab.example.com",
      };

      await expect(impl.crawlCommand(options)).rejects.toThrow("API Error");
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Crawl command failed"), expect.any(Object));
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("completed with errors"));
    });

    it("should handle unknown steps with warning", async () => {
      const options = {
        steps: "unknown-step",
        database: "./test-db.yaml",
        accessToken: "test-token",
        host: "https://gitlab.example.com",
      };

      await impl.crawlCommand(options);

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Unknown step: unknown-step"));
    });
  });

  describe("areas", () => {
    let context: any;

    beforeEach(() => {
      context = {
        logger: mockLogger,
        graphqlClient: mockGraphQLClient,
        restClient: mockRestClient,
        fs: {
          mkdirSync: jest.fn(),
          createWriteStream: jest.fn().mockReturnValue({
            write: jest.fn(),
            end: jest.fn(),
          }),
        },
        path: {
          resolve: jest.fn().mockReturnValue("output/areas"),
          join: jest.fn().mockImplementation((...args) => args.join("/")),
        },
        config: {
          gitlab: {
            host: "https://gitlab.example.com",
            accessToken: "valid-token",
          },
          callbacks: { enabled: false },
        },
      };
    });

    it("should fetch and store groups and projects", async () => {
      const flags = { host: "https://gitlab.example.com", accessToken: "valid-token" };

      await impl.areas.call(context, flags);

      expect(mockGraphQLClient.fetchAllGroups).toHaveBeenCalled();
      expect(mockGraphQLClient.fetchAllProjects).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Fetched 2 groups"));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Fetched 1 projects"));
    });

    it("should handle test mode", async () => {
      const flags = { accessToken: "test_token_123" };

      await impl.areas.call(context, flags);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Test mode detected"));
    });

    it("should handle orchestrator call without duplicate logging", async () => {
      const flags = { __copimaCrawlOrchestrator__: true, accessToken: "valid-token", host: "https://gitlab.example.com" };

      await impl.areas.call(context, flags);

      expect(mockGraphQLClient.fetchAllGroups).toHaveBeenCalled();
    });

    it("should handle missing token", async () => {
      mockTokenManager.getAccessToken.mockResolvedValue(null);
      const flags = { host: "https://gitlab.example.com" };

      await impl.areas.call(context, flags);

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("No valid access token found"));
    });

    it("should handle errors during fetch", async () => {
      mockGraphQLClient.fetchAllGroups.mockRejectedValue(new Error("GraphQL Error"));
      const flags = { accessToken: "valid-token", host: "https://gitlab.example.com" };

      await expect(impl.areas.call(context, flags)).rejects.toThrow("GraphQL Error");
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Error during Step 1"), expect.any(Object));
    });
  });

  describe("users", () => {
    let context: any;

    beforeEach(() => {
      context = {
        logger: mockLogger,
        graphqlClient: mockGraphQLClient,
        restClient: mockRestClient,
        fs: {
          mkdirSync: jest.fn(),
          createWriteStream: jest.fn().mockReturnValue({
            write: jest.fn(),
            end: jest.fn(),
          }),
        },
        path: {
          resolve: jest.fn().mockReturnValue("output/users"),
          join: jest.fn().mockImplementation((...args) => args.join("/")),
        },
        config: {
          gitlab: {
            host: "https://gitlab.example.com",
            accessToken: "valid-token",
          },
          callbacks: { enabled: false },
        },
      };
    });

    it("should fetch and store users", async () => {
      const flags = { accessToken: "valid-token" };

      await impl.users.call(context, flags);

      expect(mockGraphQLClient.fetchUsers).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Fetched 1 users"));
    });

    it("should handle test mode", async () => {
      const flags = { accessToken: "test_token_123" };

      await impl.users.call(context, flags);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Test mode detected"));
    });

    it("should handle orchestrator call", async () => {
      const flags = { __copimaCrawlOrchestrator__: true, accessToken: "valid-token" };

      await impl.users.call(context, flags);

      expect(mockGraphQLClient.fetchUsers).toHaveBeenCalled();
    });

    it("should handle errors during fetch", async () => {
      mockGraphQLClient.fetchUsers.mockRejectedValue(new Error("GraphQL Error"));
      const flags = { accessToken: "valid-token" };

      await expect(impl.users.call(context, flags)).rejects.toThrow("GraphQL Error");
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Error during Step 2"), expect.any(Object));
    });
  });

  describe("resources", () => {
    let context: any;

    beforeEach(() => {
      context = {
        logger: mockLogger,
        graphqlClient: mockGraphQLClient,
        restClient: mockRestClient,
        fs: {
          mkdirSync: jest.fn(),
          createWriteStream: jest.fn().mockReturnValue({
            write: jest.fn(),
            end: jest.fn(),
          }),
        },
        path: {
          resolve: jest.fn().mockReturnValue("output/resources"),
          join: jest.fn().mockImplementation((...args) => args.join("/")),
        },
        config: {
          gitlab: {
            host: "https://gitlab.example.com",
            accessToken: "valid-token",
          },
          callbacks: { enabled: false },
        },
      };
    });

    it("should fetch projects and create resource files", async () => {
      const flags = { accessToken: "valid-token" };

      await impl.resources.call(context, flags);

      expect(mockGraphQLClient.fetchProjects).toHaveBeenCalledWith(10);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Found 1 accessible projects"));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Stored all required resource files"));
    });

    it("should handle orchestrator call", async () => {
      const flags = { __copimaCrawlOrchestrator__: true };

      await impl.resources.call(context, flags);

      expect(mockGraphQLClient.fetchProjects).toHaveBeenCalled();
    });

    it("should handle errors during fetch", async () => {
      mockGraphQLClient.fetchProjects.mockRejectedValue(new Error("GraphQL Error"));
      const flags = {};

      await expect(impl.resources.call(context, flags)).rejects.toThrow("GraphQL Error");
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Error during Step 3"), expect.any(Object));
    });
  });

  describe("repository", () => {
    let context: any;

    beforeEach(() => {
      context = {
        logger: mockLogger,
        graphqlClient: mockGraphQLClient,
        restClient: mockRestClient,
        fs: {
          mkdirSync: jest.fn(),
          createWriteStream: jest.fn().mockReturnValue({
            write: jest.fn(),
            end: jest.fn(),
          }),
        },
        path: {
          resolve: jest.fn().mockReturnValue("output/repository"),
          join: jest.fn().mockImplementation((...args) => args.join("/")),
        },
        config: {
          gitlab: {
            host: "https://gitlab.example.com",
            accessToken: "valid-token",
          },
          callbacks: { enabled: false },
        },
      };
    });

    it("should fetch projects and create repository files", async () => {
      const flags = { accessToken: "valid-token" };

      await impl.repository.call(context, flags);

      expect(mockGraphQLClient.fetchProjects).toHaveBeenCalledWith(5);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Found 1 projects with repository information"));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Stored all required repository files"));
    });

    it("should handle orchestrator call", async () => {
      const flags = { __copimaCrawlOrchestrator__: true };

      await impl.repository.call(context, flags);

      expect(mockGraphQLClient.fetchProjects).toHaveBeenCalled();
    });

    it("should handle errors during fetch", async () => {
      mockGraphQLClient.fetchProjects.mockRejectedValue(new Error("GraphQL Error"));
      const flags = {};

      await expect(impl.repository.call(context, flags)).rejects.toThrow("GraphQL Error");
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Error during Step 4"), expect.any(Object));
    });
  });

  describe("crawlAll", () => {
    let context: any;

    beforeEach(() => {
      context = {
        logger: mockLogger,
        graphqlClient: mockGraphQLClient,
        restClient: mockRestClient,
        config: {
          gitlab: {
            host: "https://gitlab.example.com",
            accessToken: "valid-token",
          },
          resume: { enabled: false },
          progress: { enabled: false },
        },
      };
    });

    it("should handle successful crawl", async () => {
      // Mock successful newImpl
      jest.doMock("./newImpl.js", () => ({
        crawlAll: jest.fn().mockResolvedValue({
          success: true,
          totalProcessingTime: 1000,
          summary: {
            resourcesCrawled: 10,
            errors: [],
            warnings: [],
          },
        }),
      }));

      const flags = {};

      await impl.crawlAll.call(context, flags);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Starting complete GitLab crawl"));
    });

    it("should fallback to legacy implementation on import error", async () => {
      // Mock import failure
      jest.doMock("./newImpl.js", () => {
        throw new Error("Module not found");
      });

      const flags = {};

      await impl.crawlAll.call(context, flags);

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Could not load newImpl.js"), expect.any(Object));
    });

    it("should handle errors and fallback to legacy", async () => {
      // Mock newImpl with error
      jest.doMock("./newImpl.js", () => ({
        crawlAll: jest.fn().mockRejectedValue(new Error("Crawl failed")),
      }));

      const flags = {};

      await impl.crawlAll.call(context, flags);

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("GitLab crawl failed"), expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Falling back to legacy crawl"));
    });
  });

  describe("legacyCrawlAll", () => {
    let context: any;

    beforeEach(() => {
      context = {
        logger: mockLogger,
        graphqlClient: mockGraphQLClient,
        restClient: mockRestClient,
      };

      // Mock REST API functions
      jest.doMock("../../api/gitlabRestClient", () => ({
        fetchGroups: jest.fn().mockResolvedValue([]),
        fetchProjects: jest.fn().mockResolvedValue([]),
        fetchUsers: jest.fn().mockResolvedValue([]),
        fetchLabels: jest.fn().mockResolvedValue([]),
        fetchMilestones: jest.fn().mockResolvedValue([]),
        fetchIssues: jest.fn().mockResolvedValue([]),
        fetchMergeRequests: jest.fn().mockResolvedValue([]),
      }));
    });

    it("should execute legacy crawl steps", async () => {
      const flags = {};
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await impl.legacyCrawlAll.call(context, flags);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Starting complete GitLab crawl (legacy mode)"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("GitLab crawl completed successfully"));

      consoleSpy.mockRestore();
    });
  });
});
