// src/utils/yamlProgressReporter.test.ts

import * as fs from "fs";
import * as path from "path";
import { createYAMLProgressReporter, YAMLProgressReporter } from "./yamlProgressReporter";

const TEST_FILE = path.join(__dirname, "__test_progress.yaml");

// Skip these tests in CI environments as they depend on file locking which is unreliable
const describeOrSkip = process.env["CI"] ? describe.skip : describe;

describeOrSkip("YAMLProgressReporter", () => {
  let reporter: YAMLProgressReporter;

  beforeEach(() => {
    reporter = createYAMLProgressReporter({
      enabled: true,
      filePath: TEST_FILE,
      updateInterval: 100,
      lockTimeout: 500,
      prettyFormat: false,
    });
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
  });

  afterEach(async () => {
    // Ensure all timers are stopped before test ends
    await reporter.stop();
    // Wait a tick to ensure all async logs/timers are flushed
    await new Promise((r) => setTimeout(r, 20));
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
  });

  it("should start and stop reporting", async () => {
    reporter.start();
    reporter.updateCurrentStep("Step 1");
    await new Promise((r) => setTimeout(r, 150));
    await reporter.stop();
    // Wait a tick to ensure all async logs/timers are flushed
    await new Promise((r) => setTimeout(r, 20));
    expect(fs.existsSync(TEST_FILE)).toBe(true);
    const content = fs.readFileSync(TEST_FILE, "utf8");
    expect(content.includes("Step 1")).toBe(true);
  });

  it("should update resource count and performance", async () => {
    reporter.start();
    reporter.updateResourceCount("users", { total: 5, processed: 3 });
    reporter.updatePerformanceMetrics({ requestsPerSecond: 10 });
    await reporter.forceWrite();
    await reporter.stop();
    await new Promise((r) => setTimeout(r, 20));
    const content = fs.readFileSync(TEST_FILE, "utf8");
    expect(content.includes("users")).toBe(true);
    expect(content.includes("requestsPerSecond")).toBe(true);
  });

  it("should add error and update estimated time", async () => {
    reporter.start();
    reporter.addError("step", "fail", false);
    reporter.updateEstimatedTimeRemaining(42);
    await reporter.forceWrite();
    await reporter.stop();
    await new Promise((r) => setTimeout(r, 20));
    const content = fs.readFileSync(TEST_FILE, "utf8");
    expect(content.includes("fail")).toBe(true);
    expect(content.includes("42")).toBe(true);
  });

  it("should set total steps and complete step", async () => {
    reporter.start();
    reporter.setTotalSteps(5);
    reporter.completeStep("step1");
    await reporter.forceWrite();
    await reporter.stop();
    await new Promise((r) => setTimeout(r, 20));
    const content = fs.readFileSync(TEST_FILE, "utf8");
    expect(content.includes("totalSteps")).toBe(true);
    expect(content.includes("completedSteps")).toBe(true);
  });

  it("should update config", async () => {
    reporter.updateConfig({ prettyFormat: true, updateInterval: 200 });
    expect(reporter.getConfig().prettyFormat).toBe(true);
    expect(reporter.getConfig().updateInterval).toBe(200);
  });

  it("should get current report", () => {
    const report = reporter.getCurrentReport();
    expect(report).toHaveProperty("metadata");
    expect(report).toHaveProperty("stats");
  });

  it("should not write if disabled", async () => {
    const disabled = createYAMLProgressReporter({ enabled: false, filePath: TEST_FILE });
    await disabled.forceWrite();
    expect(fs.existsSync(TEST_FILE)).toBe(false);
  });
});
