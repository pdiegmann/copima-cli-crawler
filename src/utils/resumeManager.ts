// Import required modules
import fs from 'fs';
import yaml from 'js-yaml';
import logger from './logger';

type ResumeState = {
  [key: string]: any;
};

class ResumeManager {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  // Load the resume state from the YAML file
  loadState(): ResumeState {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        const state = yaml.load(fileContent) as ResumeState;
        logger.info('Resume state loaded successfully.');
        return state;
      } else {
        logger.warn('Resume file does not exist. Starting fresh.');
        return {};
      }
    } catch (error) {
      logger.error(`Failed to load resume state: ${error.message}`);
      return {};
    }
  }

  // Save the current state to the YAML file
  saveState(state: ResumeState) {
    try {
      const yamlData = yaml.dump(state);
      fs.writeFileSync(this.filePath, yamlData, 'utf8');
      logger.info('Resume state saved successfully.');
    } catch (error) {
      logger.error(`Failed to save resume state: ${error.message}`);
    }
  }
}

export default ResumeManager;