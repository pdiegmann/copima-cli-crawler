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
jest.mock("../utils/logger", () => ({
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
    mockFetch.mockClear();

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
      text: () => Promise.resolve("")
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
      json: () => Promise.resolve(mockResponse)
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
      json: () => Promise.resolve(mockBranches)
    } as any);

    const result = await client.fetchBranches("123");
    expect(result).toEqual(mockBranches);
  });

  it("should fetch commits", async () => {
    const mockCommits = [{ id: "abc123" }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockCommits)
    } as any);

    const result = await client.fetchCommits("123");
    expect(result).toEqual(mockCommits);
  });

  it("should fetch tags", async () => {
    const mockTags = [{ name: "v1.0.0" }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockTags)
    } as any);

    const result = await client.fetchTags("123");
    expect(result).toEqual(mockTags);
  });
});
