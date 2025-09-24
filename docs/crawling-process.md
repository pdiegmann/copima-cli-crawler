# Detailed Crawling Process

1. **Gather available areas** (only major information: IDs, paths, names)
   1. Gather all available groups (GraphQL: `groups`, `group`)
   2. Gather all available projects (GraphQL: `projects`, `project`)

2. **Gather all available users** (GraphQL: `users`, `user`)

3. **Iterate over all areas**
   1. **For groups and projects (common resources, GraphQL)**
      1. Members / user access: all users with access (via group/project membership) including access levels (`GroupMember`, `ProjectMember`).
      2. Hierarchical metadata: subgroups, nested groups, projects, IDs, paths, names, visibility, description, timestamps.
      3. Labels: group/project labels (`Label`) with title, description, color, etc.
      4. Milestones: group/project milestones (`Milestone`) with title, due date, state, etc.
      5. Issues: basic info (`Issue`): ID, IID, title, state, author, assignees, labels, createdAt, updatedAt.
      6. Merge Requests: basic info (`MergeRequest`): ID, IID, title, state, author, assignees, labels, createdAt, updatedAt.
      7. Epics / Work Items (group scope, if enabled): ID, IID, title, state, author, createdAt, updatedAt (`Epic`, `WorkItem`).
      8. Custom emoji in group contexts (`CustomEmoji`).
      9. Award / reactions on issues and merge requests (`AwardEmoji`).
      10. Pipeline metadata (`Pipeline`): status, duration, createdAt, finishedAt.

   2. **For groups (group-specific, GraphQL)**
      1. Epics / Work Items hierarchy: parent/child relationships, ancestors, descendants (`EpicConnection`, `WorkItemConnection`).
      2. Group-level boards: issue boards (`Board`) and board lists (`BoardList`).
      3. Group-level CI/CD configuration: group CI/CD variables (`CiVariable`).
      4. Audit events at group level (if available in your GitLab edition).
      5. Discussions / notes attached to epics or other group-level entities (`Discussion`, `Note`).

   3. **For projects (project-specific, GraphQL)**
      1. Project metadata: name, description, default branch, visibility, topics, tags, timestamps.
      2. Project-level labels and milestones (`Label`, `Milestone`).
      3. Project pipelines (`Pipeline`): status, ID, timestamps, duration.
      4. Project issues and merge requests (same as 3.1 but scoped to project).
      5. Project discussions / threads if exposed via GraphQL (`Discussion`, `Note`).
      6. Releases / tags metadata (`Release`): name, tagName, releasedAt.
      7. Container registry metadata (GraphQL: `ContainerRepository`), if enabled.
      8. Project snippets (`Snippet`), if applicable.

4. **REST-API specific resources** (REST v4 only)
   1. **For each project**
      1. Branches (`/projects/:id/repository/branches`): metadata, protection info.
      2. For each branch: commits and commit metadata (`/projects/:id/repository/commits`), including stats (lines added/removed).
         1. If applicable: notes/comments/discussions on commits (`/projects/:id/repository/commits/:sha/discussions`).

      3. Tags (`/projects/:id/repository/tags`): metadata.
         1. If applicable: notes/comments/discussions on tags (`/projects/:id/repository/tags/:tag/discussions`).

   2. **Global REST-only resources**
      1. Notes/comments/discussions not exposed in GraphQL (e.g., some commit or tag discussions).
      2. Repository contents: file trees, blobs, raw files.
      3. Detailed commit diffs and patch contents.
      4. Job logs, artifacts, dependency lists, license scans (if required).
