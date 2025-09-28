/* eslint-disable */
import * as types from "./graphql.js";
import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
  "query FetchGroup($fullPath: ID!) {\n  group(fullPath: $fullPath) {\n    id\n    name\n    path\n    fullName\n    fullPath\n    description\n    visibility\n    createdAt\n    updatedAt\n    webUrl\n    avatarUrl\n    parent {\n      id\n      fullPath\n    }\n    subgroupCreationLevel\n    projectCreationLevel\n    actualRepositorySizeLimit\n    lfsEnabled\n    requestAccessEnabled\n    rootStorageStatistics {\n      storageSize\n      repositorySize\n      lfsObjectsSize\n      buildArtifactsSize\n      packagesSize\n      snippetsSize\n      uploadsSize\n    }\n  }\n}": typeof types.FetchGroupDocument;
  "query FetchGroupProjects($fullPath: ID!, $first: Int, $after: String) {\n  group(fullPath: $fullPath) {\n    projects(first: $first, after: $after) {\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      nodes {\n        id\n        name\n        path\n        fullPath\n        description\n        visibility\n        createdAt\n        updatedAt\n        lastActivityAt\n        webUrl\n        avatarUrl\n        archived\n        forksCount\n        starCount\n        issuesEnabled\n        mergeRequestsEnabled\n        wikiEnabled\n        snippetsEnabled\n        containerRegistryEnabled\n        lfsEnabled\n        requestAccessEnabled\n        nameWithNamespace\n        topics\n      }\n    }\n  }\n}": typeof types.FetchGroupProjectsDocument;
  "query FetchGroups($first: Int, $after: String) {\n  groups(first: $first, after: $after) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    nodes {\n      id\n      name\n      path\n      fullName\n      fullPath\n      description\n      visibility\n      createdAt\n      updatedAt\n      webUrl\n      avatarUrl\n      parent {\n        id\n        fullPath\n      }\n      subgroupCreationLevel\n      projectCreationLevel\n    }\n  }\n}": typeof types.FetchGroupsDocument;
  "query FetchProject($fullPath: ID!) {\n  project(fullPath: $fullPath) {\n    id\n    name\n    path\n    fullPath\n    description\n    visibility\n    createdAt\n    updatedAt\n    lastActivityAt\n    webUrl\n    avatarUrl\n    archived\n    forksCount\n    starCount\n    issuesEnabled\n    mergeRequestsEnabled\n    wikiEnabled\n    snippetsEnabled\n    containerRegistryEnabled\n    lfsEnabled\n    requestAccessEnabled\n    nameWithNamespace\n    topics\n    repository {\n      exists\n      empty\n      rootRef\n    }\n    statistics {\n      commitCount\n      storageSize\n      repositorySize\n      lfsObjectsSize\n      buildArtifactsSize\n      packagesSize\n      snippetsSize\n      uploadsSize\n    }\n  }\n}": typeof types.FetchProjectDocument;
  "query FetchProjects($first: Int, $after: String) {\n  projects(first: $first, after: $after) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    nodes {\n      id\n      name\n      path\n      fullPath\n      description\n      visibility\n      createdAt\n      updatedAt\n      lastActivityAt\n      webUrl\n      avatarUrl\n      archived\n      forksCount\n      starCount\n      issuesEnabled\n      mergeRequestsEnabled\n      wikiEnabled\n      snippetsEnabled\n      containerRegistryEnabled\n      lfsEnabled\n      requestAccessEnabled\n      nameWithNamespace\n      topics\n    }\n  }\n}": typeof types.FetchProjectsDocument;
  "query FetchSubgroups($fullPath: ID!, $first: Int, $after: String) {\n  group(fullPath: $fullPath) {\n    descendantGroups(first: $first, after: $after) {\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      nodes {\n        id\n        name\n        path\n        fullName\n        fullPath\n        description\n        visibility\n        createdAt\n        updatedAt\n        webUrl\n        avatarUrl\n        parent {\n          id\n          fullPath\n        }\n        subgroupCreationLevel\n        projectCreationLevel\n      }\n    }\n  }\n}": typeof types.FetchSubgroupsDocument;
  "query FetchUsers {\n  users {\n    nodes {\n      id\n      username\n      name\n      publicEmail\n      createdAt\n    }\n  }\n}": typeof types.FetchUsersDocument;
};
const documents: Documents = {
  "query FetchGroup($fullPath: ID!) {\n  group(fullPath: $fullPath) {\n    id\n    name\n    path\n    fullName\n    fullPath\n    description\n    visibility\n    createdAt\n    updatedAt\n    webUrl\n    avatarUrl\n    parent {\n      id\n      fullPath\n    }\n    subgroupCreationLevel\n    projectCreationLevel\n    actualRepositorySizeLimit\n    lfsEnabled\n    requestAccessEnabled\n    rootStorageStatistics {\n      storageSize\n      repositorySize\n      lfsObjectsSize\n      buildArtifactsSize\n      packagesSize\n      snippetsSize\n      uploadsSize\n    }\n  }\n}":
    types.FetchGroupDocument,
  "query FetchGroupProjects($fullPath: ID!, $first: Int, $after: String) {\n  group(fullPath: $fullPath) {\n    projects(first: $first, after: $after) {\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      nodes {\n        id\n        name\n        path\n        fullPath\n        description\n        visibility\n        createdAt\n        updatedAt\n        lastActivityAt\n        webUrl\n        avatarUrl\n        archived\n        forksCount\n        starCount\n        issuesEnabled\n        mergeRequestsEnabled\n        wikiEnabled\n        snippetsEnabled\n        containerRegistryEnabled\n        lfsEnabled\n        requestAccessEnabled\n        nameWithNamespace\n        topics\n      }\n    }\n  }\n}":
    types.FetchGroupProjectsDocument,
  "query FetchGroups($first: Int, $after: String) {\n  groups(first: $first, after: $after) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    nodes {\n      id\n      name\n      path\n      fullName\n      fullPath\n      description\n      visibility\n      createdAt\n      updatedAt\n      webUrl\n      avatarUrl\n      parent {\n        id\n        fullPath\n      }\n      subgroupCreationLevel\n      projectCreationLevel\n    }\n  }\n}":
    types.FetchGroupsDocument,
  "query FetchProject($fullPath: ID!) {\n  project(fullPath: $fullPath) {\n    id\n    name\n    path\n    fullPath\n    description\n    visibility\n    createdAt\n    updatedAt\n    lastActivityAt\n    webUrl\n    avatarUrl\n    archived\n    forksCount\n    starCount\n    issuesEnabled\n    mergeRequestsEnabled\n    wikiEnabled\n    snippetsEnabled\n    containerRegistryEnabled\n    lfsEnabled\n    requestAccessEnabled\n    nameWithNamespace\n    topics\n    repository {\n      exists\n      empty\n      rootRef\n    }\n    statistics {\n      commitCount\n      storageSize\n      repositorySize\n      lfsObjectsSize\n      buildArtifactsSize\n      packagesSize\n      snippetsSize\n      uploadsSize\n    }\n  }\n}":
    types.FetchProjectDocument,
  "query FetchProjects($first: Int, $after: String) {\n  projects(first: $first, after: $after) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    nodes {\n      id\n      name\n      path\n      fullPath\n      description\n      visibility\n      createdAt\n      updatedAt\n      lastActivityAt\n      webUrl\n      avatarUrl\n      archived\n      forksCount\n      starCount\n      issuesEnabled\n      mergeRequestsEnabled\n      wikiEnabled\n      snippetsEnabled\n      containerRegistryEnabled\n      lfsEnabled\n      requestAccessEnabled\n      nameWithNamespace\n      topics\n    }\n  }\n}":
    types.FetchProjectsDocument,
  "query FetchSubgroups($fullPath: ID!, $first: Int, $after: String) {\n  group(fullPath: $fullPath) {\n    descendantGroups(first: $first, after: $after) {\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      nodes {\n        id\n        name\n        path\n        fullName\n        fullPath\n        description\n        visibility\n        createdAt\n        updatedAt\n        webUrl\n        avatarUrl\n        parent {\n          id\n          fullPath\n        }\n        subgroupCreationLevel\n        projectCreationLevel\n      }\n    }\n  }\n}":
    types.FetchSubgroupsDocument,
  "query FetchUsers {\n  users {\n    nodes {\n      id\n      username\n      name\n      publicEmail\n      createdAt\n    }\n  }\n}": types.FetchUsersDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "query FetchGroup($fullPath: ID!) {\n  group(fullPath: $fullPath) {\n    id\n    name\n    path\n    fullName\n    fullPath\n    description\n    visibility\n    createdAt\n    updatedAt\n    webUrl\n    avatarUrl\n    parent {\n      id\n      fullPath\n    }\n    subgroupCreationLevel\n    projectCreationLevel\n    actualRepositorySizeLimit\n    lfsEnabled\n    requestAccessEnabled\n    rootStorageStatistics {\n      storageSize\n      repositorySize\n      lfsObjectsSize\n      buildArtifactsSize\n      packagesSize\n      snippetsSize\n      uploadsSize\n    }\n  }\n}"
): (typeof documents)["query FetchGroup($fullPath: ID!) {\n  group(fullPath: $fullPath) {\n    id\n    name\n    path\n    fullName\n    fullPath\n    description\n    visibility\n    createdAt\n    updatedAt\n    webUrl\n    avatarUrl\n    parent {\n      id\n      fullPath\n    }\n    subgroupCreationLevel\n    projectCreationLevel\n    actualRepositorySizeLimit\n    lfsEnabled\n    requestAccessEnabled\n    rootStorageStatistics {\n      storageSize\n      repositorySize\n      lfsObjectsSize\n      buildArtifactsSize\n      packagesSize\n      snippetsSize\n      uploadsSize\n    }\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "query FetchGroupProjects($fullPath: ID!, $first: Int, $after: String) {\n  group(fullPath: $fullPath) {\n    projects(first: $first, after: $after) {\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      nodes {\n        id\n        name\n        path\n        fullPath\n        description\n        visibility\n        createdAt\n        updatedAt\n        lastActivityAt\n        webUrl\n        avatarUrl\n        archived\n        forksCount\n        starCount\n        issuesEnabled\n        mergeRequestsEnabled\n        wikiEnabled\n        snippetsEnabled\n        containerRegistryEnabled\n        lfsEnabled\n        requestAccessEnabled\n        nameWithNamespace\n        topics\n      }\n    }\n  }\n}"
): (typeof documents)["query FetchGroupProjects($fullPath: ID!, $first: Int, $after: String) {\n  group(fullPath: $fullPath) {\n    projects(first: $first, after: $after) {\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      nodes {\n        id\n        name\n        path\n        fullPath\n        description\n        visibility\n        createdAt\n        updatedAt\n        lastActivityAt\n        webUrl\n        avatarUrl\n        archived\n        forksCount\n        starCount\n        issuesEnabled\n        mergeRequestsEnabled\n        wikiEnabled\n        snippetsEnabled\n        containerRegistryEnabled\n        lfsEnabled\n        requestAccessEnabled\n        nameWithNamespace\n        topics\n      }\n    }\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "query FetchGroups($first: Int, $after: String) {\n  groups(first: $first, after: $after) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    nodes {\n      id\n      name\n      path\n      fullName\n      fullPath\n      description\n      visibility\n      createdAt\n      updatedAt\n      webUrl\n      avatarUrl\n      parent {\n        id\n        fullPath\n      }\n      subgroupCreationLevel\n      projectCreationLevel\n    }\n  }\n}"
): (typeof documents)["query FetchGroups($first: Int, $after: String) {\n  groups(first: $first, after: $after) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    nodes {\n      id\n      name\n      path\n      fullName\n      fullPath\n      description\n      visibility\n      createdAt\n      updatedAt\n      webUrl\n      avatarUrl\n      parent {\n        id\n        fullPath\n      }\n      subgroupCreationLevel\n      projectCreationLevel\n    }\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "query FetchProject($fullPath: ID!) {\n  project(fullPath: $fullPath) {\n    id\n    name\n    path\n    fullPath\n    description\n    visibility\n    createdAt\n    updatedAt\n    lastActivityAt\n    webUrl\n    avatarUrl\n    archived\n    forksCount\n    starCount\n    issuesEnabled\n    mergeRequestsEnabled\n    wikiEnabled\n    snippetsEnabled\n    containerRegistryEnabled\n    lfsEnabled\n    requestAccessEnabled\n    nameWithNamespace\n    topics\n    repository {\n      exists\n      empty\n      rootRef\n    }\n    statistics {\n      commitCount\n      storageSize\n      repositorySize\n      lfsObjectsSize\n      buildArtifactsSize\n      packagesSize\n      snippetsSize\n      uploadsSize\n    }\n  }\n}"
): (typeof documents)["query FetchProject($fullPath: ID!) {\n  project(fullPath: $fullPath) {\n    id\n    name\n    path\n    fullPath\n    description\n    visibility\n    createdAt\n    updatedAt\n    lastActivityAt\n    webUrl\n    avatarUrl\n    archived\n    forksCount\n    starCount\n    issuesEnabled\n    mergeRequestsEnabled\n    wikiEnabled\n    snippetsEnabled\n    containerRegistryEnabled\n    lfsEnabled\n    requestAccessEnabled\n    nameWithNamespace\n    topics\n    repository {\n      exists\n      empty\n      rootRef\n    }\n    statistics {\n      commitCount\n      storageSize\n      repositorySize\n      lfsObjectsSize\n      buildArtifactsSize\n      packagesSize\n      snippetsSize\n      uploadsSize\n    }\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "query FetchProjects($first: Int, $after: String) {\n  projects(first: $first, after: $after) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    nodes {\n      id\n      name\n      path\n      fullPath\n      description\n      visibility\n      createdAt\n      updatedAt\n      lastActivityAt\n      webUrl\n      avatarUrl\n      archived\n      forksCount\n      starCount\n      issuesEnabled\n      mergeRequestsEnabled\n      wikiEnabled\n      snippetsEnabled\n      containerRegistryEnabled\n      lfsEnabled\n      requestAccessEnabled\n      nameWithNamespace\n      topics\n    }\n  }\n}"
): (typeof documents)["query FetchProjects($first: Int, $after: String) {\n  projects(first: $first, after: $after) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    nodes {\n      id\n      name\n      path\n      fullPath\n      description\n      visibility\n      createdAt\n      updatedAt\n      lastActivityAt\n      webUrl\n      avatarUrl\n      archived\n      forksCount\n      starCount\n      issuesEnabled\n      mergeRequestsEnabled\n      wikiEnabled\n      snippetsEnabled\n      containerRegistryEnabled\n      lfsEnabled\n      requestAccessEnabled\n      nameWithNamespace\n      topics\n    }\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "query FetchSubgroups($fullPath: ID!, $first: Int, $after: String) {\n  group(fullPath: $fullPath) {\n    descendantGroups(first: $first, after: $after) {\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      nodes {\n        id\n        name\n        path\n        fullName\n        fullPath\n        description\n        visibility\n        createdAt\n        updatedAt\n        webUrl\n        avatarUrl\n        parent {\n          id\n          fullPath\n        }\n        subgroupCreationLevel\n        projectCreationLevel\n      }\n    }\n  }\n}"
): (typeof documents)["query FetchSubgroups($fullPath: ID!, $first: Int, $after: String) {\n  group(fullPath: $fullPath) {\n    descendantGroups(first: $first, after: $after) {\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n      nodes {\n        id\n        name\n        path\n        fullName\n        fullPath\n        description\n        visibility\n        createdAt\n        updatedAt\n        webUrl\n        avatarUrl\n        parent {\n          id\n          fullPath\n        }\n        subgroupCreationLevel\n        projectCreationLevel\n      }\n    }\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "query FetchUsers {\n  users {\n    nodes {\n      id\n      username\n      name\n      publicEmail\n      createdAt\n    }\n  }\n}"
): (typeof documents)["query FetchUsers {\n  users {\n    nodes {\n      id\n      username\n      name\n      publicEmail\n      createdAt\n    }\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
