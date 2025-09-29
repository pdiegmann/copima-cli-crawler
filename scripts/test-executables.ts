#!/usr/bin/env bun

import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

type Executable = {
  name: string;
  path: string;
  platform: string;
  arch: string;
  testable: boolean;
};

const getExecutables = (): Executable[] => {
  const distDir = resolve("./dist");

  return [
    {
      name: "copima-cli-windows.exe",
      path: resolve(distDir, "copima-cli-windows.exe"),
      platform: "windows",
      arch: "x64",
      testable: false, // Can't test Windows exe on macOS/Linux
    },
    {
      name: "copima-cli-macos-x64",
      path: resolve(distDir, "copima-cli-macos-x64"),
      platform: "darwin",
      arch: "x64",
      testable: process.platform === "darwin",
    },
    {
      name: "copima-cli-macos-arm64",
      path: resolve(distDir, "copima-cli-macos-arm64"),
      platform: "darwin",
      arch: "arm64",
      testable: process.platform === "darwin",
    },
  ];
};

const testExecutable = async (executable: Executable): Promise<boolean> => {
  console.log(`\n🧪 Testing ${executable.name}...`);

  if (!existsSync(executable.path)) {
    console.log(`❌ File not found: ${executable.path}`);
    return false;
  }

  // Check file info
  try {
    const { statSync } = await import("fs");
    const stats = statSync(executable.path);
    console.log(`📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.log(`⚠️  Could not get file stats: ${error}`);
  }

  if (!executable.testable) {
    console.log("⏭️  Skipping execution test (platform incompatible)");
    return true;
  }

  // Make executable on Unix systems
  if (process.platform !== "win32") {
    try {
      /* eslint-disable sonarjs/os-command */
      execSync(`chmod +x "${executable.path}"`);
      /* eslint-enable sonarjs/os-command */
    } catch (error) {
      console.log(`⚠️  Could not make file executable: ${error}`);
    }
  }

  // Test basic commands
  const tests = [
    { cmd: "--help", desc: "Help command" },
    { cmd: "--version", desc: "Version command" },
    { cmd: "config:show --help", desc: "Config help" },
  ];

  for (const test of tests) {
    try {
      console.log(`  🔍 Testing: ${test.desc}...`);
      /* eslint-disable sonarjs/os-command */
      const output = execSync(`"${executable.path}" ${test.cmd}`, {
        encoding: "utf-8",
        timeout: 10000,
      });
      /* eslint-enable sonarjs/os-command */

      if (output.trim()) {
        console.log(`    ✅ Success (${output.split("\\n").length} lines output)`);
      } else {
        console.log("    ⚠️  No output returned");
      }
    } catch (error) {
      console.log(`    ❌ Failed: ${error}`);
      return false;
    }
  }

  console.log(`✅ All tests passed for ${executable.name}`);
  return true;
};

const main = async (): Promise<void> => {
  console.log("🚀 Testing built executables...\n");

  const executables = getExecutables();
  let totalTests = 0;
  let passedTests = 0;

  for (const executable of executables) {
    totalTests++;
    if (await testExecutable(executable)) {
      passedTests++;
    }
  }

  console.log("\n📊 Test Summary:");
  console.log(`Total executables: ${totalTests}`);
  console.log(`Passed tests: ${passedTests}`);
  console.log(`Failed tests: ${totalTests - passedTests}`);

  if (passedTests === totalTests) {
    console.log("\n🎉 All executable tests passed!");
    process.exit(0);
  } else {
    console.log("\n❌ Some tests failed. Check the output above.");
    process.exit(1);
  }
};

if (import.meta.main) {
  main().catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
}
