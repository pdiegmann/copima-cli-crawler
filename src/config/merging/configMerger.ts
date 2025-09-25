import type { Config } from "../types.js";

export class ConfigMerger {
  merge(configs: Partial<Config>[]): Partial<Config> {
    return configs.reduce((merged, config) => {
      return this.deepMerge(merged, config);
    }, {} as Partial<Config>);
  }

  mergeWithPriority(configs: Array<{ config: Partial<Config>; priority: number }>): Partial<Config> {
    // Sort by priority (higher numbers = higher priority)
    const sortedConfigs = configs.sort((a, b) => a.priority - b.priority);
    return this.merge(sortedConfigs.map((c) => c.config));
  }

  private deepMerge(target: any, source: any): any {
    if (this.isObject(target) && this.isObject(source)) {
      const result = { ...target };

      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          if (this.isObject(source[key]) && this.isObject(target[key])) {
            result[key] = this.deepMerge(target[key], source[key]);
          } else if (Array.isArray(source[key])) {
            // For arrays, replace entirely rather than merge
            result[key] = [...source[key]];
          } else {
            result[key] = source[key];
          }
        }
      }

      return result;
    }

    return source;
  }

  private isObject(item: any): boolean {
    return item && typeof item === "object" && !Array.isArray(item) && item !== null;
  }

  /**
   * Merge configs with conflict resolution strategy
   */
  mergeWithStrategy(configs: Partial<Config>[], strategy: "overwrite" | "merge" | "append" = "merge"): Partial<Config> {
    switch (strategy) {
      case "overwrite":
        return configs.reduce((result, config) => ({ ...result, ...config }), {} as Partial<Config>);

      case "append":
        return this.mergeArrayFields(configs);

      case "merge":
      default:
        return this.merge(configs);
    }
  }

  private mergeArrayFields(configs: Partial<Config>[]): Partial<Config> {
    const result: any = {};

    for (const config of configs) {
      for (const [key, value] of Object.entries(config)) {
        if (Array.isArray(value)) {
          result[key] = [...(result[key] || []), ...value];
        } else if (this.isObject(value) && this.isObject(result[key])) {
          result[key] = this.deepMerge(result[key], value);
        } else {
          result[key] = value;
        }
      }
    }

    return result as Partial<Config>;
  }
}
