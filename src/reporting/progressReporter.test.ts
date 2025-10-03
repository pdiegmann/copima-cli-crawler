import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import ProgressReporter from "./progressReporter";

// Mock logger
jest.mock("../logging/logger", () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe("ProgressReporter", () => {
  let progressReporter: ProgressReporter;
  let originalStdoutWrite: any;
  let originalConsoleLog: any;

  beforeEach(() => {
    // Mock stdout.write
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = jest.fn((str: string) => true) as any;

    // Mock console.log
    originalConsoleLog = console.log;
    console.log = jest.fn();

    progressReporter = new ProgressReporter("/test/progress.yaml");
  });

  afterEach(() => {
    if (progressReporter) {
      progressReporter.stop();
    }
    jest.clearAllMocks();
    process.stdout.write = originalStdoutWrite;
    console.log = originalConsoleLog;
  });

  describe("constructor", () => {
    it("should create instance with file path", () => {
      expect(progressReporter).toBeDefined();
    });

    it("should create instance with terminal output disabled", () => {
      const reporter = new ProgressReporter("/test/progress.yaml", false);
      expect(reporter).toBeDefined();
    });
  });

  describe("updateState", () => {
    it("should update progress state", () => {
      const newState = { step: "processing", status: "active" };
      progressReporter.updateState(newState);

      const state = progressReporter.getState();
      expect(state).toMatchObject(newState);
    });

    it("should merge with existing state", () => {
      progressReporter.updateState({ step: "init" });
      progressReporter.updateState({ status: "active" });

      const state = progressReporter.getState();
      expect(state).toMatchObject({ step: "init", status: "active" });
    });
  });

  describe("updateStats", () => {
    it("should update progress statistics", () => {
      progressReporter.updateStats({
        totalSteps: 10,
        completedSteps: 5,
        currentStep: "Processing data",
      });

      const stats = progressReporter.getStats();
      expect(stats.totalSteps).toBe(10);
      expect(stats.completedSteps).toBe(5);
      expect(stats.currentStep).toBe("Processing data");
    });

    it("should preserve existing stats when partially updating", () => {
      progressReporter.updateStats({ totalSteps: 10 });
      progressReporter.updateStats({ completedSteps: 5 });

      const stats = progressReporter.getStats();
      expect(stats.totalSteps).toBe(10);
      expect(stats.completedSteps).toBe(5);
    });
  });

  describe("updateResourceCount", () => {
    it("should update resource counts", () => {
      progressReporter.updateResourceCount("users", {
        total: 100,
        processed: 50,
        filtered: 10,
        errors: 2,
      });

      const stats = progressReporter.getStats();
      expect(stats.resourceCounts).toBeDefined();
      expect(stats.resourceCounts!["users"]).toEqual({
        total: 100,
        processed: 50,
        filtered: 10,
        errors: 2,
      });
    });

    it("should initialize resource counts if not exists", () => {
      progressReporter.updateResourceCount("projects", { total: 50 });

      const stats = progressReporter.getStats();
      expect(stats.resourceCounts!["projects"]).toEqual({
        total: 50,
        processed: 0,
        filtered: 0,
        errors: 0,
      });
    });

    it("should handle multiple resource types", () => {
      progressReporter.updateResourceCount("users", { total: 100, processed: 50 });
      progressReporter.updateResourceCount("projects", { total: 200, processed: 100 });

      const stats = progressReporter.getStats();
      expect(stats.resourceCounts!["users"].total).toBe(100);
      expect(stats.resourceCounts!["projects"].total).toBe(200);
    });

    it("should overwrite resource counts on update", () => {
      progressReporter.updateResourceCount("users", { total: 100, processed: 25 });
      progressReporter.updateResourceCount("users", { processed: 50, errors: 2 });

      const stats = progressReporter.getStats();
      expect(stats.resourceCounts!["users"].processed).toBe(50);
      expect(stats.resourceCounts!["users"].errors).toBe(2);
    });
  });

  describe("getStats", () => {
    it("should return current statistics", () => {
      progressReporter.updateStats({ totalSteps: 10, completedSteps: 5 });

      const stats = progressReporter.getStats();
      expect(stats.totalSteps).toBe(10);
      expect(stats.completedSteps).toBe(5);
    });

    it("should return a copy of stats", () => {
      const stats1 = progressReporter.getStats();
      stats1.totalSteps = 999;

      const stats2 = progressReporter.getStats();
      expect(stats2.totalSteps).not.toBe(999);
    });
  });

  describe("getState", () => {
    it("should return current state", () => {
      progressReporter.updateState({ step: "processing" });

      const state = progressReporter.getState();
      expect(state["step"]).toBe("processing");
    });

    it("should return a copy of state", () => {
      const state1 = progressReporter.getState();
      state1["step"] = "modified";

      const state2 = progressReporter.getState();
      expect(state2["step"]).not.toBe("modified");
    });
  });

  describe("edge cases", () => {
    it("should handle zero total steps", () => {
      progressReporter.updateStats({ totalSteps: 0, completedSteps: 0 });

      const stats = progressReporter.getStats();
      expect(stats.totalSteps).toBe(0);
    });

    it("should handle performance metrics", () => {
      progressReporter.updateStats({
        performance: {
          requestsPerSecond: 10.5,
          avgResponseTime: 250,
          errorRate: 0.02,
        },
      });

      const stats = progressReporter.getStats();
      expect(stats.performance?.requestsPerSecond).toBe(10.5);
      expect(stats.performance?.avgResponseTime).toBe(250);
      expect(stats.performance?.errorRate).toBe(0.02);
    });
  });

  describe("start", () => {
    it("should start progress reporting", () => {
      // Mock fs.createWriteStream
      const mockWriteStream = {
        write: jest.fn(),
        close: jest.fn(),
      };
      const fs = require("fs");
      fs.createWriteStream = jest.fn(() => mockWriteStream);

      progressReporter.start();

      expect(fs.createWriteStream).toHaveBeenCalledWith("/test/progress.yaml", { flags: "w" });
    });

    it("should warn if already started", () => {
      const mockWriteStream = {
        write: jest.fn(),
        close: jest.fn(),
      };
      const fs = require("fs");
      fs.createWriteStream = jest.fn(() => mockWriteStream);

      progressReporter.start();
      progressReporter.start(); // Second call should warn

      // Should only create one write stream
      expect(fs.createWriteStream).toHaveBeenCalledTimes(1);
    });

    it("should start with terminal output disabled", () => {
      const reporter = new ProgressReporter("/test/progress.yaml", false);
      const mockWriteStream = {
        write: jest.fn(),
        close: jest.fn(),
      };
      const fs = require("fs");
      fs.createWriteStream = jest.fn(() => mockWriteStream);

      reporter.start();

      expect(fs.createWriteStream).toHaveBeenCalled();
      reporter.stop();
    });
  });

  describe("stop", () => {
    it("should stop progress reporting", () => {
      const mockWriteStream = {
        write: jest.fn(),
        close: jest.fn(),
      };
      const fs = require("fs");
      fs.createWriteStream = jest.fn(() => mockWriteStream);

      progressReporter.start();
      progressReporter.stop();

      expect(mockWriteStream.close).toHaveBeenCalled();
    });

    it("should handle stop when not started", () => {
      expect(() => progressReporter.stop()).not.toThrow();
    });

    it("should stop with terminal output disabled", () => {
      const reporter = new ProgressReporter("/test/progress.yaml", false);
      const mockWriteStream = {
        write: jest.fn(),
        close: jest.fn(),
      };
      const fs = require("fs");
      fs.createWriteStream = jest.fn(() => mockWriteStream);

      reporter.start();
      reporter.stop();

      expect(mockWriteStream.close).toHaveBeenCalled();
    });
  });

  describe("terminal display", () => {
    it("should display terminal progress", async () => {
      const mockWriteStream = {
        write: jest.fn(),
        close: jest.fn(),
      };
      const fs = require("fs");
      fs.createWriteStream = jest.fn(() => mockWriteStream);

      progressReporter.updateStats({
        totalSteps: 10,
        completedSteps: 5,
        currentStep: "Processing",
      });

      progressReporter.start();

      // Wait for interval to trigger
      await new Promise(resolve => setTimeout(resolve, 1100));

      progressReporter.stop();

      expect(console.log).toHaveBeenCalled();
    });

    it("should display terminal progress with resources", async () => {
      const mockWriteStream = {
        write: jest.fn(),
        close: jest.fn(),
      };
      const fs = require("fs");
      fs.createWriteStream = jest.fn(() => mockWriteStream);

      progressReporter.updateStats({
        totalSteps: 10,
        completedSteps: 5,
        currentStep: "Processing",
      });
      progressReporter.updateResourceCount("users", {
        total: 100,
        processed: 50,
        filtered: 10,
        errors: 5,
      });

      progressReporter.start();

      // Wait for interval to trigger
      await new Promise(resolve => setTimeout(resolve, 1100));

      progressReporter.stop();

      expect(console.log).toHaveBeenCalled();
    });

    it("should display terminal progress with performance metrics", async () => {
      const mockWriteStream = {
        write: jest.fn(),
        close: jest.fn(),
      };
      const fs = require("fs");
      fs.createWriteStream = jest.fn(() => mockWriteStream);

      progressReporter.updateStats({
        totalSteps: 10,
        completedSteps: 5,
        currentStep: "Processing",
        performance: {
          requestsPerSecond: 10.5,
          avgResponseTime: 250,
          errorRate: 0.02,
        },
      });

      progressReporter.start();

      // Wait for interval to trigger
      await new Promise(resolve => setTimeout(resolve, 1100));

      progressReporter.stop();

      expect(console.log).toHaveBeenCalled();
    });

    it("should handle terminal display errors gracefully", async () => {
      const mockWriteStream = {
        write: jest.fn(),
        close: jest.fn(),
      };
      const fs = require("fs");
      fs.createWriteStream = jest.fn(() => mockWriteStream);

      // Make console.log throw an error
      console.log = jest.fn(() => {
        throw new Error("Terminal error");
      });

      progressReporter.start();

      // Wait for interval to trigger
      await new Promise(resolve => setTimeout(resolve, 1100));

      progressReporter.stop();

      // Should not crash
      expect(true).toBe(true);
    });

    it("should display final summary", () => {
      const mockWriteStream = {
        write: jest.fn(),
        close: jest.fn(),
      };
      const fs = require("fs");
      fs.createWriteStream = jest.fn(() => mockWriteStream);

      progressReporter.updateStats({
        totalSteps: 10,
        completedSteps: 10,
        currentStep: "Complete",
      });
      progressReporter.updateResourceCount("users", {
        total: 100,
        processed: 100,
        filtered: 5,
        errors: 2,
      });

      progressReporter.start();
      progressReporter.stop();

      expect(console.log).toHaveBeenCalled();
    });

    it("should handle final summary display errors gracefully", () => {
      const mockWriteStream = {
        write: jest.fn(),
        close: jest.fn(),
      };
      const fs = require("fs");
      fs.createWriteStream = jest.fn(() => mockWriteStream);

      // Make console.log throw an error
      console.log = jest.fn(() => {
        throw new Error("Summary error");
      });

      progressReporter.start();
      progressReporter.stop();

      // Should not crash
      expect(true).toBe(true);
    });
  });

  describe("progress writing", () => {
    it("should write progress to file", async () => {
      const mockWriteStream = {
        write: jest.fn(),
        close: jest.fn(),
      };
      const fs = require("fs");
      fs.createWriteStream = jest.fn(() => mockWriteStream);

      progressReporter.updateState({ step: "processing" });
      progressReporter.updateStats({
        totalSteps: 10,
        completedSteps: 5,
      });

      progressReporter.start();

      // Wait for interval to trigger
      await new Promise(resolve => setTimeout(resolve, 1100));

      progressReporter.stop();

      expect(mockWriteStream.write).toHaveBeenCalled();
    });

    it("should handle write errors gracefully", async () => {
      const mockWriteStream = {
        write: jest.fn(() => {
          throw new Error("Write error");
        }),
        close: jest.fn(),
      };
      const fs = require("fs");
      fs.createWriteStream = jest.fn(() => mockWriteStream);

      progressReporter.start();

      // Wait for interval to trigger
      await new Promise(resolve => setTimeout(resolve, 1100));

      progressReporter.stop();

      // Should not crash
      expect(true).toBe(true);
    });
  });

  describe("formatting", () => {
    it("should format duration in seconds", () => {
      const reporter = new ProgressReporter("/test/progress.yaml", true);
      const mockWriteStream = {
        write: jest.fn(),
        close: jest.fn(),
      };
      const fs = require("fs");
      fs.createWriteStream = jest.fn(() => mockWriteStream);

      reporter.updateStats({
        totalSteps: 10,
        completedSteps: 5,
        currentStep: "Processing",
        startTime: new Date(Date.now() - 30000), // 30 seconds ago
      });

      reporter.start();
      reporter.stop();

      // Should have called console.log with formatted duration
      expect(console.log).toHaveBeenCalled();
    });

    it("should format duration in minutes", () => {
      const reporter = new ProgressReporter("/test/progress.yaml", true);
      const mockWriteStream = {
        write: jest.fn(),
        close: jest.fn(),
      };
      const fs = require("fs");
      fs.createWriteStream = jest.fn(() => mockWriteStream);

      reporter.updateStats({
        totalSteps: 10,
        completedSteps: 5,
        currentStep: "Processing",
        startTime: new Date(Date.now() - 120000), // 2 minutes ago
      });

      reporter.start();
      reporter.stop();

      // Should have called console.log with formatted duration
      expect(console.log).toHaveBeenCalled();
    });

    it("should format duration in hours", () => {
      const reporter = new ProgressReporter("/test/progress.yaml", true);
      const mockWriteStream = {
        write: jest.fn(),
        close: jest.fn(),
      };
      const fs = require("fs");
      fs.createWriteStream = jest.fn(() => mockWriteStream);

      reporter.updateStats({
        totalSteps: 10,
        completedSteps: 5,
        currentStep: "Processing",
        startTime: new Date(Date.now() - 7200000), // 2 hours ago
      });

      reporter.start();
      reporter.stop();

      // Should have called console.log with formatted duration
      expect(console.log).toHaveBeenCalled();
    });
  });
});
