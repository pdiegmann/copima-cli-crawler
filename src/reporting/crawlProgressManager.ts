/**
 * Enhanced progress manager for GitLab crawler using cli-progress
 * Provides real-time visual feedback with multi-bar support
 */

import cliProgress from "cli-progress";
import pc from "picocolors";
import { createLogger } from "../logging/logger";

const logger = createLogger("CrawlProgress");

type StepPhase = "fetching" | "processing" | "storing" | "completed";

type StepProgress = {
  name: string;
  phase: StepPhase;
  current: number;
  total: number;
  bar?: cliProgress.SingleBar;
};

type CrawlProgressOptions = {
  /** Enable terminal progress bars (default: true) */
  enableBars?: boolean;
  /** Update interval in milliseconds (default: 100) */
  updateInterval?: number;
  /** Show detailed resource breakdown (default: true) */
  showDetails?: boolean;
};

export class CrawlProgressManager {
  private multibar: cliProgress.MultiBar;
  private steps: Map<string, StepProgress>;
  private startTime: number;
  private readonly options: Required<CrawlProgressOptions>;
  private updateTimer?: NodeJS.Timeout;
  private lastLogTime: number = 0;
  private readonly logThrottleMs = 2000; // Log every 2 seconds max

  constructor(options: CrawlProgressOptions = {}) {
    this.options = {
      enableBars: options.enableBars ?? true,
      updateInterval: options.updateInterval ?? 100,
      showDetails: options.showDetails ?? true,
    };

    this.steps = new Map();
    this.startTime = Date.now();

    // Create multi-bar container with custom format
    this.multibar = new cliProgress.MultiBar(
      {
        clearOnComplete: false,
        hideCursor: true,
        format: this.formatBar.bind(this),
        barCompleteChar: "█",
        barIncompleteChar: "░",
        fps: 10,
      },
      cliProgress.Presets.shades_classic
    );

    if (!this.options.enableBars) {
      logger.info("Progress bars disabled, using log-based progress reporting");
    }
  }

  /**
   * Start a new step in the crawl process
   */
  startStep(stepName: string, phase: StepPhase = "fetching", total: number = 0): void {
    const step: StepProgress = {
      name: stepName,
      phase,
      current: 0,
      total,
      bar: undefined,
    };

    if (this.options.enableBars && total > 0) {
      step.bar = this.multibar.create(total, 0, {
        step: stepName,
        phase: this.getPhaseLabel(phase),
      });
    }

    this.steps.set(stepName, step);
    logger.info(`Started step: ${stepName} (${phase}, total: ${total})`);
  }

  /**
   * Update step progress
   */
  updateStep(stepName: string, current: number, total?: number, phase?: StepPhase): void {
    const step = this.steps.get(stepName);
    if (!step) {
      logger.warn(`Attempted to update unknown step: ${stepName}`);
      return;
    }

    step.current = current;
    if (total !== undefined && total !== step.total) {
      step.total = total;
      if (step.bar) {
        step.bar.setTotal(total);
      }
    }

    if (phase && phase !== step.phase) {
      step.phase = phase;
      if (step.bar) {
        step.bar.update(current, { phase: this.getPhaseLabel(phase) });
      }
    }

    if (step.bar) {
      step.bar.update(current);
    }

    // Throttled logging for non-bar mode or debugging
    const now = Date.now();
    if (!this.options.enableBars || now - this.lastLogTime > this.logThrottleMs) {
      const percentage = step.total > 0 ? Math.round((current / step.total) * 100) : 0;
      logger.debug(`${stepName}: ${current}/${step.total} (${percentage}%) - ${this.getPhaseLabel(phase || step.phase)}`);
      this.lastLogTime = now;
    }
  }

  /**
   * Increment step progress by 1
   */
  incrementStep(stepName: string, phase?: StepPhase): void {
    const step = this.steps.get(stepName);
    if (!step) {
      logger.warn(`Attempted to increment unknown step: ${stepName}`);
      return;
    }

    this.updateStep(stepName, step.current + 1, step.total, phase);
  }

  /**
   * Complete a step
   */
  completeStep(stepName: string): void {
    const step = this.steps.get(stepName);
    if (!step) {
      logger.warn(`Attempted to complete unknown step: ${stepName}`);
      return;
    }

    step.phase = "completed";
    step.current = step.total;

    if (step.bar) {
      step.bar.update(step.total, { phase: pc.green("✓ Completed") });
      step.bar.stop();
    }

    logger.info(`Completed step: ${stepName} (${step.total} items)`);
  }

  /**
   * Stop all progress reporting and display summary
   */
  stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    this.multibar.stop();

    // Display final summary
    const elapsed = Date.now() - this.startTime;
    const elapsedStr = this.formatDuration(elapsed);

    console.log(`\n${pc.bold(pc.green("═══ Crawl Summary ═══"))}`);
    console.log(`${pc.cyan("Total Time:")} ${elapsedStr}`);
    console.log(`${pc.cyan("Steps:")}`);

    this.steps.forEach((step, name) => {
      const status = step.phase === "completed" ? pc.green("✓") : pc.yellow("◷");
      const percentage = step.total > 0 ? Math.round((step.current / step.total) * 100) : 0;
      console.log(`  ${status} ${name}: ${step.current}/${step.total} (${percentage}%)`);
    });

    console.log(pc.bold(pc.green("═══════════════════════\n")));
  }

  /**
   * Get formatted progress summary
   */
  getSummary(): string {
    const lines: string[] = [];
    const elapsed = Date.now() - this.startTime;

    lines.push(`Elapsed: ${this.formatDuration(elapsed)}`);
    this.steps.forEach((step, name) => {
      const percentage = step.total > 0 ? Math.round((step.current / step.total) * 100) : 0;
      lines.push(`${name}: ${step.current}/${step.total} (${percentage}%) - ${step.phase}`);
    });

    return lines.join("\n");
  }

  /**
   * Custom format function for progress bars
   */
  private formatBar(options: any, params: any, payload: any): string {
    const bar = options.barCompleteString.substring(0, Math.round(params.progress * options.barsize));
    const empty = options.barIncompleteString.substring(0, options.barsize - bar.length);

    const percentage = Math.round(params.progress * 100);
    const step = payload.step || "Unknown";
    const phase = payload.phase || "";

    // Color the percentage based on progress
    let percentageColor = pc.yellow;
    if (percentage === 100) percentageColor = pc.green;
    else if (percentage >= 75) percentageColor = pc.cyan;

    const percentText = percentageColor(`${percentage}%`);
    const stepText = pc.bold(step);
    const phaseText = pc.dim(phase);

    return `${stepText} [${bar}${empty}] ${percentText} | ${params.value}/${params.total} | ${phaseText}`;
  }

  /**
   * Get human-readable phase label
   */
  private getPhaseLabel(phase: StepPhase): string {
    switch (phase) {
      case "fetching":
        return "Fetching from API";
      case "processing":
        return "Processing data";
      case "storing":
        return "Storing to disk";
      case "completed":
        return "Completed";
      default:
        return phase;
    }
  }

  /**
   * Format duration in milliseconds to human-readable string
   */
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

  /**
   * Get current step information
   */
  getStep(stepName: string): StepProgress | undefined {
    return this.steps.get(stepName);
  }

  /**
   * Check if progress bars are enabled
   */
  isBarsEnabled(): boolean {
    return this.options.enableBars;
  }
}

/**
 * Create a new crawl progress manager
 */
export const createCrawlProgressManager = (options?: CrawlProgressOptions): CrawlProgressManager => {
  return new CrawlProgressManager(options);
};
