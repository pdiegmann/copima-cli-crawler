#!/usr/bin/env bun

import { existsSync, rmSync } from "fs";
import { resolve } from "path";
import { buildExecutables } from "../build.config";

async function main(): Promise<void> {
  console.log("🧹 Cleaning previous builds...");
  const distDir = resolve("./dist");

  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true, force: true });
    console.log("✅ Cleaned dist directory\n");
  }

  await buildExecutables();
}

main().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
