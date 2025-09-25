// Import required modules
import fs from "fs";
import yaml from "js-yaml";
import { createLogger } from "../logging";

type ResumeState = {
  [key: string]: unknown;
};

class ResumeManager {
  private logger = createLogger("ResumeManager");
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  // Load the resume state from the YAML file
  loadState(): ResumeState {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, "utf8");
        const state = yaml.load(fileContent) as ResumeState;
        this.logger.info("Resume state loaded successfully.");
        return state;
      } else {
        this.logger.warn("Resume file does not exist. Starting fresh.");
        return {};
      }
    } catch (error) {
      this.logger.error(`Failed to load resume state: ${error instanceof Error ? error.message : "Unknown error"}`);
      return {};
    }
  }

  // Save the current state to the YAML file
  saveState(state: ResumeState): void {
    try {
      const yamlData = yaml.dump(state);
      fs.writeFileSync(this.filePath, yamlData, "utf8");
      this.logger.info("Resume state saved successfully.");
    } catch (error) {
      this.logger.error(`Failed to save resume state: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

export default ResumeManager;
