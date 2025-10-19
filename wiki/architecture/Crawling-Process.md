# Four-Step Crawling Process

The COPIMA CLI Crawler uses a systematic four-step process to extract all accessible data from a GitLab instance.

## Overview

The crawling process is divided into four sequential steps:

1. **Areas** - Discover all groups and projects (GraphQL)
2. **Users** - Collect all user information (GraphQL)
3. **Resources** - Extract issues, MRs, labels, and more (GraphQL)
4. **Repository** - Crawl commits, branches, and files (REST)

Each step builds on the previous one, creating a complete picture of the GitLab instance.

## Why Four Steps?

### Separation of Concerns

Each step has a focused responsibility:
- **Step 1** provides the inventory (what exists)
- **Step 2** provides the actors (who is involved)
- **Step 3** provides the content (development artifacts)
- **Step 4** provides the code (repository data)

### API Optimization

- **Steps 1-3** use GraphQL for efficient batch queries
- **Step 4** uses REST API for resources only available there

### Resume Capability

Steps are independently resumable:
- Failed step can be retried without re-running successful ones
- Different steps can be run on different schedules
- Selective crawling (e.g., only areas and users)

## Step 1: Areas (Groups & Projects)

**Purpose**: Discover the organizational structure of the GitLab instance.

### What Is Crawled

#### Groups
```graphql
query GetGroups {
  groups {
    nodes {
      id
      name
      fullPath
      path
      visibility
      description
      createdAt
      updatedAt
      parentId
      subgroups {
        nodes { id }
      }
    }
  }
}
```

**Captured Data**:
- Group ID (GitLab GID)
- Full path (e.g., `org/team/subteam`)
- Name and description
- Visibility (public, internal, private)
- Parent/child relationships
- Creation and update timestamps

#### Projects
```graphql
query GetProjects {
  projects {
    nodes {
      id
      name
      fullPath
      path
      visibility
      description
      namespace {
        id
        fullPath
      }
      createdAt
      updatedAt
      archived
      emptyRepo
      defaultBranch
    }
  }
}
```

**Captured Data**:
- Project ID (GitLab GID)
- Full path (e.g., `org/team/project`)
- Name and description
- Visibility level
- Parent group
- Repository state (empty, archived)
- Default branch name
- Timestamps

### Output Structure

```
output/
├── groups.jsonl          # All groups (flat list)
├── projects.jsonl        # All projects (flat list)
└── group1/
    ├── groups.jsonl      # This group's metadata
    └── subgroup1/
        ├── groups.jsonl  # Subgroup metadata
        └── project1/
            └── projects.jsonl  # Project metadata
```

### Why Areas First?

1. **Inventory** - Know what to crawl in later steps
2. **Hierarchy** - Establish folder structure for output
3. **Access** - Identify which resources are accessible
4. **Efficiency** - Small dataset, completes quickly

### Performance Notes

- **Fast**: Usually completes in seconds to minutes
- **Lightweight**: Only metadata, no large objects
- **Scalable**: Can handle thousands of groups/projects

## Step 2: Users

**Purpose**: Collect information about all users in the instance.

### What Is Crawled

```graphql
query GetUsers {
  users {
    nodes {
      id
      username
      name
      email
      publicEmail
      state
      webUrl
      avatarUrl
      bio
      location
      organization
      createdAt
      confirmed
      bot
    }
  }
}
```

**Captured Data**:
- User ID (GitLab GID)
- Username (login)
- Full name
- Email addresses
- Account state (active, blocked, banned)
- Profile information (bio, location, organization)
- Avatar URL
- Bot status
- Creation date

### Output Structure

```
output/
└── users.jsonl          # All users (global file)
```

Users are stored in a single global file, not in group/project folders.

### Why Users Second?

1. **References** - Later steps reference user IDs
2. **Global** - Users aren't scoped to groups/projects
3. **Deduplication** - Prevents storing same user multiple times in step 3

### Privacy Considerations

- Only **public** profile information is collected
- Email addresses may be hidden based on user privacy settings
- Respects GitLab's visibility and permission system

### Performance Notes

- **Fast**: Completes in minutes for most instances
- **Size**: ~1-2 KB per user
- **Scalable**: Can handle 100,000+ users

## Step 3: Resources

**Purpose**: Extract development artifacts and metadata for all groups and projects.

This is the most comprehensive step, collecting the bulk of GitLab data.

### 3.1: Common Resources (Groups & Projects)

#### Members
```graphql
query GetMembers($fullPath: ID!) {
  group(fullPath: $fullPath) {
    groupMembers {
      nodes {
        id
        accessLevel
        createdAt
        expiresAt
        user {
          id
          username
        }
      }
    }
  }
}
```

**Access Levels**:
- 10: Guest
- 20: Reporter
- 30: Developer
- 40: Maintainer
- 50: Owner

#### Labels
```graphql
labels {
  nodes {
    id
    title
    description
    color
    textColor
  }
}
```

#### Milestones
```graphql
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
```

#### Issues
```graphql
issues {
  nodes {
    id
    iid
    title
    description
    state
    author { id username }
    assignees { nodes { id username } }
    labels { nodes { id title } }
    milestone { id title }
    createdAt
    updatedAt
    closedAt
    dueDate
    webUrl
  }
}
```

#### Merge Requests
```graphql
mergeRequests {
  nodes {
    id
    iid
    title
    description
    state
    author { id username }
    assignees { nodes { id username } }
    reviewers { nodes { id username } }
    labels { nodes { id title } }
    sourceBranch
    targetBranch
    createdAt
    updatedAt
    mergedAt
    webUrl
    headPipeline { id status }
  }
}
```

#### Award Emoji / Reactions
```graphql
awardEmoji {
  nodes {
    name
    user { id username }
  }
}
```

### 3.2: Group-Specific Resources

#### Epics (Premium/Ultimate)
```graphql
epics {
  nodes {
    id
    iid
    title
    description
    state
    author { id username }
    parent { id iid }
    children { nodes { id iid } }
    createdAt
    updatedAt
    closedAt
  }
}
```

#### Boards
```graphql
boards {
  nodes {
    id
    name
    lists {
      nodes {
        id
        position
        label { id title }
      }
    }
  }
}
```

#### Audit Events (Premium/Ultimate)
```graphql
auditEvents {
  nodes {
    id
    action
    authorName
    entityPath
    createdAt
  }
}
```

### 3.3: Project-Specific Resources

#### Releases
```graphql
releases {
  nodes {
    id
    name
    tagName
    tagPath
    description
    releasedAt
    createdAt
    author { id username }
    milestones { nodes { id title } }
  }
}
```

#### Pipelines
```graphql
pipelines {
  nodes {
    id
    iid
    status
    ref
    sha
    source
    createdAt
    updatedAt
    finishedAt
    duration
    coverage
    user { id username }
  }
}
```

#### Snippets
```graphql
snippets {
  nodes {
    id
    title
    description
    visibility
    author { id username }
    createdAt
    updatedAt
  }
}
```

#### Container Repositories
```graphql
containerRepositories {
  nodes {
    id
    name
    path
    location
    createdAt
  }
}
```

### Output Structure

```
output/
├── users.jsonl
└── group1/
    ├── groups.jsonl
    ├── members.jsonl         # Group members
    ├── labels.jsonl          # Group labels
    ├── milestones.jsonl      # Group milestones
    ├── issues.jsonl          # Group issues
    ├── merge_requests.jsonl  # Group MRs
    ├── epics.jsonl           # Group epics
    ├── boards.jsonl          # Group boards
    └── project1/
        ├── projects.jsonl
        ├── members.jsonl         # Project members
        ├── labels.jsonl          # Project labels
        ├── issues.jsonl          # Project issues
        ├── merge_requests.jsonl  # Project MRs
        ├── pipelines.jsonl       # CI/CD pipelines
        ├── releases.jsonl        # Project releases
        └── snippets.jsonl        # Code snippets
```

### Why Resources Third?

1. **Dependencies** - Needs areas and users from steps 1-2
2. **Deduplication** - Uses user data to avoid duplicates
3. **Volume** - Largest dataset, benefits from established structure

### Performance Notes

- **Slow**: Can take hours for large instances
- **Large**: Gigabytes of data possible
- **Resumable**: Checkpoint after each group/project

## Step 4: Repository Data (REST)

**Purpose**: Extract repository-level data not available via GraphQL.

### What Is Crawled

#### Branches
```http
GET /api/v4/projects/:id/repository/branches
```

**Data**:
- Branch name
- Last commit SHA
- Protected status
- Merged status
- Default branch flag

#### Commits
```http
GET /api/v4/projects/:id/repository/commits
```

**Data**:
- Commit SHA
- Parent SHAs
- Author and committer
- Message (title + body)
- Timestamp
- Stats (additions, deletions, total)
- File diffs (optional)

#### Tags
```http
GET /api/v4/projects/:id/repository/tags
```

**Data**:
- Tag name
- Target commit
- Message (annotated tags)
- Release info
- Timestamp

#### Repository Tree
```http
GET /api/v4/projects/:id/repository/tree
```

**Data**:
- File/directory paths
- File types (blob, tree)
- File sizes
- File modes (permissions)

#### File Contents (Optional)
```http
GET /api/v4/projects/:id/repository/files/:path/raw
```

**Data**:
- Raw file content
- Binary or text
- Encoding info

### Output Structure

```
output/
└── group1/
    └── project1/
        ├── branches.jsonl      # All branches
        ├── tags.jsonl          # All tags
        ├── commits.jsonl       # Commit history
        ├── tree.jsonl          # File tree
        └── files/              # File contents (optional)
            ├── README.md
            └── src/
                └── main.js
```

### Why REST for Repository Data?

GraphQL has limited support for:
- Full commit history with diffs
- Repository file tree traversal
- Raw file contents
- Detailed branch/tag metadata

REST API provides complete access to these resources.

### Performance Notes

- **Very Slow**: Most time-consuming step
- **Huge**: Can generate gigabytes per project
- **Network-Bound**: Many small API calls
- **Optional**: Can be skipped if not needed

### Configuration Options

```yaml
repository:
  # Crawl branches
  branches: true
  
  # Crawl commits (expensive!)
  commits: true
  commitsDepth: 100  # Limit to recent commits
  
  # Crawl tags
  tags: true
  
  # Crawl file tree
  tree: true
  
  # Download file contents (very expensive!)
  files: false
  filesInclude:
    - "*.md"
    - "*.txt"
  filesExclude:
    - "*.bin"
    - "*.exe"
```

## Running Individual Steps

### Execute Single Step

```bash
# Step 1 only
copima-cli-crawler areas

# Step 2 only
copima-cli-crawler users

# Step 3 only
copima-cli-crawler resources

# Step 4 only
copima-cli-crawler repository
```

### Execute Multiple Steps

```bash
# Steps 1 and 2
copima-cli-crawler crawl --steps areas,users

# Steps 1, 2, and 3 (skip repository)
copima-cli-crawler crawl --steps areas,users,resources

# All steps (default)
copima-cli-crawler crawl
```

## Step Dependencies

```
Step 1 (Areas)
   ↓
   ├─► Step 2 (Users) ─────────┐
   │                            │
   └─► Step 3 (Resources) ◄─────┘
          ↓
          └─► Step 4 (Repository)
```

- **Step 2** requires Step 1 (needs project list)
- **Step 3** requires Steps 1 & 2 (needs areas and user references)
- **Step 4** requires Step 1 (needs project list)

## Best Practices

### For Small Instances (<100 projects)

```bash
# Run all steps
copima-cli-crawler crawl
```

### For Medium Instances (100-1000 projects)

```bash
# Run steps 1-3, skip repository
copima-cli-crawler crawl --steps areas,users,resources

# Run repository later if needed
copima-cli-crawler repository
```

### For Large Instances (1000+ projects)

```bash
# Run in stages over multiple days
copima-cli-crawler areas
copima-cli-crawler users
copima-cli-crawler resources --resume true

# Skip repository or limit scope
copima-cli-crawler repository --commits-depth 10
```

### For Incremental Updates

```bash
# Re-run specific steps
copima-cli-crawler crawl --steps resources --resume true

# Deduplication prevents duplicates
```

## Summary

| Step       | API     | Speed    | Size      | Required |
|------------|---------|----------|-----------|----------|
| Areas      | GraphQL | Fast     | KB-MB     | Yes      |
| Users      | GraphQL | Fast     | MB        | Yes      |
| Resources  | GraphQL | Slow     | MB-GB     | Yes      |
| Repository | REST    | Very Slow| GB-TB     | Optional |

The four-step process provides a structured, efficient, and resumable way to extract all data from a GitLab instance.

---

**Crawling Process Version**: 1.0.0  
**Last Updated**: 2025-10-19
