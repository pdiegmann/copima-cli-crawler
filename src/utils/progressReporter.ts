// Import required modules
import fs from 'fs';
import yaml from 'js-yaml';
import logger from './logger';

type ProgressState = {
  [key: string]: any;
};

class ProgressReporter {
  private filePath: string;
  private intervalId: NodeJS.Timeout | null = null;
  private state: ProgressState = {};
  private writeStream: fs.WriteStream | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  // Start progress reporting
  start() {
    if (this.intervalId) {
      logger.warn('Progress reporting is already running.');
      return;
    }

    this.writeStream = fs.createWriteStream(this.filePath, { flags: 'w' });
    this.intervalId = setInterval(() => {
      this.writeProgress();
    }, 1000);

    logger.info('Progress reporting started.');
  }

  // Stop progress reporting
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.writeStream) {
      this.writeStream.close();
      this.writeStream = null;
    }

    logger.info('Progress reporting stopped.');
  }

  // Update the progress state
  updateState(newState: ProgressState) {
    this.state = { ...this.state, ...newState };
  }

  // Write progress to the YAML file
  private writeProgress() {
    if (!this.writeStream) {
      logger.error('Write stream is not initialized.');
      return;
    }

    try {
      const yamlData = yaml.dump(this.state);
      this.writeStream.write(yamlData + '\n');
    } catch (error) {
      logger.error(`Failed to write progress: ${error.message}`);
    }
  }
}

export default ProgressReporter;