// Import necessary modules
import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import fs from "fs";
import yaml from "js-yaml";
import ProgressReporter from "./progressReporter";

// Mock fs and js-yaml
jest.mock("fs", () => ({
  createWriteStream: jest.fn(),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));
jest.mock("js-yaml", () => ({
  dump: jest.fn(),
  load: jest.fn(),
}));
jest.mock("./logger", () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
    createLogger: jest.fn(() => mockLogger),
  };
});

// Access the mocked logger instance for tests
const { createLogger } = jest.requireMock("./logger") as { createLogger: jest.Mock };
const loggerMocks = createLogger() as {
  info: jest.Mock;
  error: jest.Mock;
  warn: jest.Mock;
  debug: jest.Mock;
};

describe("ProgressReporter", () => {
  const mockFilePath = "mockProgress.yaml";
  let progressReporter: ProgressReporter;

  beforeEach(() => {
    jest.clearAllMocks();
    progressReporter = new ProgressReporter(mockFilePath);
  });

  test("start() initializes progress reporting", () => {
    const mockWriteStream = { write: jest.fn(), close: jest.fn() };
    (fs.createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);

    progressReporter.start();

    expect(fs.createWriteStream).toHaveBeenCalledWith(mockFilePath, {
      flags: "w",
    });
    expect(loggerMocks.info).toHaveBeenCalledWith("Progress reporting started.");
  });

  test("stop() stops progress reporting", () => {
    const mockWriteStream = { write: jest.fn(), close: jest.fn() };
    (fs.createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);

    progressReporter.start();
    progressReporter.stop();

    expect(mockWriteStream.close).toHaveBeenCalled();
    expect(loggerMocks.info).toHaveBeenCalledWith("Progress reporting stopped.");
  });

  test("updateState() updates the progress state", () => {
    const newState = { progress: 50 };
    progressReporter.updateState(newState);

    expect(progressReporter["state"]).toEqual(newState);
  });

  test("writeProgress() writes progress to YAML file", () => {
    const mockWriteStream = { write: jest.fn(), close: jest.fn() };
    (fs.createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
    (yaml.dump as jest.Mock).mockReturnValue("mockYamlData");

    progressReporter.start();
    progressReporter.updateState({ progress: 50 });
    progressReporter["writeProgress"]();

    expect(yaml.dump).toHaveBeenCalledWith(expect.objectContaining({
      progress: 50,
      stats: expect.any(Object),
      timestamp: expect.any(String)
    }));
    expect(mockWriteStream.write).toHaveBeenCalledWith("");
    expect(mockWriteStream.write).toHaveBeenCalledWith("mockYamlData");
  });

  test("writeProgress() logs error if write fails", () => {
    const mockWriteStream = {
      write: jest.fn(() => {
        throw new Error("Write error");
      }),
      close: jest.fn(),
    };
    (fs.createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);

    progressReporter.start();
    progressReporter["writeProgress"]();

    expect(loggerMocks.error).toHaveBeenCalledWith("Failed to write progress: Write error");
  });
});
