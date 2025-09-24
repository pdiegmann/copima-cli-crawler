// Import necessary modules
import fs from "fs";
import yaml from "js-yaml";
import logger from "./logger";
import ProgressReporter from "./progressReporter";

// Mock dependencies
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
jest.mock("./logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

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
    expect(logger.info).toHaveBeenCalledWith("Progress reporting started.");
  });

  test("stop() stops progress reporting", () => {
    const mockWriteStream = { write: jest.fn(), close: jest.fn() };
    (fs.createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);

    progressReporter.start();
    progressReporter.stop();

    expect(mockWriteStream.close).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("Progress reporting stopped.");
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

    expect(yaml.dump).toHaveBeenCalledWith({ progress: 50 });
    expect(mockWriteStream.write).toHaveBeenCalledWith("mockYamlData\n");
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

    expect(logger.error).toHaveBeenCalledWith("Failed to write progress: Write error");
  });
});
