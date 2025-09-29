// Import required modules
import fs from "fs";
import yaml from "js-yaml";
import pc from "picocolors";
import { createLogger } from "../logging/logger";

const logger = createLogger("ProgressReporter");

type ProgressState = {
  [key: string]: any;
};

type ProgressStats = {
  totalSteps: number;
  completedSteps: number;
  currentStep: string;
  startTime: Date;
  lastUpdate: Date;
  resourceCounts?: {
    [resourceType: string]: {
      total: number;
      processed: number;
      filtered: number;
      errors: number;
    };
  };
  performance?: {
    requestsPerSecond: number;
    avgResponseTime: number;
    errorRate: number;
  };
};

class ProgressReporter {
  private readonly filePath: string;
  private intervalId: NodeJS.Timeout | null = null;
  private state: ProgressState = {};
  private stats: ProgressStats = {
    totalSteps: 0,
    completedSteps: 0,
    currentStep: "Initializing...",
    startTime: new Date(),
    lastUpdate: new Date(),
    resourceCounts: {},
    performance: {
      requestsPerSecond: 0,
      avgResponseTime: 0,
      errorRate: 0,
    },
  };
  private writeStream: fs.WriteStream | null = null;
  private readonly enableTerminalOutput: boolean = true;

  constructor(filePath: string, enableTerminalOutput: boolean = true) {
    this.filePath = filePath;
    this.enableTerminalOutput = enableTerminalOutput;
  }

  // Start progress reporting
  start(): void {
    if (this.intervalId) {
      logger.warn("Progress reporting is already running.");
      return;
    }

    this.writeStream = fs.createWriteStream(this.filePath, { flags: "w" });
    this.intervalId = setInterval(() => {
      this.writeProgress();
      if (this.enableTerminalOutput) {
        this.displayTerminalProgress();
      }
    }, 1000);

    logger.info("Progress reporting started.");
  }

  // Stop progress reporting
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.writeStream) {
      this.writeStream.close();
      this.writeStream = null;
    }

    if (this.enableTerminalOutput) {
      this.displayFinalSummary();
    }

    logger.info("Progress reporting stopped.");
  }

  // Update the progress state
  updateState(newState: ProgressState): void {
    this.state = { ...this.state, ...newState };
    this.stats.lastUpdate = new Date();
  }

  // Update progress statistics
  updateStats(updates: Partial<ProgressStats>): void {
    this.stats = { ...this.stats, ...updates, lastUpdate: new Date() };
  }

  // Update resource count for a specific type
  updateResourceCount(
    resourceType: string,
    updates: Partial<{
      total: number;
      processed: number;
      filtered: number;
      errors: number;
    }>
  ): void {
    this.stats.resourceCounts ??= {};

    this.stats.resourceCounts[resourceType] = {
      ...this.stats.resourceCounts[resourceType],
      total: 0,
      processed: 0,
      filtered: 0,
      errors: 0,
      ...updates,
    };
    this.stats.lastUpdate = new Date();
  }

  // Write progress to the YAML file
  private writeProgress(): void {
    if (!this.writeStream) {
      logger.error("Write stream is not initialized.");
      return;
    }

    try {
      const combinedState = {
        ...this.state,
        stats: this.stats,
        timestamp: new Date().toISOString(),
      };
      const yamlData = yaml.dump(combinedState);

      // Clear the file and write new content
      this.writeStream.write("");
      this.writeStream.write(yamlData);
    } catch (error) {
      logger.error(`Failed to write progress: ${(error as Error).message}`);
    }
  }

  // Display formatted progress in terminal
  private displayTerminalProgress(): void {
    try {
      // Clear previous lines and move cursor up
      process.stdout.write("\x1b[2K\r"); // Clear current line

      const { completedSteps, totalSteps, currentStep } = this.stats;
      const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      // Create progress bar
      const barWidth = 30;
      const filledWidth = Math.round((percentage / 100) * barWidth);
      const emptyWidth = barWidth - filledWidth;
      const progressBar = pc.green("█".repeat(filledWidth)) + pc.gray("░".repeat(emptyWidth));

      // Format elapsed time
      const elapsed = Date.now() - this.stats.startTime.getTime();
      const elapsedString = this.formatDuration(elapsed);

      // Estimate remaining time
      const estimatedTotal = percentage > 0 ? (elapsed / percentage) * 100 : 0;
      const remaining = Math.max(0, estimatedTotal - elapsed);
      const remainingString = this.formatDuration(remaining);

      // Main progress line
      const percentageText = `${percentage}%`;
      const progressLine = `${pc.cyan("Progress:")} [${progressBar}] ${pc.bold(percentageText)} (${completedSteps}/${totalSteps})`;
      const timeLine = `${pc.yellow("Time:")} ${elapsedString} elapsed, ~${remainingString} remaining`;
      const stepLine = `${pc.magenta("Current:")} ${currentStep}`;

      console.log(progressLine);
      console.log(timeLine);
      console.log(stepLine);

      // Display resource counts if available
      if (this.stats.resourceCounts && Object.keys(this.stats.resourceCounts).length > 0) {
        console.log(pc.blue("Resources:"));
        Object.entries(this.stats.resourceCounts).forEach(([type, counts]) => {
          const resourcePercentage = counts.total > 0 ? Math.round((counts.processed / counts.total) * 100) : 0;
          const statusColor = counts.errors > 0 ? pc.red : pc.green;
          const statusText = `${counts.processed}/${counts.total}`;
          console.log(`  ${type}: ${statusColor(statusText)} (${resourcePercentage}%)`);
          if (counts.errors > 0) {
            const errorText = `Errors: ${counts.errors}`;
            console.log(`    ${pc.red(errorText)}`);
          }
          if (counts.filtered > 0) {
            const filteredText = `Filtered: ${counts.filtered}`;
            console.log(`    ${pc.yellow(filteredText)}`);
          }
        });
      }

      // Display performance metrics if available
      if (this.stats.performance && this.stats.performance.requestsPerSecond > 0) {
        const perfLine = `${pc.green("Performance:")} ${this.stats.performance.requestsPerSecond.toFixed(1)} req/s, ${this.stats.performance.avgResponseTime.toFixed(0)}ms avg, ${(this.stats.performance.errorRate * 100).toFixed(1)}% errors`;
        console.log(perfLine);
      }

      // Move cursor up to overwrite next time
      process.stdout.write(`\x1b[${this.getDisplayLineCount()}A`);
    } catch (error) {
      // If terminal display fails, don't crash the application
      logger.debug("Terminal progress display failed:", error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) });
    }
  }

  // Display final summary when stopping
  private displayFinalSummary(): void {
    try {
      // Move cursor down to avoid overwriting
      process.stdout.write(`\x1b[${this.getDisplayLineCount()}B`);

      const totalTime = Date.now() - this.stats.startTime.getTime();
      const totalTimeString = this.formatDuration(totalTime);

      console.log(`\n${pc.bold(pc.green("═══ Crawling Summary ═══"))}`);
      console.log(`${pc.cyan("Total Time:")} ${totalTimeString}`);
      console.log(`${pc.cyan("Steps Completed:")} ${this.stats.completedSteps}/${this.stats.totalSteps}`);

      if (this.stats.resourceCounts) {
        console.log(`${pc.cyan("Resources Processed:")}`);
        Object.entries(this.stats.resourceCounts).forEach(([type, counts]) => {
          console.log(`  ${type}: ${counts.processed} processed, ${counts.errors} errors, ${counts.filtered} filtered`);
        });
      }

      console.log(pc.bold(pc.green("═══════════════════════")));
    } catch (error) {
      logger.debug("Final summary display failed:", error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) });
    }
  }

  // Get the number of lines the progress display uses
  private getDisplayLineCount(): number {
    let lines = 3; // Progress, time, current step

    if (this.stats.resourceCounts) {
      lines += 1; // "Resources:" header
      Object.keys(this.stats.resourceCounts).forEach(() => {
        lines += 1; // Each resource type
        // Additional lines for errors/filtered counts are handled separately
      });
    }

    if (this.stats.performance && this.stats.performance.requestsPerSecond > 0) {
      lines += 1; // Performance line
    }

    return lines;
  }

  // Format duration in milliseconds to human-readable string
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Get current progress statistics
  getStats(): ProgressStats {
    return { ...this.stats };
  }

  // Get current state
  getState(): ProgressState {
    return { ...this.state };
  }
}

export default ProgressReporter;
