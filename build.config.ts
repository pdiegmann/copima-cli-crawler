import { $ } from "bun";
import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";

const platforms = [
  { target: "bun-windows-x64", extension: ".exe", name: "windows" },
  { target: "bun-darwin-x64", extension: "", name: "macos-x64" },
  { target: "bun-darwin-arm64", extension: "", name: "macos-arm64" },
] as const;

export const buildExecutables = async (): Promise<void> => {
  const distDir = resolve("./dist");

  // Ensure dist directory exists
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  console.log("🚀 Building executables...\n");

  for (const platform of platforms) {
    try {
      console.log(`📦 Building for ${platform.name}...`);

      const outputPath = resolve(distDir, `copima-cli-${platform.name}${platform.extension}`);

      // Use Bun's compile command directly via shell
      await $`bun build --compile --target=${platform.target} --outfile=${outputPath} ./src/bin/cli.ts`;

      console.log(`✅ Built ${platform.name}: ${outputPath}\n`);
    } catch (error) {
      console.error(`❌ Failed to build for ${platform.name}:`, error);
      process.exit(1);
    }
  }

  console.log("🎉 All executables built successfully!");
  console.log("\nOutput files:");
  console.log("- dist/copima-cli-windows.exe");
  console.log("- dist/copima-cli-macos-x64");
  console.log("- dist/copima-cli-macos-arm64");
};

if (import.meta.main) {
  buildExecutables().catch(console.error);
}
