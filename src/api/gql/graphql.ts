/* eslint-disable */

export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type Incremental<T> = T | Promise<T>;

/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  Time: { input: any; output: any };
};

export type Query = {
  __typename?: 'Query';
  group?: Maybe<Group>;
  groups?: Maybe<GroupConnection>;
  project?: Maybe<Project>;
  projects?: Maybe<ProjectConnection>;
  users?: Maybe<UserConnection>;
};

export type Group = {
  __typename?: 'Group';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  path: Scalars['String']['output'];
  fullName?: Maybe<Scalars['String']['output']>;
  fullPath: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  visibility: Scalars['String']['output'];
  createdAt: Scalars['Time']['output'];
  updatedAt: Scalars['Time']['output'];
  webUrl: Scalars['String']['output'];
  avatarUrl?: Maybe<Scalars['String']['output']>;
  parent?: Maybe<Group>;
  projects?: Maybe<ProjectConnection>;
  descendantGroups?: Maybe<GroupConnection>;
  subgroupCreationLevel: Scalars['String']['output'];
  projectCreationLevel: Scalars['String']['output'];
  actualRepositorySizeLimit?: Maybe<Scalars['Int']['output']>;
  lfsEnabled: Scalars['Boolean']['output'];
  requestAccessEnabled: Scalars['Boolean']['output'];
  rootStorageStatistics?: Maybe<RootStorageStatistics>;
};

export type Project = {
  __typename?: 'Project';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  path: Scalars['String']['output'];
  fullPath: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  visibility: Scalars['String']['output'];
  createdAt: Scalars['Time']['output'];
  updatedAt: Scalars['Time']['output'];
  lastActivityAt?: Maybe<Scalars['Time']['output']>;
  webUrl: Scalars['String']['output'];
  avatarUrl?: Maybe<Scalars['String']['output']>;
  archived: Scalars['Boolean']['output'];
  forksCount: Scalars['Int']['output'];
  starCount: Scalars['Int']['output'];
  issuesEnabled: Scalars['Boolean']['output'];
  mergeRequestsEnabled: Scalars['Boolean']['output'];
  wikiEnabled: Scalars['Boolean']['output'];
  snippetsEnabled: Scalars['Boolean']['output'];
  containerRegistryEnabled: Scalars['Boolean']['output'];
  lfsEnabled: Scalars['Boolean']['output'];
  requestAccessEnabled: Scalars['Boolean']['output'];
  nameWithNamespace: Scalars['String']['output'];
  topics?: Maybe<Array<Scalars['String']['output']>>;
  repository?: Maybe<Repository>;
  statistics?: Maybe<ProjectStatistics>;
};

export type User = {
  __typename?: 'User';
  id: Scalars['ID']['output'];
  username: Scalars['String']['output'];
  name: Scalars['String']['output'];
  publicEmail?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['Time']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  hasNextPage: Scalars['Boolean']['output'];
  endCursor?: Maybe<Scalars['String']['output']>;
};

export type GroupConnection = {
  __typename?: 'GroupConnection';
  nodes?: Maybe<Array<Maybe<Group>>>;
  pageInfo: PageInfo;
};

export type ProjectConnection = {
  __typename?: 'ProjectConnection';
  nodes?: Maybe<Array<Maybe<Project>>>;
  pageInfo: PageInfo;
};

export type UserConnection = {
  __typename?: 'UserConnection';
  nodes?: Maybe<Array<Maybe<User>>>;
  pageInfo: PageInfo;
};

export type Repository = {
  __typename?: 'Repository';
  exists: Scalars['Boolean']['output'];
  empty: Scalars['Boolean']['output'];
  rootRef?: Maybe<Scalars['String']['output']>;
};

export type ProjectStatistics = {
  __typename?: 'ProjectStatistics';
  commitCount: Scalars['Int']['output'];
  storageSize: Scalars['Int']['output'];
  repositorySize: Scalars['Int']['output'];
  lfsObjectsSize: Scalars['Int']['output'];
  buildArtifactsSize: Scalars['Int']['output'];
  packagesSize: Scalars['Int']['output'];
  snippetsSize: Scalars['Int']['output'];
  uploadsSize: Scalars['Int']['output'];
};

export type RootStorageStatistics = {
  __typename?: 'RootStorageStatistics';
  storageSize: Scalars['Int']['output'];
  repositorySize: Scalars['Int']['output'];
  lfsObjectsSize: Scalars['Int']['output'];
  buildArtifactsSize: Scalars['Int']['output'];
  packagesSize: Scalars['Int']['output'];
  snippetsSize: Scalars['Int']['output'];
  uploadsSize: Scalars['Int']['output'];
};

// Query Types
export type FetchGroupQuery = {
  __typename?: 'Query';
  group?: Maybe<Group>;
};

export type FetchGroupsQuery = {
  __typename?: 'Query';
  groups?: Maybe<GroupConnection>;
};

export type FetchProjectQuery = {
  __typename?: 'Query';
  project?: Maybe<Project>;
};

export type FetchProjectsQuery = {
  __typename?: 'Query';
  projects?: Maybe<ProjectConnection>;
};

export type FetchGroupProjectsQuery = {
  __typename?: 'Query';
  group?: Maybe<{
    __typename?: 'Group';
    projects?: Maybe<ProjectConnection>;
  }>;
};

export type FetchSubgroupsQuery = {
  __typename?: 'Query';
  group?: Maybe<{
    __typename?: 'Group';
    descendantGroups?: Maybe<GroupConnection>;
  }>;
};

export type FetchUsersQuery = {
  __typename?: 'Query';
  users?: Maybe<UserConnection>;
};

// Document Types
export const FetchGroupDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "FetchGroup" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "fullPath" } },
          type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "ID" } } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "group" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "fullPath" },
                value: { kind: "Variable", name: { kind: "Name", value: "fullPath" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "path" } },
                { kind: "Field", name: { kind: "Name", value: "fullName" } },
                { kind: "Field", name: { kind: "Name", value: "fullPath" } },
                { kind: "Field", name: { kind: "Name", value: "description" } },
                { kind: "Field", name: { kind: "Name", value: "visibility" } },
                { kind: "Field", name: { kind: "Name", value: "createdAt" } },
                { kind: "Field", name: { kind: "Name", value: "updatedAt" } },
                { kind: "Field", name: { kind: "Name", value: "webUrl" } },
                { kind: "Field", name: { kind: "Name", value: "avatarUrl" } },
              ],
            },
          },
        ],
      },
    },
  ],
  loc: { source: { body: 'query FetchGroup($fullPath: ID!) { group(fullPath: $fullPath) { id name path fullName fullPath description visibility createdAt updatedAt webUrl avatarUrl } }' } }
} as const;

export const FetchGroupsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "FetchGroups" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "first" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "after" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "groups" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "first" },
                value: { kind: "Variable", name: { kind: "Name", value: "first" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "after" },
                value: { kind: "Variable", name: { kind: "Name", value: "after" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "pageInfo" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "hasNextPage" } },
                      { kind: "Field", name: { kind: "Name", value: "endCursor" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "nodes" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      { kind: "Field", name: { kind: "Name", value: "path" } },
                      { kind: "Field", name: { kind: "Name", value: "fullName" } },
                      { kind: "Field", name: { kind: "Name", value: "fullPath" } },
                      { kind: "Field", name: { kind: "Name", value: "description" } },
                      { kind: "Field", name: { kind: "Name", value: "visibility" } },
                      { kind: "Field", name: { kind: "Name", value: "createdAt" } },
                      { kind: "Field", name: { kind: "Name", value: "updatedAt" } },
                      { kind: "Field", name: { kind: "Name", value: "webUrl" } },
                      { kind: "Field", name: { kind: "Name", value: "avatarUrl" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
  loc: { source: { body: 'query FetchGroups($first: Int, $after: String) { groups(first: $first, after: $after) { pageInfo { hasNextPage endCursor } nodes { id name path fullName fullPath description visibility createdAt updatedAt webUrl avatarUrl } } }' } }
} as const;

export const FetchProjectDocument = {
  kind: "Document",
  definitions: [],
  loc: { source: { body: 'query FetchProject($fullPath: ID!) { project(fullPath: $fullPath) { id name path fullPath description visibility createdAt updatedAt lastActivityAt webUrl avatarUrl archived forksCount starCount issuesEnabled mergeRequestsEnabled wikiEnabled snippetsEnabled containerRegistryEnabled lfsEnabled requestAccessEnabled nameWithNamespace topics } }' } }
} as const;

export const FetchProjectsDocument = {
  kind: "Document",
  definitions: [],
  loc: { source: { body: 'query FetchProjects($first: Int, $after: String) { projects(first: $first, after: $after) { pageInfo { hasNextPage endCursor } nodes { id name path fullPath description visibility createdAt updatedAt lastActivityAt webUrl avatarUrl archived forksCount starCount issuesEnabled mergeRequestsEnabled wikiEnabled snippetsEnabled containerRegistryEnabled lfsEnabled requestAccessEnabled nameWithNamespace topics } } }' } }
} as const;

export const FetchGroupProjectsDocument = {
  kind: "Document",
  definitions: [],
  loc: { source: { body: 'query FetchGroupProjects($fullPath: ID!, $first: Int, $after: String) { group(fullPath: $fullPath) { projects(first: $first, after: $after) { pageInfo { hasNextPage endCursor } nodes { id name path fullPath description visibility createdAt updatedAt lastActivityAt webUrl avatarUrl archived forksCount starCount issuesEnabled mergeRequestsEnabled wikiEnabled snippetsEnabled containerRegistryEnabled lfsEnabled requestAccessEnabled nameWithNamespace topics } } } }' } }
} as const;

export const FetchSubgroupsDocument = {
  kind: "Document",
  definitions: [],
  loc: { source: { body: 'query FetchSubgroups($fullPath: ID!, $first: Int, $after: String) { group(fullPath: $fullPath) { descendantGroups(first: $first, after: $after) { pageInfo { hasNextPage endCursor } nodes { id name path fullName fullPath description visibility createdAt updatedAt webUrl avatarUrl } } } }' } }
} as const;

export const FetchUsersDocument = {
  kind: "Document",
  definitions: [],
  loc: { source: { body: 'query FetchUsers { users { nodes { id username name publicEmail createdAt } } }' } }
} as const;
