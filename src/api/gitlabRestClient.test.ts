// Unit tests for GitLabRestClient

import { GitLabRestClient } from "./gitlabRestClient";
import fetchMock from "jest-fetch-mock";
import createLogger from "../utils/logger";

jest.mock("../utils/logger");
jest.mock("node-fetch", () => require("jest-fetch-mock"));

describe("GitLabRestClient", () => {
  const baseUrl = "https://gitlab.example.com/api/v4";
  const accessToken = "test-token";
  let client: GitLabRestClient;

  beforeEach(() => {
    fetchMock.resetMocks();
    client = new GitLabRestClient(baseUrl, accessToken);
  });

  it("should log and throw an error for failed requests", async () => {
    fetchMock.mockResponseOnce("", { status: 500 });

    await expect(client.request("/test")).rejects.toThrow("REST request failed: 500");
    expect(createLogger).toHaveBeenCalledWith("GitLabRestClient");
  });

  it("should log and return JSON for successful requests", async () => {
    const mockResponse = { data: "test" };
    fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

    const result = await client.request("/test");
    expect(result).toEqual(mockResponse);
    expect(createLogger).toHaveBeenCalledWith("GitLabRestClient");
  });

  it("should fetch branches", async () => {
    const mockBranches = [{ name: "main" }];
    fetchMock.mockResponseOnce(JSON.stringify(mockBranches));

    const result = await client.fetchBranches("123");
    expect(result).toEqual(mockBranches);
  });

  it("should fetch commits", async () => {
    const mockCommits = [{ id: "abc123" }];
    fetchMock.mockResponseOnce(JSON.stringify(mockCommits));

    const result = await client.fetchCommits("123");
    expect(result).toEqual(mockCommits);
  });

  it("should fetch tags", async () => {
    const mockTags = [{ name: "v1.0.0" }];
    fetchMock.mockResponseOnce(JSON.stringify(mockTags));

    const result = await client.fetchTags("123");
    expect(result).toEqual(mockTags);
  });
});
