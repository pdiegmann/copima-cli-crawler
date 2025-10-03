// Unit tests for GitLabRestClient

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Create the mock logger instance outside
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

// Create the mock function that accepts a context parameter
const mockCreateLogger = jest.fn((context: string) => mockLogger);

// Mock the logger module before importing GitLabRestClient
jest.mock("../logging", () => ({
  createLogger: mockCreateLogger,
}));

const mockFetch: any = jest.fn();
(global as any).fetch = mockFetch;

// Import GitLabRestClient AFTER mocking
import { GitLabRestClient } from "./gitlabRestClient";

describe("GitLabRestClient", () => {
  const baseUrl = "https://gitlab.example.com/api/v4";
  const accessToken = "test-token";
  let client: GitLabRestClient;

  beforeEach(() => {
    mockFetch.mockReset();

    // Clear only logger method history, not the createLogger history
    // since we want to verify it was called during module import
    mockLogger.error.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.debug.mockClear();

    client = new GitLabRestClient(baseUrl, accessToken);
  });

  it("should log and throw an error for failed requests", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve(""),
    } as any);

    await expect(client.request("/test")).rejects.toThrow("REST request failed: 500");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://gitlab.example.com/api/v4/test",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("should log and return JSON for successful requests", async () => {
    const mockResponse = { data: "test" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    } as any);

    const result = await client.request("/test");
    expect(result).toEqual(mockResponse);

    // For successful requests, no error logging should occur during this test
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it("should fetch branches", async () => {
    const mockBranches = [{ name: "main" }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockBranches),
    } as any);

    const result = await client.fetchBranches("123");
    expect(result).toEqual(mockBranches);
  });

  it("should fetch commits", async () => {
    const mockCommits = [{ id: "abc123" }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockCommits),
    } as any);

    const result = await client.fetchCommits("123");
    expect(result).toEqual(mockCommits);
  });

  it("should fetch tags", async () => {
    const mockTags = [{ name: "v1.0.0" }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockTags),
    } as any);

    const result = await client.fetchTags("123");
    expect(result).toEqual(mockTags);
  });

  describe("pagination", () => {
    it("should handle multiple pages of results", async () => {
      const page1 = Array(100).fill({ id: "item" });
      const page2 = Array(50).fill({ id: "item" });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(page1),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(page2),
        } as any);

      const result = await client.fetchBranches("123");

      expect(result).toHaveLength(150);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should stop pagination on empty result", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      } as any);

      const result = await client.fetchCommits("123");

      expect(result).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle pagination errors gracefully", async () => {
      const page1 = Array(100).fill({ id: "item" });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(page1),
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Server error"),
        } as any);

      const result = await client.fetchTags("123");

      expect(result).toHaveLength(100);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should respect maxPages limit", async () => {
      // This tests the internal fetchAllPaginated method indirectly
      const mockData = Array(100).fill({ id: "item" });

      // Mock 101 pages worth of data
      for (let i = 0; i < 101; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockData),
        } as any);
      }

      const result = await client.fetchBranches("123");

      // Should stop at maxPages (default 100)
      expect(mockFetch).toHaveBeenCalledTimes(100);
    });
  });

  describe("repository methods", () => {
    it("should fetch file blob", async () => {
      const mockBlob = { content: "file content" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockBlob),
      } as any);

      const result = await client.fetchFileBlob("123", "sha123");

      expect(result).toEqual(mockBlob);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/projects/123/repository/blobs/sha123"),
        expect.any(Object)
      );
    });

    it("should fetch repository tree", async () => {
      const mockTree = [{ path: "src/file.ts" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockTree),
      } as any);

      const result = await client.fetchRepositoryTree("123");

      expect(result).toEqual(mockTree);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/projects/123/repository/tree"),
        expect.any(Object)
      );
    });
  });

  describe("job-related methods", () => {
    it("should fetch job artifacts", async () => {
      const mockArtifacts = { artifacts: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockArtifacts),
      } as any);

      const result = await client.fetchArtifacts("123", "job456");

      expect(result).toEqual(mockArtifacts);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/projects/123/jobs/job456/artifacts"),
        expect.any(Object)
      );
    });

    it("should fetch job logs", async () => {
      const mockLogs = "job log output";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockLogs),
      } as any);

      const result = await client.fetchJobLogs("123", "job456");

      expect(result).toEqual(mockLogs);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/projects/123/jobs/job456/trace"),
        expect.any(Object)
      );
    });
  });

  describe("security and compliance methods", () => {
    it("should fetch dependency list", async () => {
      const mockDeps = [{ name: "package1" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockDeps),
      } as any);

      const result = await client.fetchDependencyList("123");

      expect(result).toEqual(mockDeps);
    });

    it("should fetch security vulnerabilities", async () => {
      const mockVulns = [{ severity: "high" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockVulns),
      } as any);

      const result = await client.fetchSecurityVulnerabilities("123");

      expect(result).toEqual(mockVulns);
    });

    it("should fetch compliance frameworks", async () => {
      const mockFrameworks = [{ name: "GDPR" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockFrameworks),
      } as any);

      const result = await client.fetchComplianceFrameworks("123");

      expect(result).toEqual(mockFrameworks);
    });

    it("should fetch package registries", async () => {
      const mockPackages = [{ name: "my-package" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPackages),
      } as any);

      const result = await client.fetchPackageRegistries("123");

      expect(result).toEqual(mockPackages);
    });
  });

  describe("get methods with options", () => {
    it("should getBranches as alias", async () => {
      const mockBranches = [{ name: "main" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockBranches),
      } as any);

      const result = await client.getBranches("123");

      expect(result).toEqual(mockBranches);
    });

    it("should getTags as alias", async () => {
      const mockTags = [{ name: "v1.0.0" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockTags),
      } as any);

      const result = await client.getTags("123");

      expect(result).toEqual(mockTags);
    });

    it("should getCommits with no options", async () => {
      const mockCommits = [{ id: "abc" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCommits),
      } as any);

      const result = await client.getCommits("123");

      expect(result).toEqual(mockCommits);
    });

    it("should getCommits with pagination options", async () => {
      const mockCommits = [{ id: "abc" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCommits),
      } as any);

      const result = await client.getCommits("123", { page: 2, per_page: 50 });

      expect(result).toEqual(mockCommits);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("per_page=50&page=2"),
        expect.any(Object)
      );
    });

    it("should getCommits with query options", async () => {
      const mockCommits = [{ id: "abc" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCommits),
      } as any);

      const result = await client.getCommits("123", { ref_name: "main" });

      expect(result).toEqual(mockCommits);
    });

    it("should getRepositoryTree with no options", async () => {
      const mockTree = [{ path: "file.ts" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockTree),
      } as any);

      const result = await client.getRepositoryTree("123");

      expect(result).toEqual(mockTree);
    });

    it("should getRepositoryTree with pagination", async () => {
      const mockTree = [{ path: "file.ts" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockTree),
      } as any);

      const result = await client.getRepositoryTree("123", { page: 1, per_page: 20 });

      expect(result).toEqual(mockTree);
    });

    it("should getReleases with options", async () => {
      const mockReleases = [{ tag_name: "v1.0" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockReleases),
      } as any);

      const result = await client.getReleases("123", { page: 1 });

      expect(result).toEqual(mockReleases);
    });

    it("should getPipelines with options", async () => {
      const mockPipelines = [{ id: "pipeline1" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPipelines),
      } as any);

      const result = await client.getPipelines("123", { status: "success" });

      expect(result).toEqual(mockPipelines);
    });

    it("should getFileContent", async () => {
      const mockFile = { content: "base64content" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockFile),
      } as any);

      const result = await client.getFileContent("123", "src/file.ts", "develop");

      expect(result).toEqual(mockFile);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("src%2Ffile.ts"),
        expect.any(Object)
      );
    });

    it("should getFileContent with default ref", async () => {
      const mockFile = { content: "base64content" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockFile),
      } as any);

      const result = await client.getFileContent("123", "README.md");

      expect(result).toEqual(mockFile);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("ref=main"), expect.any(Object));
    });

    it("should getProject", async () => {
      const mockProject = { id: "123", name: "Test Project" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProject),
      } as any);

      const result = await client.getProject("123");

      expect(result).toEqual(mockProject);
    });
  });

  describe("standalone utility functions", () => {
    it("should fetchGroups", async () => {
      const mockGroups = [{ id: "group1" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockGroups),
      } as any);

      const { fetchGroups } = await import("./gitlabRestClient");
      const result = await fetchGroups(client);

      expect(result).toEqual(mockGroups);
    });

    it("should fetchProjects", async () => {
      const mockProjects = [{ id: "project1" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProjects),
      } as any);

      const { fetchProjects } = await import("./gitlabRestClient");
      const result = await fetchProjects(client);

      expect(result).toEqual(mockProjects);
    });

    it("should fetchUsers", async () => {
      const mockUsers = [{ id: "user1" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockUsers),
      } as any);

      const { fetchUsers } = await import("./gitlabRestClient");
      const result = await fetchUsers(client);

      expect(result).toEqual(mockUsers);
    });

    it("should fetchLabels", async () => {
      const mockLabels = [{ name: "bug" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockLabels),
      } as any);

      const { fetchLabels } = await import("./gitlabRestClient");
      const result = await fetchLabels(client);

      expect(result).toEqual(mockLabels);
    });

    it("should fetchMilestones", async () => {
      const mockMilestones = [{ title: "v1.0" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockMilestones),
      } as any);

      const { fetchMilestones } = await import("./gitlabRestClient");
      const result = await fetchMilestones(client);

      expect(result).toEqual(mockMilestones);
    });

    it("should fetchIssues", async () => {
      const mockIssues = [{ title: "Bug report" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockIssues),
      } as any);

      const { fetchIssues } = await import("./gitlabRestClient");
      const result = await fetchIssues(client);

      expect(result).toEqual(mockIssues);
    });

    it("should fetchMergeRequests", async () => {
      const mockMRs = [{ title: "Feature PR" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockMRs),
      } as any);

      const { fetchMergeRequests } = await import("./gitlabRestClient");
      const result = await fetchMergeRequests(client);

      expect(result).toEqual(mockMRs);
    });
  });
});
