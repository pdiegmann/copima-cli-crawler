import { graphql } from "../gql";

// Import the comprehensive project query fragments
// Note: These will be used in the group project queries

// Comprehensive Group Query with all available fields and sub-resources
export const FETCH_COMPREHENSIVE_GROUP_QUERY = graphql(`
  query FetchComprehensiveGroup($fullPath: ID!) {
    group(fullPath: $fullPath) {
      id
      name
      path
      fullName
      fullPath
      description
      visibility
      createdAt
      updatedAt
      webUrl
      avatarUrl
      shareWithGroupLock
      requireTwoFactorAuthentication
      twoFactorGracePeriod
      autoDevopsEnabled
      emailsDisabled
      mentionsDisabled
      parent {
        id
        fullPath
        name
        path
        webUrl
      }
      subgroupCreationLevel
      projectCreationLevel
      actualRepositorySizeLimit
      lfsEnabled
      requestAccessEnabled
      complianceFrameworks {
        nodes {
          id
          name
          description
          color
          pipelineConfigurationFullPath
        }
      }
      customEmoji {
        nodes {
          id
          name
          url
        }
      }
      groupMembers {
        nodes {
          id
          accessLevel {
            integerValue
            stringValue
          }
          createdAt
          updatedAt
          expiresAt
          user {
            id
            username
            name
            publicEmail
            state
            webUrl
            avatarUrl
          }
        }
      }
      labels {
        nodes {
          id
          title
          description
          color
          textColor
        }
      }
      milestones {
        nodes {
          id
          title
          description
          state
          dueDate
          startDate
          createdAt
          updatedAt
        }
      }
      packages {
        nodes {
          id
          name
          version
          packageType
          createdAt
          updatedAt
        }
      }
      runners {
        nodes {
          id
          runnerType
          description
          contactedAt
          active
          status
          tagList
        }
      }
      timelogs {
        nodes {
          id
          timeSpent
          spentAt
          summary
          user {
            id
            username
            name
          }
        }
      }
      vulnerabilities {
        nodes {
          id
          title
          description
          state
          severity
          reportType
          detectedAt
          dismissedAt
          resolvedAt
          confirmedAt
        }
      }
      workItemTypes {
        nodes {
          id
          name
          iconName
        }
      }
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
      sharedRunnersSetting
      dependencyProxyManifests {
        nodes {
          id
          imageName
          digest
          createdAt
        }
      }
      dependencyProxyBlobs {
        nodes {
          fileName
          size
          createdAt
        }
      }
      dependencyProxySetting {
        enabled
      }
      ciVariables {
        nodes {
          id
          key
          value
          variableType
          protected
          masked
          raw
          environmentScope
        }
      }
    }
  }
`);

// Enhanced Groups listing query
export const FETCH_COMPREHENSIVE_GROUPS_QUERY = graphql(`
  query FetchComprehensiveGroups($first: Int, $after: String) {
    groups(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
        hasPreviousPage
        startCursor
      }
      nodes {
        id
        name
        path
        fullName
        fullPath
        description
        visibility
        createdAt
        updatedAt
        webUrl
        avatarUrl
        shareWithGroupLock
        requireTwoFactorAuthentication
        twoFactorGracePeriod
        autoDevopsEnabled
        emailsDisabled
        mentionsDisabled
        parent {
          id
          fullPath
          name
          path
          webUrl
        }
        subgroupCreationLevel
        projectCreationLevel
        actualRepositorySizeLimit
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
        sharedRunnersSetting
      }
    }
  }
`);

// Enhanced Subgroups query
export const FETCH_COMPREHENSIVE_SUBGROUPS_QUERY = graphql(`
  query FetchComprehensiveSubgroups($fullPath: ID!, $first: Int, $after: String) {
    group(fullPath: $fullPath) {
      descendantGroups(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
          hasPreviousPage
          startCursor
        }
        nodes {
          id
          name
          path
          fullName
          fullPath
          description
          visibility
          createdAt
          updatedAt
          webUrl
          avatarUrl
          shareWithGroupLock
          requireTwoFactorAuthentication
          twoFactorGracePeriod
          autoDevopsEnabled
          emailsDisabled
          mentionsDisabled
          parent {
            id
            fullPath
            name
            path
            webUrl
          }
          subgroupCreationLevel
          projectCreationLevel
          actualRepositorySizeLimit
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
          sharedRunnersSetting
        }
      }
    }
  }
`);

// Enhanced Group Projects query
export const FETCH_COMPREHENSIVE_GROUP_PROJECTS_QUERY = graphql(`
  query FetchComprehensiveGroupProjects($fullPath: ID!, $first: Int, $after: String) {
    group(fullPath: $fullPath) {
      projects(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
          hasPreviousPage
          startCursor
        }
        nodes {
          # Basic project information
          id
          name
          path
          fullPath
          nameWithNamespace
          description
          visibility
          createdAt
          updatedAt
          lastActivityAt
          webUrl
          avatarUrl

          # Project status and settings
          archived
          forksCount
          starCount

          # Feature enablement flags
          issuesEnabled
          mergeRequestsEnabled
          wikiEnabled
          snippetsEnabled
          containerRegistryEnabled
          lfsEnabled
          requestAccessEnabled
          publicJobs
          sharedRunnersEnabled

          # Repository and Git settings
          sshUrlToRepo
          httpUrlToRepo

          # Merge request settings
          onlyAllowMergeIfPipelineSucceeds
          onlyAllowMergeIfAllDiscussionsAreResolved
          removeSourceBranchAfterMerge
          printingMergeRequestLinkEnabled
          allowMergeOnSkippedPipeline

          # Service desk settings
          serviceDeskEnabled
          serviceDeskAddress

          # Topic and tagging
          topics
          tagList

          # Compliance frameworks
          complianceFrameworks {
            nodes {
              id
              name
              description
              color
              pipelineConfigurationFullPath
            }
          }

          # Project members with user data
          projectMembers {
            nodes {
              id
              accessLevel {
                integerValue
                stringValue
              }
              createdAt
              updatedAt
              expiresAt
              user {
                id
                username
                name
                publicEmail
                state
                webUrl
                avatarUrl
              }
            }
          }

          # Repository information
          repository {
            exists
            empty
            rootRef
            tree {
              lastCommit {
                id
                sha
                title
                message
                authorName
                authorEmail
                authoredDate
                committedDate
                webUrl
              }
            }
          }

          # Statistics
          statistics {
            commitCount
            storageSize
            repositorySize
            lfsObjectsSize
            buildArtifactsSize
            packagesSize
            snippetsSize
            uploadsSize
            wikiSize
          }

          # Autoclose referenced issues
          autocloseReferencedIssues
        }
      }
    }
  }
`);
