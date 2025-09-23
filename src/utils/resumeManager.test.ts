// Import required modules
import fs from 'fs';
import yaml from 'js-yaml';
import logger from './logger';
import ResumeManager from './resumeManager';

// Mock external dependencies
jest.mock('fs');
jest.mock('js-yaml');
jest.mock('./logger');

describe('ResumeManager', () => {
  const mockFilePath = '/path/to/resume.yaml';
  let resumeManager: ResumeManager;

  beforeEach(() => {
    resumeManager = new ResumeManager(mockFilePath);
    jest.clearAllMocks();
  });

  describe('loadState', () => {
    it('should load state from file if it exists', () => {
      const mockFileContent = 'key: value';
      const mockState = { key: 'value' };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockFileContent);
      (yaml.load as jest.Mock).mockReturnValue(mockState);

      const state = resumeManager.loadState();

      expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);
      expect(fs.readFileSync).toHaveBeenCalledWith(mockFilePath, 'utf8');
      expect(yaml.load).toHaveBeenCalledWith(mockFileContent);
      expect(logger.info).toHaveBeenCalledWith('Resume state loaded successfully.');
      expect(state).toEqual(mockState);
    });

    it('should return an empty object if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const state = resumeManager.loadState();

      expect(fs.existsSync).toHaveBeenCalledWith(mockFilePath);
      expect(logger.warn).toHaveBeenCalledWith('Resume file does not exist. Starting fresh.');
      expect(state).toEqual({});
    });

    it('should handle errors gracefully and return an empty object', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });

      const state = resumeManager.loadState();

      expect(logger.error).toHaveBeenCalledWith('Failed to load resume state: Read error');
      expect(state).toEqual({});
    });
  });

  describe('saveState', () => {
    it('should save state to file', () => {
      const mockState = { key: 'value' };
      const mockYamlData = 'key: value';

      (yaml.dump as jest.Mock).mockReturnValue(mockYamlData);

      resumeManager.saveState(mockState);

      expect(yaml.dump).toHaveBeenCalledWith(mockState);
      expect(fs.writeFileSync).toHaveBeenCalledWith(mockFilePath, mockYamlData, 'utf8');
      expect(logger.info).toHaveBeenCalledWith('Resume state saved successfully.');
    });

    it('should handle errors gracefully when saving state', () => {
      const mockState = { key: 'value' };

      (yaml.dump as jest.Mock).mockImplementation(() => {
        throw new Error('YAML error');
      });

      resumeManager.saveState(mockState);

      expect(logger.error).toHaveBeenCalledWith('Failed to save resume state: YAML error');
    });
  });
});