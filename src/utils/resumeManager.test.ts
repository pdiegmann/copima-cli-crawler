// Import required modules
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import fs from "fs";
import yaml from "js-yaml";
import ResumeManager from "./resumeManager";

// Mock external dependencies
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));
jest.mock("js-yaml", () => ({
  load: jest.fn(),
  dump: jest.fn(),
}));
// Mock logger functions
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerDebug = jest.fn();

jest.mock("./logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  createLogger: jest.fn(() => ({
    info: mockLoggerInfo,
    error: mockLoggerError,
    warn: mockLoggerWarn,
    debug: mockLoggerDebug,
  })),
}));

describe("ResumeManager", () => {
  const mockFilePath = "/path/to/resume.yaml";
  let resumeManager: ResumeManager;

  beforeEach(() => {
    resumeManager = new ResumeManager(mockFilePath);
    jest.clearAllMocks();
  });

  describe("loadState", () => {
    it("should load state from file if it exists", () => {
      const mockFileContent = "key: value";
      const mockState = { key: "value" };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockFileContent);
      (yaml.load as jest.Mock).mockReturnValue(mockState);

      const state = resumeManager.loadState();

      expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);
      expect(fs.readFileSync).toHaveBeenCalledWith(mockFilePath, "utf8");
      expect(yaml.load).toHaveBeenCalledWith(mockFileContent);
      expect(mockLoggerInfo).toHaveBeenCalledWith("Resume state loaded successfully.");
      expect(state).toEqual(mockState);
    });

    it("should return an empty object if file does not exist", () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const state = resumeManager.loadState();

      expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);
      expect(mockLoggerWarn).toHaveBeenCalledWith("Resume file does not exist. Starting fresh.");
      expect(state).toEqual({});
    });

    it("should handle errors gracefully and return an empty object", () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("Read error");
      });

      const state = resumeManager.loadState();

      expect(mockLoggerError).toHaveBeenCalledWith("Failed to load resume state: Read error");
      expect(state).toEqual({});
    });
  });

  describe("saveState", () => {
    it("should save state to file", () => {
      const mockState = { key: "value" };
      const mockYamlData = "key: value";

      (yaml.dump as jest.Mock).mockReturnValue(mockYamlData);

      resumeManager.saveState(mockState);

      expect(yaml.dump).toHaveBeenCalledWith(mockState);
      expect(fs.writeFileSync).toHaveBeenCalledWith(mockFilePath, mockYamlData, "utf8");
      expect(mockLoggerInfo).toHaveBeenCalledWith("Resume state saved successfully.");
    });

    it("should handle errors gracefully when saving state", () => {
      const mockState = { key: "value" };

      (yaml.dump as jest.Mock).mockImplementation(() => {
        throw new Error("YAML error");
      });

      resumeManager.saveState(mockState);

      expect(mockLoggerError).toHaveBeenCalledWith("Failed to save resume state: YAML error");
    });
  });
});
