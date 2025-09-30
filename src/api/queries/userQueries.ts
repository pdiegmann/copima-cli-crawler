import { graphql } from "../gql";

/**
 * Comprehensive User Query with all available fields and sub-resources
 * Based on GitLab GraphQL API schema validation - only valid fields included
 */
export const FETCH_COMPREHENSIVE_USERS_QUERY = graphql(`
  query FetchComprehensiveUsers($first: Int, $after: String) {
    users(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
        hasPreviousPage
        startCursor
      }
      nodes {
        # Basic User Information
        id
        username
        name
        publicEmail
        location
        webUrl
        avatarUrl
        state
        bio
        pronouns
        organization
        jobTitle
        linkedin
        twitter

        # Timestamps
        createdAt
        lastActivityOn

        # User Settings & Preferences
        commitEmail

        # User Status
        status {
          availability
          emoji
          message
          messageHtml
          clearStatusAt
        }

        # Namespace Information
        namespace {
          id
          name
          path
          fullName
          fullPath
          description
          visibility
          lfsEnabled
          requestAccessEnabled
          rootStorageStatistics {
            storageSize
            repositorySize
            lfsObjectsSize
            buildArtifactsSize
            packagesSize
            snippetsSize
            uploadsSize
            wikiSize
            containerRegistrySize
            dependencyProxySize
          }
        }

        # User Permissions
        userPermissions {
          createSnippet
        }

        # User Preferences
        gitpodEnabled
        preferencesGitpodPath

        # User Activity & Contributions
        assignedMergeRequests {
          count
        }
        authoredMergeRequests {
          count
        }

        # User's Snippets
        snippets {
          nodes {
            id
            title
            fileName
            description
            visibilityLevel
            createdAt
            updatedAt
          }
        }

        # User's Starred Projects
        starredProjects {
          nodes {
            id
            name
            path
            fullPath
            description
            visibility
            avatarUrl
            starCount
            forksCount
          }
        }

        # User's Groups
        groups {
          nodes {
            id
            name
            path
            fullName
            fullPath
            description
            visibility
            avatarUrl
          }
        }

        # User Callouts
        callouts {
          nodes {
            featureName
            dismissedAt
          }
        }

        # User's Todos
        todos {
          nodes {
            id
            action
            targetType
            createdAt
            state
            target {
              ... on Issue {
                id
                title
              }
              ... on MergeRequest {
                id
                title
              }
            }
          }
        }

        # User's Time Logs
        timelogs {
          nodes {
            id
            timeSpent
            spentAt
            summary
            issue {
              id
              title
            }
            mergeRequest {
              id
              title
            }
          }
        }
      }
    }
  }
`);

/**
 * Fetch Users by specific usernames with comprehensive data
 */
export const FETCH_USERS_BY_USERNAMES_QUERY = graphql(`
  query FetchUsersByUsernames($usernames: [String!]!, $first: Int, $after: String) {
    users(usernames: $usernames, first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
        hasPreviousPage
        startCursor
      }
      nodes {
        # Basic User Information
        id
        username
        name
        publicEmail
        location
        webUrl
        avatarUrl
        state
        bio
        pronouns
        organization
        jobTitle
        linkedin
        twitter

        # Timestamps
        createdAt
        lastActivityOn

        # User Settings & Preferences
        commitEmail

        # User Status
        status {
          availability
          emoji
          message
          messageHtml
          clearStatusAt
        }

        # Namespace Information
        namespace {
          id
          name
          path
          fullName
          fullPath
          description
          visibility
          lfsEnabled
          requestAccessEnabled
          rootStorageStatistics {
            storageSize
            repositorySize
            lfsObjectsSize
            buildArtifactsSize
            packagesSize
            snippetsSize
            uploadsSize
            wikiSize
            containerRegistrySize
            dependencyProxySize
          }
        }

        # User Permissions
        userPermissions {
          createSnippet
        }

        # User Preferences
        gitpodEnabled
        preferencesGitpodPath
      }
    }
  }
`);

/**
 * Fetch Administrator Users Only (requires admin privileges)
 */
export const FETCH_ADMIN_USERS_QUERY = graphql(`
  query FetchAdminUsers($first: Int, $after: String) {
    users(admins: true, first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
        hasPreviousPage
        startCursor
      }
      nodes {
        # Basic User Information
        id
        username
        name
        publicEmail
        location
        webUrl
        avatarUrl
        state
        bio
        pronouns
        organization
        jobTitle
        linkedin
        twitter

        # Timestamps
        createdAt
        lastActivityOn

        # User Settings & Preferences
        commitEmail

        # User Status
        status {
          availability
          emoji
          message
          messageHtml
          clearStatusAt
        }

        # User Permissions
        userPermissions {
          createSnippet
        }
      }
    }
  }
`);

/**
 * Fetch Single User by ID with comprehensive data
 */
export const FETCH_COMPREHENSIVE_USER_QUERY = graphql(`
  query FetchComprehensiveUser($id: UserID!) {
    user(id: $id) {
      # Basic User Information
      id
      username
      name
      publicEmail
      location
      webUrl
      avatarUrl
      state
      bio
      pronouns
      organization
      jobTitle
      linkedin
      twitter

      # Timestamps
      createdAt
      lastActivityOn

      # User Settings & Preferences
      commitEmail

      # User Status
      status {
        availability
        emoji
        message
        messageHtml
        clearStatusAt
      }

      # Namespace Information
      namespace {
        id
        name
        path
        fullName
        fullPath
        description
        visibility
        lfsEnabled
        requestAccessEnabled
        rootStorageStatistics {
          storageSize
          repositorySize
          lfsObjectsSize
          buildArtifactsSize
          packagesSize
          snippetsSize
          uploadsSize
          wikiSize
          containerRegistrySize
          dependencyProxySize
        }
      }

      # User Permissions
      userPermissions {
        createSnippet
      }

      # User Preferences
      gitpodEnabled
      preferencesGitpodPath

      # User Activity & Contributions
      assignedMergeRequests {
        count
      }
      authoredMergeRequests {
        count
      }

      # User's Snippets
      snippets {
        nodes {
          id
          title
          fileName
          description
          visibilityLevel
          createdAt
          updatedAt
          author {
            id
            username
            name
          }
        }
      }

      # User's Starred Projects
      starredProjects {
        nodes {
          id
          name
          path
          fullPath
          description
          visibility
          avatarUrl
          starCount
          forksCount
          lastActivityAt
        }
      }

      # User's Groups
      groups {
        nodes {
          id
          name
          path
          fullName
          fullPath
          description
          visibility
          avatarUrl
          projectCreationLevel
          subgroupCreationLevel
        }
      }

      # User Callouts
      callouts {
        nodes {
          featureName
          dismissedAt
        }
      }

      # User's Todos
      todos {
        nodes {
          id
          action
          targetType
          createdAt
          state
          target {
            ... on Issue {
              id
              title
            }
            ... on MergeRequest {
              id
              title
            }
          }
        }
      }

      # User's Time Logs
      timelogs {
        nodes {
          id
          timeSpent
          spentAt
          summary
          issue {
            id
            title
          }
          mergeRequest {
            id
            title
          }
        }
      }
    }
  }
`);
