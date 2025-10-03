import { beforeEach, describe, expect, it } from "@jest/globals";
import { ConfigMerger } from "./configMerger";

describe("ConfigMerger", () => {
  let merger: ConfigMerger;

  beforeEach(() => {
    merger = new ConfigMerger();
  });

  describe("merge", () => {
    it("merges two simple configs", () => {
      const config1 = {
        gitlab: {
          host: "https://gitlab1.example.com",
        },
      } as any;
      const config2 = {
        database: {
          path: "./test.db",
        },
      } as any;

      const result = merger.merge([config1, config2]);

      expect(result).toEqual({
        gitlab: {
          host: "https://gitlab1.example.com",
        },
        database: {
          path: "./test.db",
        },
      });
    });

    it("merges nested configs", () => {
      const config1 = {
        gitlab: {
          host: "https://gitlab1.example.com",
          timeout: 30000,
        },
      } as any;
      const config2 = {
        gitlab: {
          accessToken: "token123",
        },
      } as any;

      const result = merger.merge([config1, config2]);

      expect(result).toEqual({
        gitlab: {
          host: "https://gitlab1.example.com",
          timeout: 30000,
          accessToken: "token123",
        },
      });
    });

    it("overwrites values from earlier configs with later ones", () => {
      const config1 = {
        gitlab: {
          host: "https://gitlab1.example.com",
        },
      } as any;
      const config2 = {
        gitlab: {
          host: "https://gitlab2.example.com",
        },
      } as any;

      const result = merger.merge([config1, config2]);

      expect(result.gitlab?.host).toBe("https://gitlab2.example.com");
    });

    it("replaces arrays entirely rather than merging", () => {
      const config1 = {
        logging: {
          level: "info" as const,
        },
      };
      const config2 = {
        logging: {
          level: "debug" as const,
        },
      };

      const result = merger.merge([config1, config2]);

      expect(result.logging?.level).toBe("debug");
    });

    it("handles empty config array", () => {
      const result = merger.merge([]);

      expect(result).toEqual({});
    });

    it("handles single config", () => {
      const config = {
        gitlab: {
          host: "https://gitlab.example.com",
        },
      } as any;

      const result = merger.merge([config]);

      expect(result).toEqual(config);
    });

    it("merges multiple configs in order", () => {
      const config1 = { gitlab: { host: "host1" } } as any;
      const config2 = { gitlab: { timeout: 1000 } } as any;
      const config3 = { gitlab: { host: "host3" } } as any;

      const result = merger.merge([config1, config2, config3]);

      expect(result).toEqual({
        gitlab: {
          host: "host3",
          timeout: 1000,
        },
      });
    });

    it("preserves deeply nested objects", () => {
      const config1 = {
        gitlab: {
          oauth: {
            clientId: "client1",
            scopes: ["read"],
          },
        },
      } as any;
      const config2 = {
        gitlab: {
          oauth: {
            clientSecret: "secret1",
          },
        },
      } as any;

      const result = merger.merge([config1, config2]);

      expect(result).toEqual({
        gitlab: {
          oauth: {
            clientId: "client1",
            scopes: ["read"],
            clientSecret: "secret1",
          },
        },
      });
    });
  });

  describe("mergeWithPriority", () => {
    it("merges configs according to priority", () => {
      const configs = [
        {
          config: { gitlab: { host: "low-priority" } } as any,
          priority: 1,
        },
        {
          config: { gitlab: { host: "high-priority" } } as any,
          priority: 3,
        },
        {
          config: { gitlab: { host: "medium-priority" } } as any,
          priority: 2,
        },
      ];

      const result = merger.mergeWithPriority(configs);

      expect(result.gitlab?.host).toBe("high-priority");
    });

    it("handles configs with same priority", () => {
      const configs = [
        {
          config: { gitlab: { host: "first" } } as any,
          priority: 1,
        },
        {
          config: { gitlab: { timeout: 1000 } } as any,
          priority: 1,
        },
      ];

      const result = merger.mergeWithPriority(configs);

      expect(result).toEqual({
        gitlab: {
          host: "first",
          timeout: 1000,
        },
      });
    });

    it("preserves lower priority values when not overridden", () => {
      const configs = [
        {
          config: { gitlab: { host: "host1", timeout: 1000 } } as any,
          priority: 1,
        },
        {
          config: { gitlab: { accessToken: "token" } } as any,
          priority: 2,
        },
      ];

      const result = merger.mergeWithPriority(configs);

      expect(result).toEqual({
        gitlab: {
          host: "host1",
          timeout: 1000,
          accessToken: "token",
        },
      });
    });
  });

  describe("mergeWithStrategy", () => {
    it("merges configs with default 'merge' strategy", () => {
      const config1 = { gitlab: { host: "host1", timeout: 1000 } } as any;
      const config2 = { gitlab: { host: "host2" } } as any;

      const result = merger.mergeWithStrategy([config1, config2]);

      expect(result).toEqual({
        gitlab: {
          host: "host2",
          timeout: 1000,
        },
      });
    });

    it("overwrites with 'overwrite' strategy", () => {
      const config1 = {
        gitlab: { host: "host1", timeout: 1000 },
        database: { path: "./db1.db" },
      } as any;
      const config2 = {
        gitlab: { host: "host2" },
      } as any;

      const result = merger.mergeWithStrategy([config1, config2], "overwrite");

      expect(result).toEqual({
        gitlab: { host: "host2" },
        database: { path: "./db1.db" },
      });
    });

    it("merges nested objects with 'merge' strategy", () => {
      const config1 = { gitlab: { host: "host1", timeout: 1000 } } as any;
      const config2 = { gitlab: { accessToken: "token" } } as any;

      const result = merger.mergeWithStrategy([config1, config2], "merge");

      expect(result).toEqual({
        gitlab: {
          host: "host1",
          timeout: 1000,
          accessToken: "token",
        },
      });
    });

    it("handles undefined values correctly", () => {
      const config1 = { gitlab: { host: "host1" } } as any;
      const config2 = { gitlab: { host: undefined } } as any;

      const result = merger.mergeWithStrategy([config1, config2]);

      expect(result.gitlab?.host).toBeUndefined();
    });

    it("handles null values correctly", () => {
      const config1 = { gitlab: { host: "host1" } } as any;
      const config2 = { gitlab: { host: null as any } } as any;

      const result = merger.mergeWithStrategy([config1, config2]);

      expect(result.gitlab?.host).toBeNull();
    });

    it("preserves boolean false values", () => {
      const config1 = { logging: { console: true } } as any;
      const config2 = { logging: { console: false } } as any;

      const result = merger.mergeWithStrategy([config1, config2]);

      expect(result.logging?.console).toBe(false);
    });

    it("preserves number zero values", () => {
      const config1 = { gitlab: { timeout: 1000 } } as any;
      const config2 = { gitlab: { timeout: 0 } } as any;

      const result = merger.mergeWithStrategy([config1, config2]);

      expect(result.gitlab?.timeout).toBe(0);
    });

    it("preserves empty string values", () => {
      const config1 = { gitlab: { host: "host1" } } as any;
      const config2 = { gitlab: { host: "" } } as any;

      const result = merger.mergeWithStrategy([config1, config2]);

      expect(result.gitlab?.host).toBe("");
    });
  });

  describe("append strategy", () => {
    it("appends array fields with 'append' strategy", () => {
      const config1 = {
        oauth2: {
          providers: {
            gitlab: { scopes: ["read_user"] },
          },
        },
      } as any;
      const config2 = {
        oauth2: {
          providers: {
            gitlab: { scopes: ["api"] },
          },
        },
      } as any;

      const result = merger.mergeWithStrategy([config1, config2], "append");

      // With append strategy, arrays should be concatenated
      expect(result.oauth2?.providers?.gitlab?.scopes).toEqual(["read_user", "api"]);
    });

    it("handles empty arrays with append strategy", () => {
      const config1 = {
        oauth2: {
          providers: {
            gitlab: { scopes: [] },
          },
        },
      } as any;
      const config2 = {
        oauth2: {
          providers: {
            gitlab: { scopes: ["api"] },
          },
        },
      } as any;

      const result = merger.mergeWithStrategy([config1, config2], "append");

      expect(result.oauth2?.providers?.gitlab?.scopes).toEqual(["api"]);
    });

    it("merges non-array fields with append strategy", () => {
      const config1 = {
        gitlab: { host: "host1", timeout: 1000 },
      } as any;
      const config2 = {
        gitlab: { accessToken: "token" },
      } as any;

      const result = merger.mergeWithStrategy([config1, config2], "append");

      expect(result["gitlab"]).toEqual({
        host: "host1",
        timeout: 1000,
        accessToken: "token",
      });
    });

    it("overwrites non-array fields with append strategy", () => {
      const config1 = {
        gitlab: { host: "host1" },
      } as any;
      const config2 = {
        gitlab: { host: "host2" },
      } as any;

      const result = merger.mergeWithStrategy([config1, config2], "append");

      expect(result["gitlab"]?.host).toBe("host2");
    });

    it("handles mixed array and object fields with append strategy", () => {
      const config1 = {
        gitlab: { host: "host1" },
        oauth2: {
          providers: {
            gitlab: { scopes: ["read"] },
          },
        },
      } as any;
      const config2 = {
        gitlab: { timeout: 1000 },
        oauth2: {
          providers: {
            gitlab: { scopes: ["write"] },
          },
        },
      } as any;

      const result = merger.mergeWithStrategy([config1, config2], "append");

      expect(result["gitlab"]).toEqual({ host: "host1", timeout: 1000 });
      expect(result.oauth2?.providers?.gitlab?.scopes).toEqual(["read", "write"]);
    });
  });

  describe("edge cases", () => {
    it("handles configs with different top-level keys", () => {
      const config1 = { gitlab: { host: "host1" } } as any;
      const config2 = { database: { path: "./db.db" } } as any;
      const config3 = { logging: { level: "info" as const } } as any;

      const result = merger.merge([config1, config2, config3]);

      expect(result).toEqual({
        gitlab: { host: "host1" },
        database: { path: "./db.db" },
        logging: { level: "info" },
      });
    });

    it("handles deeply nested merges", () => {
      const config1 = {
        gitlab: {
          oauth: {
            providers: {
              gitlab: {
                clientId: "id1",
              },
            },
          },
        },
      } as any;
      const config2 = {
        gitlab: {
          oauth: {
            providers: {
              gitlab: {
                clientSecret: "secret1",
              },
            },
          },
        },
      } as any;

      const result = merger.merge([config1, config2]);

      expect(result).toEqual({
        gitlab: {
          oauth: {
            providers: {
              gitlab: {
                clientId: "id1",
                clientSecret: "secret1",
              },
            },
          },
        },
      });
    });

    it("doesn't mutate original configs", () => {
      const config1 = { gitlab: { host: "host1" } } as any;
      const config2 = { gitlab: { timeout: 1000 } } as any;
      const config1Copy = { ...config1 };
      const config2Copy = { ...config2 };

      merger.merge([config1, config2]);

      expect(config1).toEqual(config1Copy);
      expect(config2).toEqual(config2Copy);
    });
  });
});
