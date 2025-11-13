#!/usr/bin/env bun

import { execSync } from "child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { resolve } from "path";
import { buildExecutables } from "../build.config";

type BumpType = "major" | "minor" | "patch";

type Version = {
  major: number;
  minor: number;
  patch: number;
};

const parseVersion = (version: string): Version => {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
};

const formatVersion = (version: Version): string => {
  return `${version.major}.${version.minor}.${version.patch}`;
};

const bumpVersion = (version: Version, type: BumpType): Version => {
  switch (type) {
    case "major":
      return { major: version.major + 1, minor: 0, patch: 0 };
    case "minor":
      return { major: version.major, minor: version.minor + 1, patch: 0 };
    case "patch":
      return { major: version.major, minor: version.minor, patch: version.patch + 1 };
  }
};

const isVersionAvailableOnNpm = async (packageName: string, version: string): Promise<boolean> => {
  try {
    /* eslint-disable sonarjs/os-command */
    const result = execSync(`npm view ${packageName}@${version} version 2>/dev/null`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    /* eslint-enable sonarjs/os-command */
    // If npm view succeeds and returns the version, it exists
    return result.trim() === "";
  } catch {
    // Version doesn't exist on npm (npm view failed)
    return true;
  }
};

const isVersionAvailableInGit = (version: string): boolean => {
  try {
    /* eslint-disable sonarjs/os-command */
    execSync(`git rev-parse v${version}`, { stdio: "ignore" });
    /* eslint-enable sonarjs/os-command */
    // Tag exists
    return false;
  } catch {
    // Tag doesn't exist
    return true;
  }
};

const findAvailableVersion = async (packageName: string, baseVersion: Version): Promise<Version> => {
  const candidateVersion = { ...baseVersion };
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const versionString = formatVersion(candidateVersion);
    console.log(`🔍 Checking availability of version ${versionString}...`);

    const npmAvailable = await isVersionAvailableOnNpm(packageName, versionString);
    const gitAvailable = isVersionAvailableInGit(versionString);

    if (npmAvailable && gitAvailable) {
      console.log(`✅ Version ${versionString} is available!`);
      return candidateVersion;
    }

    if (!npmAvailable) {
      console.log(`⚠️  Version ${versionString} exists on npm`);
    }
    if (!gitAvailable) {
      console.log(`⚠️  Tag v${versionString} exists in git`);
    }

    // Increment patch version and try again
    candidateVersion.patch++;
    attempts++;
  }

  throw new Error(`Could not find available version after ${maxAttempts} attempts`);
};

const updatePackageJson = (newVersion: string): void => {
  const packageJsonPath = resolve("./package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  packageJson.version = newVersion;
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf-8");
  console.log(`✅ Updated package.json to version ${newVersion}`);
};

const createRelease = async (): Promise<void> => {
  console.log("🚀 Starting release process...\n");

  // Parse command-line arguments
  const args = process.argv.slice(2);
  const bumpType = args[0] as BumpType | undefined;

  // Validate bump type if provided
  if (bumpType && !["major", "minor", "patch"].includes(bumpType)) {
    console.error(`❌ Invalid bump type: ${bumpType}`);
    console.error("Usage: bun run release [major|minor|patch]");
    process.exit(1);
  }

  // Get current version from package.json
  const packageJsonPath = resolve("./package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  const currentVersion = packageJson.version;
  const packageName = packageJson.name;

  console.log(`📦 Package: ${packageName}`);
  console.log(`📌 Current version: ${currentVersion}\n`);

  let newVersion: string;
  const parsedVersion = parseVersion(currentVersion);

  if (bumpType) {
    console.log(`🔼 Bumping ${bumpType} version...\n`);
    const bumpedVersion = bumpVersion(parsedVersion, bumpType);
    const availableVersion = await findAvailableVersion(packageName, bumpedVersion);
    newVersion = formatVersion(availableVersion);

    if (newVersion !== formatVersion(bumpedVersion)) {
      console.log(`\n⚠️  Originally planned version ${formatVersion(bumpedVersion)} was taken, using ${newVersion} instead.\n`);
    }

    // Update package.json with new version
    updatePackageJson(newVersion);
  } else {
    newVersion = currentVersion;
    console.log("ℹ️  No version bump requested, using current version.\n");

    // Still check if current version is available
    const npmAvailable = await isVersionAvailableOnNpm(packageName, newVersion);
    const gitAvailable = isVersionAvailableInGit(newVersion);

    if (!npmAvailable) {
      console.log(`⚠️  Warning: Version ${newVersion} already exists on npm.`);
    }
    if (!gitAvailable) {
      console.log(`⚠️  Warning: Tag v${newVersion} already exists in git.`);
    }
  }

  // Clean and build
  console.log("\n🧹 Cleaning previous builds...");
  const distDir = resolve("./dist");

  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true, force: true });
    console.log("✅ Cleaned dist directory\n");
  }

  // Build executables
  await buildExecutables();

  console.log("\n📋 Release Summary:");
  console.log(`Version: ${newVersion}`);
  console.log("Files created:");
  console.log("- dist/copima-cli-windows.exe");
  console.log("- dist/copima-cli-macos-x64");
  console.log("- dist/copima-cli-macos-arm64");

  // Commit changes and create git tag
  try {
    console.log("\n📝 Committing changes...");

    // Check if we're in a git repository
    /* eslint-disable sonarjs/no-os-command-from-path */
    execSync("git rev-parse --git-dir", { stdio: "ignore" });

    // Check if there are any changes to commit
    const gitStatus = execSync("git status --porcelain", { encoding: "utf-8" });

    if (gitStatus.trim()) {
      // Stage all changes

      execSync("git add .", { stdio: "inherit" });

      console.log("✅ Staged all changes");

      // Commit with release message
      const commitMessage = `chore(release): bump version to ${newVersion}`;
      /* eslint-disable sonarjs/os-command */
      execSync(`git commit -m "${commitMessage}"`, { stdio: "inherit" });
      /* eslint-enable sonarjs/os-command */
      console.log(`✅ Committed changes: ${commitMessage}`);
    } else {
      console.log("ℹ️  No changes to commit");
    }

    // Create git tag
    console.log(`\n🏷️  Creating git tag v${newVersion}...`);
    /* eslint-disable sonarjs/os-command */
    execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { stdio: "inherit" });
    /* eslint-enable sonarjs/os-command */
    console.log(`✅ Created tag v${newVersion}`);

    // Push commit and tag
    console.log("\n⬆️  Pushing commit and tag to remote...");
    execSync("git push --follow-tags", { stdio: "inherit" });
    /* eslint-enable sonarjs/no-os-command-from-path */
    console.log("✅ Pushed commit and tag to remote");

    console.log("\n🎉 Release completed successfully!");
    console.log("\nThe commit and tag have been pushed to trigger GitHub Actions.");
    console.log("Monitor the release at: https://github.com/pdiegmann/copima-cli-crawler/actions");
  } catch (error) {
    console.error("\n❌ Git operations failed:", error);
    console.log("\n⚠️  Release build completed but git operations failed.");
    console.log("\nYou can manually:");
    console.log(`1. Commit changes: git add . && git commit -m 'chore(release): bump version to ${newVersion}'`);
    console.log(`2. Create tag: git tag -a v${newVersion} -m 'Release v${newVersion}'`);
    console.log(`3. Push: git push && git push origin v${newVersion}`);
    process.exit(1);
  }
};

createRelease().catch((error) => {
  console.error("Release failed:", error);
  process.exit(1);
});
