import type { Config } from "../types.js";

export class EnvironmentConfigLoader {
  loadFromEnvironment(): Partial<Config> {
    const config: Partial<Config> = {};

    // Load each configuration section
    this.addConfigSection(config, "gitlab", this.loadGitlabConfig());
    this.addConfigSection(config, "database", this.loadDatabaseConfig());
    this.addConfigSection(config, "output", this.loadOutputConfig());
    this.addConfigSection(config, "logging", this.loadLoggingConfig());
    this.addConfigSection(config, "progress", this.loadProgressConfig());
    this.addConfigSection(config, "resume", this.loadResumeConfig());
    this.addConfigSection(config, "callbacks", this.loadCallbackConfig());

    return config;
  }

  private addConfigSection(config: any, key: string, sectionConfig: any): void {
    if (Object.keys(sectionConfig).length > 0) {
      config[key] = sectionConfig;
    }
  }

  private getString(envVar: string): string | undefined {
    return process.env[envVar];
  }

  private getInt(envVar: string): number | undefined {
    const value = process.env[envVar];
    if (!value) return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }

  private getBool(envVar: string): boolean | undefined {
    const value = process.env[envVar];
    return value ? value.toLowerCase() === "true" : undefined;
  }

  private getEnum<T extends string>(envVar: string, validValues: T[]): T | undefined {
    const value = process.env[envVar] as T;
    return validValues.includes(value) ? value : undefined;
  }

  private loadGitlabConfig(): any {
    const config: any = {};

    const host = this.getString("GITLAB_HOST");
    if (host) config.host = host;

    const accessToken = this.getString("GITLAB_ACCESS_TOKEN");
    if (accessToken) config.accessToken = accessToken;

    const refreshToken = this.getString("GITLAB_REFRESH_TOKEN");
    if (refreshToken) config.refreshToken = refreshToken;

    const timeout = this.getInt("GITLAB_TIMEOUT");
    if (timeout !== undefined) config.timeout = timeout;

    const maxConcurrency = this.getInt("GITLAB_MAX_CONCURRENCY");
    if (maxConcurrency !== undefined) config.maxConcurrency = maxConcurrency;

    const rateLimit = this.getInt("GITLAB_RATE_LIMIT");
    if (rateLimit !== undefined) config.rateLimit = rateLimit;

    return config;
  }

  private loadDatabaseConfig(): any {
    const config: any = {};

    const path = this.getString("DATABASE_PATH");
    if (path) config.path = path;

    const walMode = this.getBool("DATABASE_WAL_MODE");
    if (walMode !== undefined) config.walMode = walMode;

    const timeout = this.getInt("DATABASE_TIMEOUT");
    if (timeout !== undefined) config.timeout = timeout;

    return config;
  }

  private loadOutputConfig(): any {
    const config: any = {};

    const rootDir = this.getString("OUTPUT_ROOT_DIR");
    if (rootDir) config.rootDir = rootDir;

    const fileNaming = this.getEnum("OUTPUT_FILE_NAMING", ["lowercase", "kebab-case", "snake_case"]);
    if (fileNaming) config.fileNaming = fileNaming;

    const prettyPrint = this.getBool("OUTPUT_PRETTY_PRINT");
    if (prettyPrint !== undefined) config.prettyPrint = prettyPrint;

    const compression = this.getEnum("OUTPUT_COMPRESSION", ["none", "gzip", "brotli"]);
    if (compression) config.compression = compression;

    return config;
  }

  private loadLoggingConfig(): any {
    const config: any = {};

    const level = this.getEnum("LOG_LEVEL", ["error", "warn", "info", "debug"]);
    if (level) config.level = level;

    const format = this.getEnum("LOG_FORMAT", ["json", "simple", "combined"]);
    if (format) config.format = format;

    const file = this.getString("LOG_FILE");
    if (file) config.file = file;

    const console = this.getBool("LOG_CONSOLE");
    if (console !== undefined) config.console = console;

    const colors = this.getBool("LOG_COLORS");
    if (colors !== undefined) config.colors = colors;

    return config;
  }

  private loadProgressConfig(): any {
    const config: any = {};

    const enabled = this.getBool("PROGRESS_ENABLED");
    if (enabled !== undefined) config.enabled = enabled;

    const file = this.getString("PROGRESS_FILE");
    if (file) config.file = file;

    const interval = this.getInt("PROGRESS_INTERVAL");
    if (interval !== undefined) config.interval = interval;

    const detailed = this.getBool("PROGRESS_DETAILED");
    if (detailed !== undefined) config.detailed = detailed;

    return config;
  }

  private loadResumeConfig(): any {
    const config: any = {};

    const enabled = this.getBool("RESUME_ENABLED");
    if (enabled !== undefined) config.enabled = enabled;

    const stateFile = this.getString("RESUME_STATE_FILE");
    if (stateFile) config.stateFile = stateFile;

    const autoSaveInterval = this.getInt("RESUME_AUTO_SAVE_INTERVAL");
    if (autoSaveInterval !== undefined) config.autoSaveInterval = autoSaveInterval;

    return config;
  }

  private loadCallbackConfig(): any {
    const config: any = {};

    const enabled = this.getBool("CALLBACK_ENABLED");
    if (enabled !== undefined) config.enabled = enabled;

    const modulePath = this.getString("CALLBACK_MODULE_PATH");
    if (modulePath) config.modulePath = modulePath;

    return config;
  }

  getConfigPaths(): string[] {
    const paths: string[] = [];

    if (process.env["COPIMA_CONFIG_PATH"]) {
      paths.push(process.env["COPIMA_CONFIG_PATH"]);
    }

    if (process.env["COPIMA_CONFIG_PATHS"]) {
      paths.push(...process.env["COPIMA_CONFIG_PATHS"].split(":"));
    }

    return paths;
  }
}
