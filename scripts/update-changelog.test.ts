import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

describe("update-changelog script", () => {
  const testDir = resolve("/tmp/changelog-test");
  const testChangelogPath = resolve(testDir, "CHANGELOG.md");
  const scriptPath = resolve(__dirname, "update-changelog.ts");

  const originalChangelog = `# Changelog

All notable changes to the Copima CLI Crawler project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-10-19

### Added

- Initial release features

[0.2.0]: https://github.com/pdiegmann/copima-cli-crawler/releases/tag/v0.2.0
`;

  beforeEach(() => {
    // Create test directory and changelog
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    writeFileSync(testChangelogPath, originalChangelog);
  });

  afterEach(() => {
    // Cleanup test files
    if (existsSync(testChangelogPath)) {
      unlinkSync(testChangelogPath);
    }
  });

  it("should add a new version entry to the changelog", () => {
    // Run the script
    execSync(`cd ${testDir} && bun run ${scriptPath} "0.3.0" "2025-10-20"`, {
      stdio: "pipe",
    });

    // Read the updated changelog
    const updatedChangelog = readFileSync(testChangelogPath, "utf-8");

    // Verify the new entry was added
    expect(updatedChangelog).toContain("## [0.3.0] - 2025-10-20");
    expect(updatedChangelog).toContain("### Added");
    expect(updatedChangelog).toContain("### Fixed");
    expect(updatedChangelog).toContain("### Changed");

    // Verify the link was added
    expect(updatedChangelog).toContain("[0.3.0]: https://github.com/pdiegmann/copima-cli-crawler/releases/tag/v0.3.0");

    // Verify the original content is still present
    expect(updatedChangelog).toContain("## [0.2.0] - 2025-10-19");

    // Verify the new entry appears before the old one
    const newEntryIndex = updatedChangelog.indexOf("## [0.3.0]");
    const oldEntryIndex = updatedChangelog.indexOf("## [0.2.0]");
    expect(newEntryIndex).toBeLessThan(oldEntryIndex);
  });

  it("should add a new version with custom changes", () => {
    const customChanges = "### Custom\n\n- Custom change 1\n- Custom change 2";

    // Run the script with custom changes
    execSync(`cd ${testDir} && bun run ${scriptPath} "0.3.0" "2025-10-20" "${customChanges}"`, { stdio: "pipe" });

    // Read the updated changelog
    const updatedChangelog = readFileSync(testChangelogPath, "utf-8");

    // Verify the custom changes were added
    expect(updatedChangelog).toContain("## [0.3.0] - 2025-10-20");
    expect(updatedChangelog).toContain("### Custom");
    expect(updatedChangelog).toContain("- Custom change 1");
    expect(updatedChangelog).toContain("- Custom change 2");
  });

  it("should not add duplicate entries for the same version", () => {
    // Run the script twice with the same version
    execSync(`cd ${testDir} && bun run ${scriptPath} "0.3.0" "2025-10-20"`, {
      stdio: "pipe",
    });

    const firstUpdate = readFileSync(testChangelogPath, "utf-8");

    execSync(`cd ${testDir} && bun run ${scriptPath} "0.3.0" "2025-10-20"`, {
      stdio: "pipe",
    });

    const secondUpdate = readFileSync(testChangelogPath, "utf-8");

    // Verify the changelog hasn't changed after the second run
    expect(secondUpdate).toBe(firstUpdate);

    // Verify there's only one occurrence of the version
    const matches = secondUpdate.match(/## \[0\.3\.0\]/g);
    expect(matches).toHaveLength(1);
  });

  it("should handle versions without a changelog gracefully", () => {
    // Create a minimal changelog without any versions
    const minimalChangelog = `# Changelog

All notable changes will be documented in this file.
`;
    writeFileSync(testChangelogPath, minimalChangelog);

    // Run the script
    execSync(`cd ${testDir} && bun run ${scriptPath} "0.1.0" "2025-10-20"`, {
      stdio: "pipe",
    });

    // Read the updated changelog
    const updatedChangelog = readFileSync(testChangelogPath, "utf-8");

    // Verify the new entry was added
    expect(updatedChangelog).toContain("## [0.1.0] - 2025-10-20");
  });
});
