#!/usr/bin/env bun

import { execSync } from "child_process";
import { existsSync, readFileSync, rmSync } from "fs";
import { resolve } from "path";
import { buildExecutables } from "../build.config";

const createRelease = async (): Promise<void> => {
  console.log("🚀 Starting release process...\n");

  // Clean and build
  console.log("🧹 Cleaning previous builds...");
  const distDir = resolve("./dist");

  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true, force: true });
    console.log("✅ Cleaned dist directory\n");
  }

  // Build executables
  await buildExecutables();

  // Get version from package.json
  const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
  const version = packageJson.version;

  console.log("\n📋 Release Summary:");
  console.log(`Version: ${version}`);
  console.log("Files created:");
  console.log("- dist/copima-cli-windows.exe");
  console.log("- dist/copima-cli-macos-x64");
  console.log("- dist/copima-cli-macos-arm64");

  // Check if we're in a git repository and have changes
  try {
    /* eslint-disable sonarjs/no-os-command-from-path */
    const gitStatus = execSync("git status --porcelain", { encoding: "utf-8" });
    /* eslint-enable sonarjs/no-os-command-from-path */
    if (gitStatus.trim()) {
      console.log("\n⚠️  Warning: You have uncommitted changes.");
      console.log("Consider committing changes before creating a release.");
    }

    // Check if tag already exists
    try {
      /* eslint-disable sonarjs/os-command */
      execSync(`git rev-parse v${version}`, { stdio: "ignore" });
      /* eslint-enable sonarjs/os-command */
      console.log(`\n⚠️  Tag v${version} already exists.`);
      console.log("Consider updating the version in package.json before releasing.");
    } catch {
      // Tag doesn't exist, which is good
      console.log(`\n✅ Tag v${version} is available.`);
    }
  } catch {
    console.log("\n⚠️  Not in a git repository or git not available.");
  }

  console.log("\n🎉 Release build completed!");
  console.log("\nNext steps:");
  console.log("1. Test the executables locally");
  console.log("2. Commit any changes and push to main branch");
  console.log("3. Create a git tag and push it to trigger GitHub Actions");
  console.log(`   git tag v${version} && git push origin v${version}`);
  console.log("4. Or manually upload the files to GitHub releases");
};

createRelease().catch((error) => {
  console.error("Release failed:", error);
  process.exit(1);
});
