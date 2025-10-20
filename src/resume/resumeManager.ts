// Import required modules
import fs from "fs";
import yaml from "js-yaml";
import { createLogger } from "../logging";

/**
 * Resume state for a crawl step with pagination support
 */
type StepResumeState = {
  /** Name of the step (e.g., "areas", "users", "resources", "repository") */
  step: string;
  /** Sub-step within the main step (e.g., "groups", "projects") */
  subStep?: string;
  /** Whether this step is completed */
  completed: boolean;
  /** Pagination cursor for resuming from last position */
  cursor?: string;
  /** Number of items processed so far */
  itemsProcessed: number;
  /** Total items if known */
  totalItems?: number;
  /** Timestamp of last update */
  lastUpdate: string;
  /** Error message if step failed */
  error?: string;
};

/**
 * Complete resume state for a crawl session
 */
export type CrawlResumeState = {
  /** Unique identifier for this crawl session */
  sessionId: string;
  /** GitLab host being crawled */
  host: string;
  /** Account ID used for crawling */
  accountId: string;
  /** Overall crawl start time */
  startedAt: string;
  /** Last update time */
  lastUpdate: string;
  /** Current step being executed */
  currentStep: string;
  /** Steps that have been completed */
  completedSteps: string[];
  /** Resume state for each step */
  steps: {
    areas?: {
      groups?: StepResumeState;
      projects?: StepResumeState;
    };
    users?: StepResumeState;
    resources?: {
      [resourceType: string]: StepResumeState;
    };
    repository?: {
      [resourceType: string]: StepResumeState;
    };
  };
};

class ResumeManager {
  private logger = createLogger("ResumeManager");
  private filePath: string;
  private state: CrawlResumeState | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Initialize a new crawl session
   */
  initializeSession(host: string, accountId: string, sessionId?: string): CrawlResumeState {
    this.state = {
      sessionId: sessionId || this.generateSessionId(),
      host,
      accountId,
      startedAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      currentStep: "initializing",
      completedSteps: [],
      steps: {},
    };

    this.saveState(this.state);
    this.logger.info(`Initialized new crawl session: ${this.state.sessionId}`);
    return this.state;
  }

  /**
   * Load existing resume state from file
   */
  loadState(): CrawlResumeState | null {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, "utf8");
        this.state = yaml.load(fileContent) as CrawlResumeState;
        this.logger.info(`Resume state loaded successfully (session: ${this.state?.sessionId})`);
        return this.state;
      } else {
        this.logger.info("No resume state file found. Starting fresh crawl.");
        return null;
      }
    } catch (error) {
      this.logger.error(`Failed to load resume state: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  /**
   * Save current state to file
   */
  saveState(state: CrawlResumeState): void {
    try {
      state.lastUpdate = new Date().toISOString();
      const yamlData = yaml.dump(state);
      fs.writeFileSync(this.filePath, yamlData, "utf8");
      this.logger.debug("Resume state saved successfully");
    } catch (error) {
      this.logger.error(`Failed to save resume state: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Update step progress with pagination cursor
   */
  updateStepProgress(step: string, subStep: string | undefined, itemsProcessed: number, cursor?: string, totalItems?: number): void {
    if (!this.state) {
      this.logger.warn("Cannot update step progress: no active session");
      return;
    }

    this.state.currentStep = step;

    // Initialize step structure if needed
    if (!this.state.steps[step as keyof typeof this.state.steps]) {
      this.state.steps[step as keyof typeof this.state.steps] = {} as any;
    }

    const stepState: StepResumeState = {
      step,
      subStep,
      completed: false,
      cursor,
      itemsProcessed,
      totalItems,
      lastUpdate: new Date().toISOString(),
    };

    // Store in appropriate location based on step structure
    if (step === "areas" && subStep) {
      if (!this.state.steps.areas) this.state.steps.areas = {};
      this.state.steps.areas[subStep as "groups" | "projects"] = stepState;
    } else if (step === "users") {
      this.state.steps.users = stepState;
    } else if ((step === "resources" || step === "repository") && subStep) {
      const stepData = this.state.steps[step as "resources" | "repository"] || {};
      stepData[subStep] = stepState;
      this.state.steps[step as "resources" | "repository"] = stepData;
    }

    this.saveState(this.state);
  }

  /**
   * Mark a step as completed
   */
  completeStep(step: string, subStep?: string): void {
    if (!this.state) {
      this.logger.warn("Cannot complete step: no active session");
      return;
    }

    const stepKey = subStep ? `${step}.${subStep}` : step;

    if (!this.state.completedSteps.includes(stepKey)) {
      this.state.completedSteps.push(stepKey);
    }

    // Mark as completed in the step state
    if (step === "areas" && subStep) {
      if (this.state.steps.areas?.[subStep as "groups" | "projects"]) {
        this.state.steps.areas[subStep as "groups" | "projects"]!.completed = true;
      }
    } else if (step === "users" && this.state.steps.users) {
      this.state.steps.users.completed = true;
    } else if ((step === "resources" || step === "repository") && subStep) {
      const stepData = this.state.steps[step as "resources" | "repository"];
      if (stepData?.[subStep]) {
        stepData[subStep].completed = true;
      }
    }

    this.logger.info(`Marked ${stepKey} as completed`);
    this.saveState(this.state);
  }

  /**
   * Get resume cursor for a specific step/substep
   */
  getResumeCursor(step: string, subStep?: string): string | undefined {
    if (!this.state) return undefined;

    if (step === "areas" && subStep) {
      return this.state.steps.areas?.[subStep as "groups" | "projects"]?.cursor;
    } else if (step === "users") {
      return this.state.steps.users?.cursor;
    } else if ((step === "resources" || step === "repository") && subStep) {
      return this.state.steps[step as "resources" | "repository"]?.[subStep]?.cursor;
    }

    return undefined;
  }

  /**
   * Check if a step is completed
   */
  isStepCompleted(step: string, subStep?: string): boolean {
    if (!this.state) return false;

    const stepKey = subStep ? `${step}.${subStep}` : step;
    return this.state.completedSteps.includes(stepKey);
  }

  /**
   * Get current state
   */
  getState(): CrawlResumeState | null {
    return this.state;
  }

  /**
   * Clear resume state (delete file)
   */
  clearState(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
        this.logger.info("Resume state cleared successfully");
      }
      this.state = null;
    } catch (error) {
      this.logger.error(`Failed to clear resume state: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Generate a unique session ID using timestamp
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    // Use timestamp-based unique ID for session identification
    // eslint-disable-next-line sonarjs/pseudo-random
    const random = Math.random().toString(36).substring(2, 15);
    return `crawl-${timestamp}-${random}`;
  }
}

export default ResumeManager;
