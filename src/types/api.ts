/**
 * Shared API response type definitions for GitLab REST and GraphQL APIs
 */

// Base types
export type GitLabId = string | number;
export type ISODateString = string;
export type VisibilityLevel = "private" | "internal" | "public";

// GitLab API Response Types
export type GitLabUser = {
  id: GitLabId;
  username: string;
  name: string;
  email?: string;
  publicEmail?: string;
  createdAt: ISODateString;
  updatedAt?: ISODateString;
  avatarUrl?: string;
  webUrl?: string;
};

export type GitLabGroup = {
  id: GitLabId;
  name: string;
  path: string;
  fullName?: string;
  fullPath: string;
  description?: string;
  visibility: VisibilityLevel;
  createdAt: ISODateString;
  updatedAt?: ISODateString;
  webUrl: string;
  avatarUrl?: string;
  parentId?: GitLabId;
  subgroupCreationLevel?: string;
  projectCreationLevel?: string;
  repositorySizeLimit?: number;
  lfsEnabled?: boolean;
  requestAccessEnabled?: boolean;
};

export type GitLabProject = {
  id: GitLabId;
};

export type GroupNode = {
  id: string;
  name: string;
  path: string;
  fullName: string;
  fullPath: string;
  description?: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  webUrl: string;
  avatarUrl?: string;
  parentId?: string;
  subgroupCreationLevel?: string;
  projectCreationLevel?: string;
};

export type PageInfo = {
  hasNextPage: boolean;
  endCursor?: string;
};

// Pagination and Response Wrappers
export type PaginationInfo = {
  hasNextPage: boolean;
  hasPreviousPage?: boolean;
  startCursor?: string;
  endCursor?: string;
};

export type GraphQLResponse<T> = {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: string[];
  }>;
};

export type PaginatedGraphQLResponse<T> = {
  nodes: T[];
  pageInfo: PaginationInfo;
};

export type RestResponse<T> = T;

// Repository and Git Types
export type GitLabBranch = {
  name: string;
  commit: {
    id: string;
    short_id: string;
    title: string;
    message: string;
    author_name: string;
    author_email: string;
    committer_name: string;
    committer_email: string;
    created_at: ISODateString;
  };
  protected: boolean;
  developers_can_push?: boolean;
  developers_can_merge?: boolean;
};

export type GitLabCommit = {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  committer_name: string;
  committer_email: string;
  created_at: ISODateString;
  parent_ids: string[];
  web_url: string;
};

export type GitLabTag = {
  name: string;
  message?: string;
  target: string;
  commit?: GitLabCommit;
  release?: {
    tag_name: string;
    description: string;
  };
  protected: boolean;
};

// Issue and MR Types
export type GitLabIssue = {
  id: GitLabId;
  iid: number;
  title: string;
  description?: string;
  state: "opened" | "closed";
  created_at: ISODateString;
  updated_at?: ISODateString;
  closed_at?: ISODateString;
  author: GitLabUser;
  assignees?: GitLabUser[];
  labels?: string[];
  milestone?: {
    id: GitLabId;
    title: string;
    description?: string;
    state: "active" | "closed";
    due_date?: string;
  };
  web_url: string;
};

export type GitLabMergeRequest = {
  id: GitLabId;
  iid: number;
  title: string;
  description?: string;
  state: "opened" | "closed" | "merged";
  created_at: ISODateString;
  updated_at?: ISODateString;
  merged_at?: ISODateString;
  closed_at?: ISODateString;
  author: GitLabUser;
  assignees?: GitLabUser[];
  reviewers?: GitLabUser[];
  source_branch: string;
  target_branch: string;
  merge_status: "can_be_merged" | "cannot_be_merged" | "checking";
  web_url: string;
};

// Generic API utility types
export type SafeRecord<T = unknown> = Record<string, T | string | undefined>;
export type ApiEndpoint = string;
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// Error types
export type ApiError = {
  message: string;
  status: number;
  code?: string;
  details?: SafeRecord;
};
