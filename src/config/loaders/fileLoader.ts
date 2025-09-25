import { readFileSync } from "fs";
import { load as parseYaml } from "js-yaml";
import type { Config } from "../types.js";

export class FileConfigLoader {
  async loadYamlFile(path: string): Promise<Partial<Config>> {
    try {
      const content = readFileSync(path, "utf-8");
      const parsed = parseYaml(content) as Partial<Config>;

      // Validate that parsed content is an object
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error(`Invalid YAML structure in ${path}: expected object`);
      }

      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {}; // File doesn't exist, return empty config
      }
      throw new Error(`Failed to load config from ${path}: ${(error as Error).message}`);
    }
  }

  async loadJsonFile(path: string): Promise<Partial<Config>> {
    try {
      const content = readFileSync(path, "utf-8");
      const parsed = JSON.parse(content) as Partial<Config>;

      // Validate that parsed content is an object
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error(`Invalid JSON structure in ${path}: expected object`);
      }

      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {};
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON syntax in ${path}: ${error.message}`);
      }
      throw new Error(`Failed to load config from ${path}: ${(error as Error).message}`);
    }
  }

  async loadEnvFile(path: string): Promise<Partial<Config>> {
    try {
      const content = readFileSync(path, "utf-8");
      const envVars: Record<string, string> = {};

      content.split("\n").forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith("#")) {
          const [key, ...valueParts] = trimmedLine.split("=");
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join("=").trim();
          }
        }
      });

      // Convert env vars to config structure
      return this.envVarsToConfig(envVars);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {};
      }
      throw new Error(`Failed to load env file from ${path}: ${(error as Error).message}`);
    }
  }

  private envVarsToConfig(envVars: Record<string, string>): Partial<Config> {
    const config: Partial<Config> = {};

    for (const [key, value] of Object.entries(envVars)) {
      if (key.startsWith("COPIMA_")) {
        const configKey = key.replace("COPIMA_", "").toLowerCase();
        this.setNestedValue(config, configKey.split("_"), value);
      }
    }

    return config;
  }

  private setNestedValue(obj: any, path: string[], value: string): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const pathPart = path[i];
      if (pathPart && !(pathPart in current)) {
        current[pathPart] = {};
      }
      if (pathPart) {
        current = current[pathPart];
      }
    }
    const lastPart = path[path.length - 1];
    if (lastPart) {
      current[lastPart] = this.parseValue(value);
    }
  }

  private parseValue(value: string): any {
    // Try to parse as boolean
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;

    // Try to parse as number
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

    // Return as string
    return value;
  }
}
