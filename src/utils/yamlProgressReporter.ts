import { writeFile } from "fs/promises";
import { dump } from "js-yaml";
import type { PerformanceMetrics, ResourceCount, YAMLProgressReport } from "../types/api.js";
import { FileLocker } from "./fileLocker.js";
import { createLogger } from "./logger.js";

const logger = createLogger("YAMLProgressReporter");

export type YAMLProgressConfig = {
  enabled: boolean;
  filePath: string;
  updateInterval: number; // milliseconds
  lockTimeout: number; // milliseconds
  prettyFormat: boolean;
};

export class YAMLProgressReporter {
  private config: YAMLProgressConfig;
  private currentReport: YAMLProgressReport;
  private updateTimer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: YAMLProgressConfig) {
    this.config = config;
    this.currentReport = this.createInitialReport();
  }

  /**
   * Start progress reporting
   */
  start(): void {
    if (!this.config.enabled) {
      logger.debug("YAML progress reporting is disabled");
      return;
    }

    if (this.isRunning) {
      logger.warn("YAML progress reporting already running");
      return;
    }

    this.isRunning = true;
    this.currentReport = this.createInitialReport();

    // Start periodic updates
    this.updateTimer = setInterval(async () => {
      try {
        await this.writeProgressFile();
      } catch (error) {
        logger.error("Failed to write periodic progress update", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, this.config.updateInterval);

    logger.info("YAML progress reporting started", {
      filePath: this.config.filePath,
      updateInterval: this.config.updateInterval,
    });
  }

  /**
   * Stop progress reporting
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    // Write final report
    try {
      await this.writeProgressFile();
      logger.info("YAML progress reporting stopped");
    } catch (error) {
      logger.error("Failed to write final progress report", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update the current step
   */
  updateCurrentStep(stepName: string): void {
    this.currentReport.metadata.currentStep = stepName;
    this.currentReport.metadata.lastUpdate = new Date();
    this.currentReport.stats.currentStep = stepName;
    this.currentReport.stats.lastUpdate = new Date();
  }

  /**
   * Mark a step as completed
   */
  completeStep(stepName: string): void {
    this.currentReport.metadata.completedSteps += 1;
    this.currentReport.metadata.lastUpdate = new Date();
    this.currentReport.stats.completedSteps += 1;
    this.currentReport.stats.lastUpdate = new Date();

    logger.debug("Step completed", { stepName, completedSteps: this.currentReport.metadata.completedSteps });
  }

  /**
   * Update resource counts
   */
  updateResourceCount(resourceType: string, counts: Partial<ResourceCount>): void {
    if (!this.currentReport.resources[resourceType]) {
      this.currentReport.resources[resourceType] = {
        total: 0,
        processed: 0,
        filtered: 0,
        errors: 0,
      };
    }

    Object.assign(this.currentReport.resources[resourceType], counts);

    // Also update stats.resourceCounts for backward compatibility
    if (!this.currentReport.stats.resourceCounts[resourceType]) {
      this.currentReport.stats.resourceCounts[resourceType] = {
        total: 0,
        processed: 0,
        filtered: 0,
        errors: 0,
      };
    }

    Object.assign(this.currentReport.stats.resourceCounts[resourceType], counts);

    this.currentReport.metadata.lastUpdate = new Date();
    this.currentReport.stats.lastUpdate = new Date();
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(metrics: Partial<PerformanceMetrics>): void {
    Object.assign(this.currentReport.performance, metrics);
    Object.assign(this.currentReport.stats.performance, metrics);

    this.currentReport.metadata.lastUpdate = new Date();
    this.currentReport.stats.lastUpdate = new Date();
  }

  /**
   * Add an error to the report
   */
  addError(step: string, message: string, recoverable: boolean = true): void {
    this.currentReport.errors.push({
      timestamp: new Date(),
      step,
      message,
      recoverable,
    });

    // Keep only last 50 errors to prevent unbounded growth
    if (this.currentReport.errors.length > 50) {
      this.currentReport.errors = this.currentReport.errors.slice(-50);
    }

    this.currentReport.metadata.lastUpdate = new Date();
    this.currentReport.stats.lastUpdate = new Date();

    logger.debug("Error added to progress report", { step, message, recoverable });
  }

  /**
   * Get current progress report
   */
  getCurrentReport(): YAMLProgressReport {
    return { ...this.currentReport };
  }

  /**
   * Force write progress file immediately
   */
  async forceWrite(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    await this.writeProgressFile();
  }

  /**
   * Update estimated time remaining
   */
  updateEstimatedTimeRemaining(estimatedSeconds: number): void {
    this.currentReport.metadata.estimatedTimeRemaining = estimatedSeconds;
    this.currentReport.metadata.lastUpdate = new Date();
  }

  /**
   * Set total steps count
   */
  setTotalSteps(totalSteps: number): void {
    this.currentReport.metadata.totalSteps = totalSteps;
    this.currentReport.stats.totalSteps = totalSteps;
  }

  /**
   * Create initial progress report structure
   */
  private createInitialReport(): YAMLProgressReport {
    const now = new Date();

    return {
      metadata: {
        startTime: now,
        lastUpdate: now,
        currentStep: "Initializing...",
        completedSteps: 0,
        totalSteps: 0,
      },
      stats: {
        startTime: now,
        lastUpdate: now,
        currentStep: "Initializing...",
        completedSteps: 0,
        totalSteps: 0,
        resourceCounts: {},
        performance: {
          requestsPerSecond: 0,
          avgResponseTime: 0,
          errorRate: 0,
        },
      },
      performance: {
        requestsPerSecond: 0,
        avgResponseTime: 0,
        errorRate: 0,
      },
      resources: {},
      errors: [],
    };
  }

  /**
   * Write progress report to YAML file with file locking
   */
  private async writeProgressFile(): Promise<void> {
    try {
      await FileLocker.withLock(this.config.filePath, async () => {
        // Prepare data for YAML serialization (convert Dates to ISO strings)
        const reportForYAML = this.prepareForYAML(this.currentReport);

        const yamlOptions = {
          indent: this.config.prettyFormat ? 2 : 0,
          lineWidth: this.config.prettyFormat ? 80 : -1,
          noRefs: true,
          sortKeys: true,
        };

        const yamlContent = dump(reportForYAML, yamlOptions);

        await writeFile(this.config.filePath, yamlContent, "utf8");

        logger.debug("Progress report written to YAML file", {
          filePath: this.config.filePath,
          size: yamlContent.length,
        });
      });
    } catch (error) {
      logger.error("Failed to write YAML progress report", {
        filePath: this.config.filePath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Prepare report data for YAML serialization
   */
  private prepareForYAML(report: YAMLProgressReport): any {
    return {
      metadata: {
        ...report.metadata,
        startTime: report.metadata.startTime.toISOString(),
        lastUpdate: report.metadata.lastUpdate.toISOString(),
      },
      stats: {
        ...report.stats,
        startTime: report.stats.startTime.toISOString(),
        lastUpdate: report.stats.lastUpdate.toISOString(),
      },
      performance: report.performance,
      resources: report.resources,
      errors: report.errors.map((error) => ({
        ...error,
        timestamp: error.timestamp.toISOString(),
      })),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<YAMLProgressConfig>): void {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...newConfig };

    if (wasRunning && this.config.enabled) {
      this.start();
    }

    logger.info("YAML progress reporter configuration updated", {
      enabled: this.config.enabled,
      filePath: this.config.filePath,
      updateInterval: this.config.updateInterval,
    });
  }

  /**
   * Check if reporter is running
   */
  isReporterRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get current configuration
   */
  getConfig(): YAMLProgressConfig {
    return { ...this.config };
  }
}

/**
 * Create YAML progress reporter with default configuration
 */
export const createYAMLProgressReporter = (config: Partial<YAMLProgressConfig> = {}): YAMLProgressReporter => {
  const defaultConfig: YAMLProgressConfig = {
    enabled: true,
    filePath: "./progress.yaml",
    updateInterval: 1000, // 1 second
    lockTimeout: 5000, // 5 seconds
    prettyFormat: true,
    ...config,
  };

  return new YAMLProgressReporter(defaultConfig);
};
