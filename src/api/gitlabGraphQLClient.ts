import logger from '../utils/logger';
import fetch from 'node-fetch';


export class GitLabGraphQLClient {
  private baseUrl: string;
  private accessToken: string;

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = `${baseUrl}/api/graphql`;
    this.accessToken = accessToken;
  }

  async query(query: string, variables: Record<string, any> = {}): Promise<any> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`GraphQL request failed: ${response.status} - ${errorText}`);
        throw new Error(`GraphQL request failed: ${response.status}`);
      }

      const result = await response.json();
      if (result.errors) {
        logger.error('GraphQL errors:', result.errors);
        throw new Error('GraphQL query returned errors');
      }

      return result.data;
    } catch (error) {
      logger.error('GraphQL query failed:', error);
      throw error;
    }
  }
  /**
   * Fetches all users from the GitLab GraphQL API.
   * @returns {Promise<any[]>} A promise that resolves to an array of users.
   */
  async fetchUsers(): Promise<any[]> {
    const query = `
      query {
        users {
          nodes {
            id
            username
            name
            publicEmail
            createdAt
          }
        }
      }
    `;

    try {
      const data = await this.query(query);
      return data.users.nodes;
    } catch (error) {
      logger.error('Failed to fetch users:', error);
      throw error;
    }
  }
}
