# Network Access Limitation Notice

## Environment Restrictions

This test was conducted in a GitHub Actions runner environment with **limited network access**. Specifically:

- **DNS Resolution**: External domains like `gitlab.com` cannot be resolved
- **External APIs**: Cannot access GitLab's public API endpoints
- **Test Mode**: Successfully validated using mock/test mode

## Verification Status

✅ **Code Changes Verified**:

- PAT authentication fix is correct
- Configuration loading fix is correct
- All unit tests for crawl implementation pass
- Mock mode executes successfully

❌ **Real API Testing**:

- Cannot be performed due to network restrictions
- Requires execution in an environment with internet access

## To Complete Real-World Testing

Run the following command from an environment with network access to gitlab.com:

```bash
bun run dev crawl \
  --host https://gitlab.com \
  --token "glpat-lwYp6P2o0joF-HW9T0V8v286MQp1OmZ1YTN2Cw.01.121pg36o7" \
  --output ./algomus-dezrann-crawl \
  --steps areas,users,resources,repository \
  --verbose true
```

Expected results:

1. Authentication succeeds with the PAT
2. Areas step crawls the `algomus.fr/dezrann/dezrann` project and related groups
3. Users step fetches all accessible users
4. Resources step fetches issues, MRs, labels, etc.
5. Repository step fetches commits, branches, tags, files
6. All data is stored in hierarchical JSONL format under `./algomus-dezrann-crawl/`

## Alternative Testing Approach

If you have access to a self-hosted GitLab instance that this environment can reach, you can test with:

```bash
bun run dev crawl \
  --host https://your-gitlab-instance.com \
  --token "your-pat-token" \
  --output ./test-crawl \
  --steps areas,users,resources,repository
```
