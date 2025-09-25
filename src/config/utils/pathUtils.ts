import { existsSync, mkdirSync, statSync } from "fs";
import { homedir } from "os";
import { dirname, join, relative, resolve } from "path";

export class PathUtils {
  static expandPath(path: string): string {
    if (path.startsWith("~/")) {
      return resolve(homedir(), path.slice(2));
    }
    if (path.startsWith("$HOME/")) {
      return resolve(homedir(), path.slice(6));
    }
    if (path.startsWith("./")) {
      return resolve(process.cwd(), path.slice(2));
    }
    if (!path.startsWith("/")) {
      return resolve(process.cwd(), path);
    }
    return resolve(path);
  }

  static resolveConfigPaths(basePaths: string[]): string[] {
    return basePaths.map((path) => this.expandPath(path)).filter((path) => this.isValidPath(path));
  }

  static isValidPath(path: string): boolean {
    try {
      const expanded = this.expandPath(path);
      return existsSync(expanded) && statSync(expanded).isFile();
    } catch {
      return false;
    }
  }

  static getDefaultConfigPaths(): string[] {
    const paths = [
      "./copima.yml",
      "./copima.yaml",
      "./copima.json",
      "./.copima.yml",
      "./.copima.yaml",
      "./.copima.json",
      "~/.config/copima/config.yml",
      "~/.config/copima/config.yaml",
      "~/.config/copima/config.json",
      "~/.copima.yml",
      "~/.copima.yaml",
      "~/.copima.json",
    ];

    return this.resolveConfigPaths(paths);
  }

  static ensureDirectory(path: string): void {
    try {
      const dir = dirname(this.expandPath(path));
      mkdirSync(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore EEXIST errors
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }
  }

  static joinPaths(...paths: string[]): string {
    return join(...paths);
  }

  static isRelativePath(path: string): boolean {
    return !path.startsWith("/") && !path.startsWith("~") && !path.startsWith("$HOME");
  }

  static makeRelative(path: string, basePath: string = process.cwd()): string {
    const expandedPath = this.expandPath(path);
    const expandedBase = this.expandPath(basePath);
    return relative(expandedBase, expandedPath);
  }
}
