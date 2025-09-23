# Crawling Process

## API Schema Mapping

The following JSON structure maps each crawling step to its corresponding
GraphQL types, fields, or REST endpoints.
This acts as the **canonical specification** for the implementation.

```json
{
  "steps": {
    "areas": {
      "graphql_types": ["Group", "Project"],
      "fields": ["id", "fullPath", "name", "visibility", "description", "createdAt", "updatedAt"],
      "notes": "Always available in GraphQL."
    },
    "users": {
      "graphql_types": ["User"],
      "fields": ["id", "username", "name", "publicEmail", "createdAt"],
      "notes": "Standard; some fields restricted by permissions."
    },
    "step_3_1_common_group_project": {
      "memberships": {
        "graphql_types": ["Group.members", "Project.members"],
        "fields": ["accessLevel", "user", "createdAt"],
        "notes": "Permissions required."
      },
      "labels": {
        "graphql_types": ["Label"],
        "fields": ["id", "title", "color", "description"],
        "notes": "Available in GraphQL."
      },
      "milestones": {
        "graphql_types": ["Milestone"],
        "fields": ["id", "title", "dueDate", "state", "createdAt"],
        "notes": "Available in GraphQL."
      },
      "issues": {
        "graphql_types": ["Issue"],
        "fields": ["id", "iid", "title", "state", "author", "assignees", "labels", "createdAt", "updatedAt"],
        "notes": "Available in GraphQL."
      },
      "merge_requests": {
        "graphql_types": ["MergeRequest"],
        "fields": ["id", "iid", "title", "state", "author", "assignees", "labels", "createdAt", "updatedAt", "headPipeline"],
        "notes": "Available; some CI-related fields limited."
      },
      "epics_work_items": {
        "graphql_types": ["Epic", "WorkItem"],
        "fields": ["id", "iid", "title", "state", "author", "createdAt", "updatedAt"],
        "notes": "Conditional: requires feature enabled."
      },
      "custom_emoji": {
        "graphql_types": ["CustomEmoji"],
        "fields": ["id", "name", "url"],
        "notes": "GraphQL support present."
      },
      "award_reactions": {
        "graphql_types": ["AwardEmoji"],
        "fields": ["id", "name", "user"],
        "notes": "GraphQL support present."
      },
      "pipeline_metadata": {
        "graphql_types": ["Pipeline"],
        "fields": ["id", "status", "ref", "createdAt", "finishedAt", "duration"],
        "notes": "Limited details; jobs/artifacts require REST."
      }
    },
    "step_3_2_group_specific": {
      "epic_hierarchy": {
        "graphql_types": ["Epic"],
        "fields": ["id", "title", "parent", "children"],
        "notes": "Conditional on feature flag."
      },
      "boards": {
        "graphql_types": ["Board", "BoardList"],
        "fields": ["id", "name", "lists"],
        "notes": "Available in GraphQL."
      },
      "ci_cd_variables": {
        "graphql_types": ["CiVariable"],
        "fields": ["key", "value", "environmentScope"],
        "notes": "Sensitive; permission-restricted."
      },
      "audit_events": {
        "graphql_types": ["AuditEvent"],
        "fields": ["id", "action", "author", "createdAt"],
        "notes": "Edition/feature-dependent."
      },
      "discussions_notes": {
        "graphql_types": ["Discussion", "Note"],
        "fields": ["id", "author", "body", "createdAt"],
        "notes": "Partially supported in GraphQL."
      }
    },
    "step_3_3_project_specific": {
      "releases_tags": {
        "graphql_types": ["Release", "Tag"],
        "fields": ["id", "name", "tagName", "releasedAt", "description"],
        "notes": "Releases supported; tags limited."
      },
      "container_registries": {
        "graphql_types": ["ContainerRepository"],
        "fields": ["id", "name", "path"],
        "notes": "Conditional; permissions required."
      },
      "snippets": {
        "graphql_types": ["Snippet"],
        "fields": ["id", "title", "author", "createdAt"],
        "notes": "Supported in GraphQL."
      }
    }
  },
  "rest_only": {
    "commits": {
      "endpoint": "/projects/:id/repository/commits",
      "fields": ["sha", "message", "parents", "stats", "diffs"],
      "notes": "Not in GraphQL."
    },
    "branches": {
      "endpoint": "/projects/:id/repository/branches",
      "fields": ["name", "merged", "protected", "commit"],
      "notes": "GraphQL limited; REST complete."
    },
    "tags": {
      "endpoint": "/projects/:id/repository/tags",
      "fields": ["name", "commit", "message"],
      "notes": "REST required for annotated tags."
    },
    "repository_tree": {
      "endpoint": "/projects/:id/repository/tree",
      "fields": ["path", "type", "size"],
      "notes": "GraphQL does not expose blobs or raw contents."
    },
    "file_blobs": {
      "endpoint": "/projects/:id/repository/blobs/:sha",
      "fields": ["content", "encoding"],
      "notes": "REST only."
    },
    "artifacts": {
      "endpoint": "/projects/:id/jobs/:job_id/artifacts",
      "fields": ["file", "logs"],
      "notes": "REST only."
    },
    "security_compliance_packages": {
      "endpoints": [
        "/projects/:id/vulnerabilities",
        "/projects/:id/dependencies",
        "/projects/:id/packages",
        "/projects/:id/compliance_frameworks"
      ],
      "notes": "REST only; GraphQL does not expose."
    }
  }
}
```