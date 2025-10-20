#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

type ChangelogUpdate = {
  version: string;
  date: string;
  changes?: string;
};

/**
 * Finds the position to insert the new changelog entry
 */
const findInsertPosition = (lines: string[]): number => {
  // Find the line with the first version entry (starts with "## [")
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("## [") && !lines[i].includes("Unreleased")) {
      return i;
    }
  }

  // No existing version found, insert after the header section
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      return i;
    }
  }

  // Still no position found, insert after the intro paragraph
  // Look for an empty line after some text
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "" && i > 0 && lines[i - 1].trim() !== "") {
      return i + 1;
    }
  }

  // Last resort: append to the end
  return lines.length;
};

/**
 * Adds version link to the bottom of the changelog
 */
const addVersionLink = (changelogPath: string, updatedChangelog: string, version: string): void => {
  const versionLink = `[${version}]: https://github.com/pdiegmann/copima-cli-crawler/releases/tag/v${version}`;
  if (updatedChangelog.includes(versionLink)) {
    writeFileSync(changelogPath, updatedChangelog);
    return;
  }

  // Find existing version links and add before them
  const linkPattern = /\[\d+\.\d+\.\d+\]:/;
  const linkLines = updatedChangelog.split("\n");
  let linkInsertIndex = -1;

  for (let i = 0; i < linkLines.length; i++) {
    if (linkPattern.test(linkLines[i])) {
      linkInsertIndex = i;
      break;
    }
  }

  if (linkInsertIndex !== -1) {
    linkLines.splice(linkInsertIndex, 0, versionLink);
    writeFileSync(changelogPath, linkLines.join("\n"));
  } else {
    // No existing links, append at the end
    writeFileSync(changelogPath, `${updatedChangelog}\n${versionLink}\n`);
  }
};

/**
 * Updates the CHANGELOG.md file with a new release entry
 * @param version - The version number (e.g., "0.2.0")
 * @param date - The release date in YYYY-MM-DD format
 * @param changes - Optional custom changes text. If not provided, generates a placeholder
 */
const updateChangelog = ({ version, date, changes }: ChangelogUpdate): void => {
  const changelogPath = resolve("./CHANGELOG.md");
  const changelog = readFileSync(changelogPath, "utf-8");

  // Check if this version already exists in the changelog
  const versionHeader = `## [${version}]`;
  if (changelog.includes(versionHeader)) {
    console.log(`ℹ️  Version ${version} already exists in CHANGELOG.md. Skipping update.`);
    return;
  }

  // Generate the new entry
  const newEntry = generateChangelogEntry(version, date, changes);

  // Find the position to insert the new entry
  const lines = changelog.split("\n");
  const insertIndex = findInsertPosition(lines);

  // Insert the new entry
  lines.splice(insertIndex, 0, newEntry, "");
  const updatedChangelog = lines.join("\n");

  // Add the version link at the bottom if not already present
  addVersionLink(changelogPath, updatedChangelog, version);

  console.log(`✅ Updated CHANGELOG.md with version ${version}`);
};

/**
 * Generates a changelog entry for a new version
 */
const generateChangelogEntry = (version: string, date: string, changes?: string): string => {
  if (changes) {
    return `## [${version}] - ${date}\n\n${changes}`;
  }

  // Default template when no specific changes are provided
  return `## [${version}] - ${date}

### Added

- New features and enhancements in this release

### Fixed

- Bug fixes and improvements

### Changed

- Updates to existing functionality`;
};

// Parse command line arguments
const args = process.argv.slice(2);
const version = args[0] || process.env.VERSION;
const date = args[1] || process.env.RELEASE_DATE || new Date().toISOString().split("T")[0];
const changes = args[2] || process.env.CHANGES;

if (!version) {
  console.error("❌ Error: Version is required");
  console.error("Usage: bun run scripts/update-changelog.ts <version> [date] [changes]");
  console.error("   or: VERSION=0.2.0 bun run scripts/update-changelog.ts");
  process.exit(1);
}

try {
  updateChangelog({ version, date, changes });
} catch (error) {
  console.error("❌ Failed to update changelog:", error);
  process.exit(1);
}
