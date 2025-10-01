/**
 * Test suite for GitLab GraphQL client
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { GitLabGraphQLClient } from './gitlabGraphQLClient.js';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Mock logger
jest.mock('../logging', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock OAuth2 manager
jest.mock('../auth/oauth2Manager', () => ({
  createOAuth2Manager: jest.fn(() => ({
    refreshAccessToken: jest.fn(),
  })),
}));

// Mock GraphQL queries
jest.mock('./queries/groupQueries', () => ({
  FETCH_COMPREHENSIVE_GROUP_PROJECTS_QUERY: { loc: { source: { body: 'query FetchGroupProjects' } } },
  FETCH_COMPREHENSIVE_GROUP_QUERY: { loc: { source: { body: 'query FetchGroup' } } },
  FETCH_COMPREHENSIVE_GROUPS_QUERY: { loc: { source: { body: 'query FetchGroups' } } },
  FETCH_COMPREHENSIVE_SUBGROUPS_QUERY: { loc: { source: { body: 'query FetchSubgroups' } } },
}));

jest.mock('./queries/userQueries', () => ({
  FETCH_COMPREHENSIVE_USERS_QUERY: { loc: { source: { body: 'query FetchUsers' } } },
}));

jest.mock('./gql', () => ({
  graphql: { name: 'graphql' },
}));

describe('GitLabGraphQLClient', () => {
  let client: GitLabGraphQLClient;
  const baseUrl = 'https://gitlab.example.com';
  const accessToken = 'test-token';

  beforeEach(() => {
    jest.clearAllMocks();
    client = new GitLabGraphQLClient(baseUrl, accessToken);
  });

  describe('constructor', () => {
    it('should create client with proper configuration', () => {
      expect(client).toBeInstanceOf(GitLabGraphQLClient);
    });

    it('should create client with OAuth2 options', () => {
      const clientWithOAuth = new GitLabGraphQLClient(baseUrl, accessToken, {
        refreshToken: 'refresh-token',
        oauth2: {
          clientId: 'client-id',
          clientSecret: 'client-secret',
        },
      });
      expect(clientWithOAuth).toBeInstanceOf(GitLabGraphQLClient);
    });
  });

  describe('query method', () => {
    it('should execute GraphQL query successfully', async () => {
      const mockResponse = { data: { projects: [] } };
      const mockJsonFn = jest.fn<() => Promise<any>>().mockResolvedValueOnce(mockResponse);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: mockJsonFn,
      } as unknown as Response);

      const query = { loc: { source: { body: 'query { projects { id name } }' } } };
      const variables = { first: 10 };

      const result = await client.query(query, variables);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gitlab.example.com/api/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
          body: JSON.stringify({ query: query.loc.source.body, variables }),
        })
      );
      expect(result).toEqual({ projects: [] });
    });

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        data: null,
        errors: [{ message: 'Field not found' }],
      };
      const mockJsonFn = jest.fn<() => Promise<any>>().mockResolvedValueOnce(mockResponse);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: mockJsonFn,
      } as unknown as Response);

      const query = { loc: { source: { body: 'query { invalidField }' } } };

      await expect(client.query(query)).rejects.toThrow('GraphQL query returned errors: Field not found');
    });

    it('should handle 401 errors', async () => {
      const mockTextFn = jest.fn<() => Promise<string>>().mockResolvedValueOnce('Unauthorized');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: mockTextFn,
      } as unknown as Response);

      const query = { loc: { source: { body: 'query { test }' } } };

      await expect(client.query(query)).rejects.toThrow('Authentication failed: Invalid or expired access token.');
    });

    it('should handle other HTTP errors', async () => {
      const mockTextFn = jest.fn<() => Promise<string>>().mockResolvedValueOnce('Internal Server Error');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: mockTextFn,
      } as unknown as Response);

      const query = { loc: { source: { body: 'query { test }' } } };

      await expect(client.query(query)).rejects.toThrow('GraphQL request failed: 500 - Internal Server Error');
    });
  });

  describe('fetchProjects', () => {
    it('should throw error as method is not supported', async () => {
      await expect(client.fetchProjects()).rejects.toThrow('fetchProjects is not supported - use fetchGroupProjects with a specific group ID');
    });
  });

  describe('fetchGroups', () => {
    it('should fetch groups successfully', async () => {
      const mockResponse = {
        data: {
          groups: {
            nodes: [
              { id: 'group-1', name: 'Test Group 1' },
              { id: 'group-2', name: 'Test Group 2' },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      };

      const mockJsonFn = jest.fn<() => Promise<any>>().mockResolvedValueOnce(mockResponse);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: mockJsonFn,
      } as unknown as Response);

      const result = await client.fetchGroups();

      expect(result.nodes).toHaveLength(2);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });
  });

  describe('fetchUsers', () => {
    it('should fetch users successfully', async () => {
      const mockResponse = {
        data: {
          users: {
            nodes: [
              { id: 'user-1', username: 'user1' },
              { id: 'user-2', username: 'user2' },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      };

      const mockJsonFn = jest.fn<() => Promise<any>>().mockResolvedValueOnce(mockResponse);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: mockJsonFn,
      } as unknown as Response);

      const result = await client.fetchUsers();

      expect(result.nodes).toHaveLength(2);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('should handle pagination', async () => {
      const mockResponse = {
        data: {
          users: {
            nodes: [{ id: 'user-1', username: 'user1' }],
            pageInfo: { hasNextPage: true, endCursor: 'cursor123' },
          },
        },
      };

      const mockJsonFn = jest.fn<() => Promise<any>>().mockResolvedValueOnce(mockResponse);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: mockJsonFn,
      } as unknown as Response);

      const result = await client.fetchUsers(50, 'cursor123');

      expect(result.nodes).toHaveLength(1);
      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.pageInfo.endCursor).toBe('cursor123');
    });
  });

  describe('fetchGroupProjects', () => {
    it('should fetch group projects successfully', async () => {
      const mockResponse = {
        data: {
          group: {
            projects: {
              nodes: [
                { id: 'project-1', name: 'Test Project 1' },
                { id: 'project-2', name: 'Test Project 2' },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      };

      const mockJsonFn = jest.fn<() => Promise<any>>().mockResolvedValueOnce(mockResponse);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: mockJsonFn,
      } as unknown as Response);

      const result = await client.fetchGroupProjects('group-123');

      expect(result.nodes).toHaveLength(2);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });
  });

  describe('fetchGroup', () => {
    it('should fetch single group successfully', async () => {
      const mockResponse = {
        data: {
          group: { id: 'group-1', name: 'Test Group' },
        },
      };

      const mockJsonFn = jest.fn<() => Promise<any>>().mockResolvedValueOnce(mockResponse);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: mockJsonFn,
      } as unknown as Response);

      const result = await client.fetchGroup('group-123');

      expect(result).toEqual({ id: 'group-1', name: 'Test Group' });
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      mockFetch.mockRejectedValueOnce(timeoutError);

      const query = { loc: { source: { body: 'query { test }' } } };
      await expect(client.query(query)).rejects.toThrow('Request timeout');
    });

    it('should handle fetch errors', async () => {
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(fetchError);

      const query = { loc: { source: { body: 'query { test }' } } };
      await expect(client.query(query)).rejects.toThrow('Network error');
    });
  });

  describe('fetchAllUsers', () => {
    it('should fetch all users with pagination', async () => {
      const firstResponse = {
        data: {
          users: {
            nodes: [{ id: 'user-1', username: 'user1' }],
            pageInfo: { hasNextPage: true, endCursor: 'cursor1' },
          },
        },
      };
      const secondResponse = {
        data: {
          users: {
            nodes: [{ id: 'user-2', username: 'user2' }],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      };

      const mockJsonFn1 = jest.fn<() => Promise<any>>().mockResolvedValueOnce(firstResponse);
      const mockJsonFn2 = jest.fn<() => Promise<any>>().mockResolvedValueOnce(secondResponse);
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: mockJsonFn1,
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: mockJsonFn2,
        } as unknown as Response);

      const result = await client.fetchAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0]?.username).toBe('user1');
      expect(result[1]?.username).toBe('user2');
    });
  });
});
