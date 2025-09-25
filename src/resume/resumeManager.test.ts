// Import required modules
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Create mock functions
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockYamlLoad = jest.fn();
const mockYamlDump = jest.fn();

// Mock logger functions
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerDebug = jest.fn();

// Mock external dependencies before importing - using both named and default exports to cover all import styles
jest.mock("fs", () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
  },
}));

jest.mock("js-yaml", () => ({
  load: mockYamlLoad,
  dump: mockYamlDump,
  default: {
    load: mockYamlLoad,
    dump: mockYamlDump,
  },
}));

jest.mock("../logging", () => ({
  createLogger: jest.fn(() => ({
    info: mockLoggerInfo,
    error: mockLoggerError,
    warn: mockLoggerWarn,
    debug: mockLoggerDebug,
  })),
}));

// Import after mocking
import ResumeManager from "./resumeManager";

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

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockFileContent);
      mockYamlLoad.mockReturnValue(mockState);

      const state = resumeManager.loadState();

      expect(mockExistsSync).toHaveBeenCalledWith(mockFilePath);
      expect(mockReadFileSync).toHaveBeenCalledWith(mockFilePath, "utf8");
      expect(mockYamlLoad).toHaveBeenCalledWith(mockFileContent);
      expect(mockLoggerInfo).toHaveBeenCalledWith("Resume state loaded successfully.");
      expect(state).toEqual(mockState);
    });

    it("should return an empty object if file does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const state = resumeManager.loadState();

      expect(mockExistsSync).toHaveBeenCalledWith(mockFilePath);
      expect(mockLoggerWarn).toHaveBeenCalledWith("Resume file does not exist. Starting fresh.");
      expect(state).toEqual({});
    });

    it("should handle errors gracefully and return an empty object", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
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

      mockYamlDump.mockReturnValue(mockYamlData);

      resumeManager.saveState(mockState);

      expect(mockYamlDump).toHaveBeenCalledWith(mockState);
      expect(mockWriteFileSync).toHaveBeenCalledWith(mockFilePath, mockYamlData, "utf8");
      expect(mockLoggerInfo).toHaveBeenCalledWith("Resume state saved successfully.");
    });

    it("should handle errors gracefully when saving state", () => {
      const mockState = { key: "value" };

      mockYamlDump.mockImplementation(() => {
        throw new Error("YAML error");
      });

      resumeManager.saveState(mockState);

      expect(mockLoggerError).toHaveBeenCalledWith("Failed to save resume state: YAML error");
    });
  });
});
