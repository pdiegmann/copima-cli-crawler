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
          fullName
          nameWithNamespace
          pathWithNamespace
          description
          defaultBranch
          visibility
          createdAt
          updatedAt
          lastActivityAt
          webUrl
          readmeUrl
          avatarUrl

          # Project status and settings
          archived
          emptyRepo

          # Counts and statistics
          forksCount
          starCount
          openIssuesCount

          # Feature enablement flags
          issuesEnabled
          mergeRequestsEnabled
          wikiEnabled
          snippetsEnabled
          containerRegistryEnabled
          packagesEnabled
          lfsEnabled
          requestAccessEnabled
          publicJobs
          sharedRunnersEnabled
          groupRunnersEnabled

          # Access level settings
          issuesAccessLevel
          repositoryAccessLevel
          mergeRequestsAccessLevel
          forksAccessLevel
          wikiAccessLevel
          snippetsAccessLevel
          pagesAccessLevel
          analyticsAccessLevel
          requirementsAccessLevel
          securityAndComplianceAccessLevel
          operationsAccessLevel
          featuresAccessLevel
          infrastructureAccessLevel
          monitorAccessLevel
          environmentsAccessLevel
          releasesAccessLevel
          modelExperimentsAccessLevel
          packageRegistryAccessLevel

          # Repository and Git settings
          sshUrlToRepo
          httpUrlToRepo

          # CI/CD settings
          ciConfigPath
          ciDefaultGitDepth
          ciForwardDeploymentEnabled
          ciJobTokenScopeEnabled
          ciSeparateCaches
          buildGitStrategy
          buildTimeout
          autoCancelPendingPipelines
          keepLatestArtifact

          # Merge request settings
          onlyAllowMergeIfPipelineSucceeds
          onlyAllowMergeIfAllDiscussionsAreResolved
          removeSourceBranchAfterMerge
          printingMergeRequestLinkEnabled
          allowMergeOnSkippedPipeline
          squashOption
          mergeMethod
          suggestionCommitMessage
          mergeRequestsAuthorApproval
          mergeRequestsDisableCommittersApproval
          resolveOutdatedDiffDiscussions

          # Auto DevOps settings
          autoDevopsEnabled
          autoDevopsDeployStrategy

          # Service desk settings
          serviceDeskEnabled
          serviceDeskAddress

          # Pages settings
          pagesUrl

          # Topic and tagging
          topics
          tagList

          # Import/Export information
          importUrl
          importStatus
          importError

          # External authorization
          externalAuthorizationClassificationLabel

          # Container registry settings
          containerRegistryImagePrefix
          containerRegistryTokenExpireDelay
          containerExpirationPolicy {
            cadence
            keepN
            olderThan
            nameRegex
            nameRegexKeep
            enabled
            nextRunAt
          }

          # Group and namespace
          group {
            id
            name
            path
            fullPath
            webUrl
          }
          namespace {
            id
            name
            path
            fullPath
            kind
          }

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

          # Project members with comprehensive user data
          projectMembers(first: 50) {
            pageInfo {
              hasNextPage
              endCursor
            }
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
                bio
                location
                workInformation
                localTime
                lastActivityOn
                createdAt
              }
            }
          }

          # Repository information
          repository {
            exists
            empty
            rootRef
            diskPath
            tree {
              lastCommit {
                id
                sha
                shortId
                title
                fullTitle
                message
                authorName
                authorEmail
                authorGravatar
                committerName
                committerEmail
                authoredDate
                committedDate
                createdAt
                webUrl
              }
            }
          }

          # Comprehensive statistics
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
            containerRegistrySize
          }

          # Labels (limited sample)
          labels(first: 20) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              title
              description
              color
              textColor
              createdAt
              updatedAt
            }
          }

          # Milestones (limited sample)
          milestones(first: 20) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              title
              description
              state
              dueDate
              startDate
              createdAt
              updatedAt
              webUrl
              expired
              upcoming
            }
          }

          # Issues (limited sample for performance)
          issues(first: 10, sort: UPDATED_DESC) {
            pageInfo {
              hasNextPage
              endCursor
            }
            count
            nodes {
              id
              iid
              title
              state
              createdAt
              updatedAt
              author {
                id
                username
                name
              }
              assignees {
                nodes {
                  id
                  username
                  name
                }
              }
            }
          }

          # Merge Requests (limited sample for performance)
          mergeRequests(first: 10, sort: UPDATED_DESC) {
            pageInfo {
              hasNextPage
              endCursor
            }
            count
            nodes {
              id
              iid
              title
              state
              createdAt
              updatedAt
              sourceBranch
              targetBranch
              author {
                id
                username
                name
              }
              assignees {
                nodes {
                  id
                  username
                  name
                }
              }
            }
          }

          # Environments (limited sample)
          environments(first: 10) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              name
              slug
              state
              externalUrl
              environmentType
              createdAt
              updatedAt
            }
          }

          # Releases (limited sample)
          releases(first: 5, sort: RELEASED_AT_DESC) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              name
              tagName
              description
              releasedAt
              createdAt
              author {
                id
                username
                name
              }
            }
          }

          # CI/CD Variables
          ciVariables {
            nodes {
              id
              key
              variableType
              protected
              masked
              environmentScope
            }
          }

          # Runners (limited sample)
          runners(first: 10) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              runnerType
              description
              active
              status
              tagList
            }
          }

          # Push Rules
          pushRule {
            id
            rejectUnsignedCommits
            commitCommitterCheck
            denyDeleteTag
            memberCheck
            preventSecrets
          }

          # Wiki information
          wiki {
            webUrl
          }

          # Error tracking settings
          errorTrackingEnabled

          # Requirements (if enabled)
          requirementsEnabled

          # Security and compliance
          securityDashboardPath

          # Mirror settings
          mirror
          mirrorTriggerBuilds

          # License information
          licenseUrl
          licenseName

          # Merge trains
          mergeTrainsEnabled

          # Autoclose referenced issues
          autocloseReferencedIssues
        }
      }
    }
  }
`);
