import { logger } from './logger.js';
import type { CallbackConfig, CallbackContext } from '../config/types.js';

/**
 * Data Processing Callback Manager
 * 
 * Manages the execution of data processing callbacks for filtering and modifying
 * crawled objects before they are stored to JSONL files.
 */
export class CallbackManager {
  private callback: ((context: CallbackContext, object: any) => any | false) | null = null;
  private isEnabled: boolean = false;

  constructor(private config: CallbackConfig) {
    this.isEnabled = config.enabled;
    if (this.isEnabled) {
      this.loadCallback();
    }
  }

  /**
   * Load callback function from configuration.
   * Prioritizes inline callback over module path.
   */
  private async loadCallback(): Promise<void> {
    try {
      if (this.config.inlineCallback) {
        // Use inline callback if provided
        this.callback = this.config.inlineCallback;
        logger.info('Loaded inline callback function');
      } else if (this.config.modulePath) {
        // Load callback from external module
        const callbackModule = await import(this.config.modulePath);
        
        // Try different export patterns
        if (typeof callbackModule.default === 'function') {
          this.callback = callbackModule.default;
        } else if (typeof callbackModule.callback === 'function') {
          this.callback = callbackModule.callback;
        } else if (typeof callbackModule === 'function') {
          this.callback = callbackModule;
        } else {
          throw new Error(`No valid callback function found in module: ${this.config.modulePath}`);
        }
        
        logger.info(`Loaded callback function from module: ${this.config.modulePath}`);
      } else {
        logger.warn('Callback system enabled but no callback function or module path provided');
        this.isEnabled = false;
      }
    } catch (error) {
      logger.error('Failed to load callback function:', error);
      this.isEnabled = false;
      this.callback = null;
    }
  }

  /**
   * Process an object through the callback system.
   * 
   * @param context - Contextual information about the object being processed
   * @param object - The object to process
   * @returns The processed object, or null if the object should be filtered out
   */
  async processObject(context: CallbackContext, object: any): Promise<any | null> {
    if (!this.isEnabled || !this.callback) {
      // If callbacks are disabled or no callback is loaded, return object as-is
      return object;
    }

    try {
      const result = await this.callback(context, object);
      
      if (result === false) {
        // Callback returned false, filter out this object
        logger.debug(`Object filtered out by callback - ${context.resourceType}: ${object.id || 'unknown'}`);
        return null;
      }
      
      // Return the modified object (or original if unchanged)
      return result || object;
    } catch (error) {
      logger.error(`Callback execution failed for ${context.resourceType}:`, error);
      // On error, return original object to avoid data loss
      return object;
    }
  }

  /**
   * Process an array of objects through the callback system.
   * 
   * @param context - Contextual information about the objects being processed
   * @param objects - Array of objects to process
   * @returns Array of processed objects (filtered objects are excluded)
   */
  async processObjects(context: CallbackContext, objects: any[]): Promise<any[]> {
    if (!this.isEnabled || !this.callback || !Array.isArray(objects)) {
      return objects;
    }

    const processedObjects: any[] = [];
    
    for (const object of objects) {
      try {
        const result = await this.processObject(context, object);
        if (result !== null) {
          processedObjects.push(result);
        }
      } catch (error) {
        logger.error(`Failed to process object in batch:`, error);
        // Add original object on error to avoid data loss
        processedObjects.push(object);
      }
    }
    
    const filteredCount = objects.length - processedObjects.length;
    if (filteredCount > 0) {
      logger.debug(`Filtered ${filteredCount} objects from ${context.resourceType} batch`);
    }
    
    return processedObjects;
  }

  /**
   * Check if the callback system is enabled and ready.
   */
  isReady(): boolean {
    return this.isEnabled && this.callback !== null;
  }

  /**
   * Get callback configuration.
   */
  getConfig(): CallbackConfig {
    return this.config;
  }

  /**
   * Update callback configuration and reload callback if needed.
   */
  async updateConfig(newConfig: CallbackConfig): Promise<void> {
    const wasEnabled = this.isEnabled;
    const oldModulePath = this.config.modulePath;
    
    this.config = newConfig;
    this.isEnabled = newConfig.enabled;
    
    // Reload callback if configuration changed
    if (this.isEnabled && (!wasEnabled || oldModulePath !== newConfig.modulePath)) {
      await this.loadCallback();
    } else if (!this.isEnabled) {
      this.callback = null;
    }
  }
}

/**
 * Create a callback manager instance from configuration.
 */
export function createCallbackManager(config: CallbackConfig): CallbackManager {
  return new CallbackManager(config);
}