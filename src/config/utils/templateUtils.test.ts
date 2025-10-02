import { hostname } from "os";
import { TemplateUtils } from "./templateUtils";

jest.mock("os");

const mockHostname = hostname as jest.MockedFunction<typeof hostname>;

describe("TemplateUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHostname.mockReturnValue("test-hostname");
  });

  describe("interpolate", () => {
    it("should interpolate single variable", () => {
      const result = TemplateUtils.interpolate("Hello {name}", { name: "World" });
      expect(result).toBe("Hello World");
    });

    it("should interpolate multiple variables", () => {
      const result = TemplateUtils.interpolate("{greeting} {name}!", { greeting: "Hello", name: "World" });
      expect(result).toBe("Hello World!");
    });

    it("should keep unmatched placeholders unchanged", () => {
      const result = TemplateUtils.interpolate("Hello {name} and {friend}", { name: "World" });
      expect(result).toBe("Hello World and {friend}");
    });

    it("should handle empty template", () => {
      const result = TemplateUtils.interpolate("", { name: "World" });
      expect(result).toBe("");
    });

    it("should handle template without placeholders", () => {
      const result = TemplateUtils.interpolate("No placeholders here", { name: "World" });
      expect(result).toBe("No placeholders here");
    });

    it("should handle empty variables object", () => {
      const result = TemplateUtils.interpolate("Hello {name}", {});
      expect(result).toBe("Hello {name}");
    });

    it("should convert non-string values to strings", () => {
      const result = TemplateUtils.interpolate("Count: {count}", { count: 42 });
      expect(result).toBe("Count: 42");
    });

    it("should handle boolean values", () => {
      const result = TemplateUtils.interpolate("Enabled: {enabled}", { enabled: true });
      expect(result).toBe("Enabled: true");
    });

    it("should handle object values by calling toString", () => {
      const result = TemplateUtils.interpolate("Value: {obj}", {
        obj: { toString: () => "custom" },
      });
      expect(result).toBe("Value: custom");
    });

    it("should handle repeated placeholders", () => {
      const result = TemplateUtils.interpolate("{name} loves {name}", { name: "Alice" });
      expect(result).toBe("Alice loves Alice");
    });
  });

  describe("interpolateDeep", () => {
    it("should interpolate string values", () => {
      const result = TemplateUtils.interpolateDeep("Hello {name}", { name: "World" });
      expect(result).toBe("Hello World");
    });

    it("should interpolate object values", () => {
      const obj = {
        greeting: "Hello {name}",
        message: "Welcome to {place}",
      };
      const result = TemplateUtils.interpolateDeep(obj, { name: "Alice", place: "Wonderland" });

      expect(result).toEqual({
        greeting: "Hello Alice",
        message: "Welcome to Wonderland",
      });
    });

    it("should interpolate nested object values", () => {
      const obj = {
        user: {
          name: "{username}",
          location: "{city}",
        },
      };
      const result = TemplateUtils.interpolateDeep(obj, { username: "Alice", city: "NYC" });

      expect(result).toEqual({
        user: {
          name: "Alice",
          location: "NYC",
        },
      });
    });

    it("should interpolate array values", () => {
      const arr = ["Hello {name}", "Welcome {name}"];
      const result = TemplateUtils.interpolateDeep(arr, { name: "Bob" });

      expect(result).toEqual(["Hello Bob", "Welcome Bob"]);
    });

    it("should interpolate mixed nested structures", () => {
      const obj = {
        messages: ["Hello {name}", "Goodbye {name}"],
        config: {
          path: "/home/{user}/config",
        },
      };
      const result = TemplateUtils.interpolateDeep(obj, { name: "Alice", user: "alice" });

      expect(result).toEqual({
        messages: ["Hello Alice", "Goodbye Alice"],
        config: {
          path: "/home/alice/config",
        },
      });
    });

    it("should handle null values", () => {
      const result = TemplateUtils.interpolateDeep(null, { name: "World" });
      expect(result).toBeNull();
    });

    it("should handle number values", () => {
      const result = TemplateUtils.interpolateDeep(42, { name: "World" });
      expect(result).toBe(42);
    });

    it("should handle boolean values", () => {
      const result = TemplateUtils.interpolateDeep(true, { name: "World" });
      expect(result).toBe(true);
    });

    it("should handle undefined values", () => {
      const result = TemplateUtils.interpolateDeep(undefined, { name: "World" });
      expect(result).toBeUndefined();
    });

    it("should preserve non-interpolated values", () => {
      const obj = {
        count: 42,
        enabled: true,
        data: null,
      };
      const result = TemplateUtils.interpolateDeep(obj, { name: "World" });

      expect(result).toEqual({
        count: 42,
        enabled: true,
        data: null,
      });
    });
  });

  describe("getDefaultVariables", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should return default variables with HOME from env", () => {
      process.env["HOME"] = "/home/testuser";
      process.env["USER"] = "testuser";
      process.env["NODE_ENV"] = "test";

      const result = TemplateUtils.getDefaultVariables();

      expect(result["HOME"]).toBe("/home/testuser");
      expect(result["USER"]).toBe("testuser");
      expect(result["NODE_ENV"]).toBe("test");
      expect(result["PLATFORM"]).toBe(process.platform);
      expect(result["ARCH"]).toBe(process.arch);
      expect(result["HOSTNAME"]).toBe("test-hostname");
      expect(result["CWD"]).toBe(process.cwd());
    });

    it("should fallback to USERPROFILE for HOME on Windows", () => {
      delete process.env["HOME"];
      process.env["USERPROFILE"] = "C:\\Users\\testuser";

      const result = TemplateUtils.getDefaultVariables();

      expect(result["HOME"]).toBe("C:\\Users\\testuser");
    });

    it("should fallback to tilde when no HOME or USERPROFILE", () => {
      delete process.env["HOME"];
      delete process.env["USERPROFILE"];

      const result = TemplateUtils.getDefaultVariables();

      expect(result["HOME"]).toBe("~");
    });

    it("should fallback to USERNAME when no USER", () => {
      delete process.env["USER"];
      process.env["USERNAME"] = "winuser";

      const result = TemplateUtils.getDefaultVariables();

      expect(result["USER"]).toBe("winuser");
    });

    it("should fallback to unknown when no USER or USERNAME", () => {
      delete process.env["USER"];
      delete process.env["USERNAME"];

      const result = TemplateUtils.getDefaultVariables();

      expect(result["USER"]).toBe("unknown");
    });

    it("should default NODE_ENV to development", () => {
      delete process.env["NODE_ENV"];

      const result = TemplateUtils.getDefaultVariables();

      expect(result["NODE_ENV"]).toBe("development");
    });

    it("should include timestamp and date variables", () => {
      const result = TemplateUtils.getDefaultVariables();

      expect(result["TIMESTAMP"]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result["DATE"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result["TIME"]).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });

  describe("extractVariables", () => {
    it("should extract single variable", () => {
      const result = TemplateUtils.extractVariables("Hello {name}");
      expect(result).toEqual(["name"]);
    });

    it("should extract multiple variables", () => {
      const result = TemplateUtils.extractVariables("{greeting} {name} from {place}");
      expect(result).toEqual(["greeting", "name", "place"]);
    });

    it("should return empty array for template without variables", () => {
      const result = TemplateUtils.extractVariables("No variables here");
      expect(result).toEqual([]);
    });

    it("should handle empty template", () => {
      const result = TemplateUtils.extractVariables("");
      expect(result).toEqual([]);
    });

    it("should handle repeated variables", () => {
      const result = TemplateUtils.extractVariables("{name} loves {name}");
      expect(result).toEqual(["name", "name"]);
    });

    it("should only match alphanumeric variable names", () => {
      const result = TemplateUtils.extractVariables("{var1} {var_2} {var-3}");
      expect(result).toEqual(["var1", "var_2"]);
    });
  });

  describe("validateTemplate", () => {
    it("should return empty array when all required vars present", () => {
      const result = TemplateUtils.validateTemplate("{name} {age}", ["name", "age"]);
      expect(result).toEqual([]);
    });

    it("should return missing required variables", () => {
      const result = TemplateUtils.validateTemplate("{name}", ["name", "age", "city"]);
      expect(result).toEqual(["age", "city"]);
    });

    it("should handle template with no variables", () => {
      const result = TemplateUtils.validateTemplate("No variables", ["name", "age"]);
      expect(result).toEqual(["name", "age"]);
    });

    it("should handle empty required vars", () => {
      const result = TemplateUtils.validateTemplate("{name} {age}", []);
      expect(result).toEqual([]);
    });

    it("should handle template with extra variables", () => {
      const result = TemplateUtils.validateTemplate("{name} {age} {city}", ["name"]);
      expect(result).toEqual([]);
    });

    it("should handle empty template", () => {
      const result = TemplateUtils.validateTemplate("", ["name", "age"]);
      expect(result).toEqual(["name", "age"]);
    });

    it("should handle repeated required variables", () => {
      const result = TemplateUtils.validateTemplate("{name}", ["name", "name", "age"]);
      expect(result).toEqual(["age"]);
    });
  });
});
