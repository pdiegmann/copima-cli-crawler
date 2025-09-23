# Crawling Process

## Abstract Workflow

The resources to be crawled are organized into four major steps.
- Steps **1–3** are handled via **GraphQL** (preferred when available).
- Step **4** covers **REST-only resources**.
- The JSON schema mapping in the next (sub-)section ["API Schema Mapping"](#api-schema-mapping) gives the exact correspondence between steps and GitLab API resource types.

**Step 1 – Gather available areas**
- Groups (`groups`, `group`)
- Projects (`projects`, `project`)

**Step 2 – Gather all available users**
- Users (`users`, `user`)

**Step 3 – Iterate over all areas**
- Common resources for groups/projects (members, labels, issues, MRs, etc.)
- Group-specific resources (epic hierarchy, boards, audit events, etc.)
- Project-specific resources (metadata, pipelines, releases, snippets, etc.)

**Step 4 – REST-only resources**
- Repository-level details (branches, commits, tags, file blobs, etc.)
- Global REST-only data (artifacts, job logs, dependency lists, etc.)
- Specialized REST-only domains (security, compliance, package registries, etc.)