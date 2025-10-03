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
});
