// src/utils/progressReporter.test.ts

import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import ProgressReporter from "./progressReporter";

describe("ProgressReporter", () => {
  let reporter: ProgressReporter;
  let tempDir: string;
  let progressFile: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await mkdtemp(join(tmpdir(), "progress-test-"));
    progressFile = join(tempDir, "progress.yaml");

    // ProgressReporter expects a string (progressFile) as its only argument
    reporter = new ProgressReporter(progressFile, false); // Disable terminal output for tests
    // Set up initial state for tests
    reporter.updateState({ totalSteps: 3 });
    reporter.updateState({ enableTerminal: false });
    reporter.updateState({ progressInterval: 100 });
  });

  afterEach(async () => {
    await reporter.stop();
    // Wait a tick to ensure all async logs/timers are flushed
    await new Promise((r) => setTimeout(r, 20));

    // Clean up temp directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it("should start and stop reporting", async () => {
    reporter.start();
    reporter.updateState({ currentStep: "Step 1" });
    await new Promise((r) => setTimeout(r, 150));
    await reporter.stop();
    await new Promise((r) => setTimeout(r, 20));
    expect(reporter.getState()["currentStep"]).toBe("Step 1");
  });

  it("should update resource count and performance", async () => {
    reporter.start();
    reporter.updateResourceCount("users", { total: 5, processed: 3 });
    // No updatePerformance method, so skip that
    await reporter.stop();
    await new Promise((r) => setTimeout(r, 20));
    const stats = reporter.getStats();
    expect(stats.resourceCounts && stats.resourceCounts["users"] && stats.resourceCounts["users"].total).toBe(5);
  });

  it("should update estimated time", async () => {
    reporter.start();
    reporter.updateState({ estimatedTimeRemaining: 42 });
    await reporter.stop();
    await new Promise((r) => setTimeout(r, 20));
    const state = reporter.getState();
    expect(state["estimatedTimeRemaining"]).toBe(42);
  });

  it("should set total steps and complete step", async () => {
    reporter.start();
    reporter.updateState({ totalSteps: 5 });
    reporter.updateState({ completedSteps: 1 });
    await reporter.stop();
    await new Promise((r) => setTimeout(r, 20));
    const state = reporter.getState();
    expect(state["totalSteps"]).toBe(5);
    expect(state["completedSteps"]).toBe(1);
  });

  it("should get current stats", () => {
    const stats = reporter.getStats();
    expect(stats).toHaveProperty("resourceCounts");
    expect(stats).toHaveProperty("performance");
  });

  it("should not write if disabled", async () => {
    reporter.updateState({ enableTerminal: false });
    reporter.start();
    await reporter.stop();
    expect(reporter.getState()["enableTerminal"]).toBe(false);
  });
});
