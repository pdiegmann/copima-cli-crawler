/**
 * CLI command definition for running end-to-end tests.
 */

import { buildCommand } from "@stricli/core";

/**
 * Test command for running end-to-end tests.
 */
export const testCommand = buildCommand({
  loader: async () => {
    const { testImpl } = await import("./impl.js");
    return testImpl;
  },
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Path to test configuration or test suite file",
          parse: String,
          optional: true,
        },
      ],
    },
    flags: {
      verbose: {
        kind: "boolean",
        brief: "Enable verbose logging",
        short: "v",
      },
      "dry-run": {
        kind: "boolean",
        brief: "Validate configuration only, don't execute crawler",
      },
      suite: {
        kind: "boolean",
        brief: "Run as test suite (multiple test configurations)",
      },
      "cli-path": {
        kind: "parsed",
        parse: String,
        brief: "Custom path to CLI executable",
        optional: true,
      },
      parallel: {
        kind: "boolean",
        brief: "Run tests in parallel (for test suites)",
      },
      "max-parallel": {
        kind: "parsed",
        parse: String,
        brief: "Maximum number of parallel tests",
        optional: true,
      },
      "stop-on-failure": {
        kind: "boolean",
        brief: "Stop execution on first test failure",
      },
      "report-format": {
        kind: "parsed",
        parse: String,
        brief: "Report format (json, yaml, html)",
        optional: true,
      },
      "generate-report": {
        kind: "boolean",
        brief: "Generate test report",
      },
      "force-cleanup": {
        kind: "boolean",
        brief: "Force cleanup even on success",
      },
      "list-examples": {
        kind: "boolean",
        brief: "List example test configurations",
      },
    },
  },
  docs: {
    brief: "Run end-to-end tests for GitLab crawler",
  },
});
