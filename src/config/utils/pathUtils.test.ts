import { existsSync, mkdirSync, statSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";
import { PathUtils } from "./pathUtils";

jest.mock("fs");
jest.mock("os");

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockStatSync = statSync as jest.MockedFunction<typeof statSync>;
const mockMkdirSync = mkdirSync as jest.MockedFunction<typeof mkdirSync>;
const mockHomedir = homedir as jest.MockedFunction<typeof homedir>;

describe("PathUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHomedir.mockReturnValue("/home/user");
  });

  describe("expandPath", () => {
    it("should expand tilde path", () => {
      const result = PathUtils.expandPath("~/config.yml");
      expect(result).toBe(resolve("/home/user", "config.yml"));
    });

    it("should expand $HOME path", () => {
      const result = PathUtils.expandPath("$HOME/config.yml");
      expect(result).toBe(resolve("/home/user", "config.yml"));
    });

    it("should expand relative ./ path", () => {
      const cwd = process.cwd();
      const result = PathUtils.expandPath("./config.yml");
      expect(result).toBe(resolve(cwd, "config.yml"));
    });

    it("should expand relative path without prefix", () => {
      const cwd = process.cwd();
      const result = PathUtils.expandPath("config.yml");
      expect(result).toBe(resolve(cwd, "config.yml"));
    });

    it("should resolve absolute path", () => {
      const result = PathUtils.expandPath("/absolute/path/config.yml");
      expect(result).toBe(resolve("/absolute/path/config.yml"));
    });
  });

  describe("isValidPath", () => {
    it("should return true for existing file", () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isFile: () => true } as any);

      const result = PathUtils.isValidPath("~/config.yml");
      expect(result).toBe(true);
    });

    it("should return false for directory", () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ isFile: () => false } as any);

      const result = PathUtils.isValidPath("~/config");
      expect(result).toBe(false);
    });

    it("should return false for non-existent path", () => {
      mockExistsSync.mockReturnValue(false);

      const result = PathUtils.isValidPath("~/nonexistent.yml");
      expect(result).toBe(false);
    });

    it("should return false when statSync throws error", () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      const result = PathUtils.isValidPath("~/config.yml");
      expect(result).toBe(false);
    });
  });

  describe("resolveConfigPaths", () => {
    it("should resolve and filter valid paths", () => {
      mockExistsSync.mockImplementation((path) => {
        return path === resolve("/home/user", "config.yml") || path === resolve(process.cwd(), "local.yml");
      });
      mockStatSync.mockReturnValue({ isFile: () => true } as any);

      const result = PathUtils.resolveConfigPaths(["~/config.yml", "./local.yml", "~/nonexistent.yml"]);

      expect(result).toHaveLength(2);
      expect(result).toContain(resolve("/home/user", "config.yml"));
      expect(result).toContain(resolve(process.cwd(), "local.yml"));
    });

    it("should return empty array when no valid paths", () => {
      mockExistsSync.mockReturnValue(false);

      const result = PathUtils.resolveConfigPaths(["~/config.yml", "./local.yml"]);

      expect(result).toEqual([]);
    });

    it("should handle empty input", () => {
      const result = PathUtils.resolveConfigPaths([]);
      expect(result).toEqual([]);
    });
  });

  describe("getDefaultConfigPaths", () => {
    it("should return valid default config paths", () => {
      mockExistsSync.mockImplementation((path) => {
        return path === resolve(process.cwd(), "copima.yml");
      });
      mockStatSync.mockReturnValue({ isFile: () => true } as any);

      const result = PathUtils.getDefaultConfigPaths();

      expect(result).toContain(resolve(process.cwd(), "copima.yml"));
    });

    it("should return empty array when no default paths exist", () => {
      mockExistsSync.mockReturnValue(false);

      const result = PathUtils.getDefaultConfigPaths();

      expect(result).toEqual([]);
    });
  });

  describe("ensureDirectory", () => {
    it("should create directory recursively", () => {
      mockMkdirSync.mockImplementation(() => undefined);

      PathUtils.ensureDirectory("/path/to/file.yml");

      expect(mockMkdirSync).toHaveBeenCalledWith(resolve("/path/to"), { recursive: true });
    });

    it("should handle existing directory (EEXIST error)", () => {
      const error = new Error("Directory exists") as NodeJS.ErrnoException;
      error.code = "EEXIST";
      mockMkdirSync.mockImplementation(() => {
        throw error;
      });

      expect(() => PathUtils.ensureDirectory("/path/to/file.yml")).not.toThrow();
    });

    it("should throw non-EEXIST errors", () => {
      const error = new Error("Permission denied") as NodeJS.ErrnoException;
      error.code = "EACCES";
      mockMkdirSync.mockImplementation(() => {
        throw error;
      });

      expect(() => PathUtils.ensureDirectory("/path/to/file.yml")).toThrow("Permission denied");
    });

    it("should expand path before creating directory", () => {
      mockMkdirSync.mockImplementation(() => undefined);

      PathUtils.ensureDirectory("~/config/file.yml");

      expect(mockMkdirSync).toHaveBeenCalledWith(resolve("/home/user/config"), { recursive: true });
    });
  });

  describe("joinPaths", () => {
    it("should join multiple paths", () => {
      const result = PathUtils.joinPaths("path", "to", "file.yml");
      expect(result).toBe(join("path", "to", "file.yml"));
    });

    it("should join single path", () => {
      const result = PathUtils.joinPaths("file.yml");
      expect(result).toBe("file.yml");
    });

    it("should handle empty paths", () => {
      const result = PathUtils.joinPaths();
      expect(result).toBe(".");
    });
  });

  describe("isRelativePath", () => {
    it("should return true for relative paths", () => {
      expect(PathUtils.isRelativePath("config.yml")).toBe(true);
      expect(PathUtils.isRelativePath("./config.yml")).toBe(true);
      expect(PathUtils.isRelativePath("../config.yml")).toBe(true);
    });

    it("should return false for absolute paths", () => {
      expect(PathUtils.isRelativePath("/absolute/path")).toBe(false);
    });

    it("should return false for home paths", () => {
      expect(PathUtils.isRelativePath("~/config.yml")).toBe(false);
      expect(PathUtils.isRelativePath("$HOME/config.yml")).toBe(false);
    });
  });

  describe("makeRelative", () => {
    it("should make path relative to current directory", () => {
      const cwd = process.cwd();
      const absolutePath = join(cwd, "subdir", "file.yml");

      const result = PathUtils.makeRelative(absolutePath);

      expect(result).toBe(join("subdir", "file.yml"));
    });

    it("should make path relative to custom base", () => {
      const result = PathUtils.makeRelative("/home/user/project/file.yml", "/home/user");

      expect(result).toBe(join("project", "file.yml"));
    });

    it("should expand paths before making relative", () => {
      const cwd = process.cwd();
      const result = PathUtils.makeRelative("./file.yml", cwd);

      expect(result).toBe("file.yml");
    });

    it("should handle tilde paths", () => {
      const result = PathUtils.makeRelative("~/config.yml", "/home");

      expect(result).toBe(join("user", "config.yml"));
    });
  });
});
