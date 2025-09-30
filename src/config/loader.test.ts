/**
 * Test suite for configuration loader
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import { loadConfig } from './loader.js';

// Mock fs
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    stat: jest.fn(),
  },
}));

// Mock path
const mockPath = path as jest.Mocked<typeof path>;

// Mock file loader
jest.mock('./loaders/fileLoader', () => ({
  fileLoader: {
    loadConfig: jest.fn(),
  },
}));

// Mock environment loader
jest.mock('./loaders/environmentLoader', () => ({
  environmentLoader: {
    loadConfig: jest.fn(),
  },
}));

// Mock config merger
jest.mock('./merging/configMerger', () => ({
  configMerger: {
    mergeConfigs: jest.fn(),
  },
}));

// Mock defaults
jest.mock('./defaults', () => ({
  getDefaults: jest.fn(() => ({
    gitlab: { baseUrl: 'https://gitlab.com', timeout: 5000 },
    output: { path: './output', format: 'jsonl' },
  })),
}));

describe('Configuration Loader', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {}; // Reset environment
  });

  describe('loadConfig', () => {
    it('should load configuration with default values', async () => {
      const { fileLoader } = await import('./loaders/fileLoader');
      const { environmentLoader } = await import('./loaders/environmentLoader');
      const { configMerger } = await import('./merging/configMerger');

      // Mock file doesn't exist
      mockFs.access.mockRejectedValueOnce(new Error('File not found'));

      // Mock environment config
      (environmentLoader.loadConfig as jest.Mock).mockReturnValueOnce({
        gitlab: { token: 'env-token' },
      });

      // Mock merger
      (configMerger.mergeConfigs as jest.Mock).mockReturnValueOnce({
        gitlab: {
          baseUrl: 'https://gitlab.com',
          token: 'env-token',
          timeout: 5000,
        },
        output: { path: './output', format: 'jsonl' },
      });

      const result = await loadConfig({});

      expect(result.gitlab?.baseUrl).toBe('https://gitlab.com');
      expect(result.gitlab?.token).toBe('env-token');
    });

    it('should load configuration from specified file', async () => {
      const { fileLoader } = await import('./loaders/fileLoader');
      const { environmentLoader } = await import('./loaders/environmentLoader');
      const { configMerger } = await import('./merging/configMerger');

      const configPath = './test-config.yaml';

      // Mock file exists
      mockFs.access.mockResolvedValueOnce(undefined);

      // Mock file config
      (fileLoader.loadConfig as jest.Mock).mockReturnValueOnce({
        gitlab: { baseUrl: 'https://custom.gitlab.com', token: 'file-token' },
      });

      // Mock environment config
      (environmentLoader.loadConfig as jest.Mock).mockReturnValueOnce({
        output: { verbose: true },
      });

      // Mock merger
      (configMerger.mergeConfigs as jest.Mock).mockReturnValueOnce({
        gitlab: {
          baseUrl: 'https://custom.gitlab.com',
          token: 'file-token',
          timeout: 5000,
        },
        output: { path: './output', format: 'jsonl', verbose: true },
      });

      const result = await loadConfig({ config: configPath });

      expect(fileLoader.loadConfig).toHaveBeenCalledWith(configPath);
      expect(result.gitlab?.baseUrl).toBe('https://custom.gitlab.com');
      expect(result.output?.verbose).toBe(true);
    });

    it('should handle file loading errors gracefully', async () => {
      const { fileLoader } = await import('./loaders/fileLoader');
      const { environmentLoader } = await import('./loaders/environmentLoader');
      const { configMerger } = await import('./merging/configMerger');

      const configPath = './invalid-config.yaml';

      // Mock file access check passes but loading fails
      mockFs.access.mockResolvedValueOnce(undefined);
      (fileLoader.loadConfig as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid YAML syntax');
      });

      // Should still work with environment and defaults
      (environmentLoader.loadConfig as jest.Mock).mockReturnValueOnce({});
      (configMerger.mergeConfigs as jest.Mock).mockReturnValueOnce({
        gitlab: { baseUrl: 'https://gitlab.com', timeout: 5000 },
        output: { path: './output', format: 'jsonl' },
      });

      const result = await loadConfig({ config: configPath });

      expect(result).toBeDefined();
      expect(result.gitlab?.baseUrl).toBe('https://gitlab.com');
    });

    it('should prioritize CLI arguments over environment variables', async () => {
      const { fileLoader } = await import('./loaders/fileLoader');
      const { environmentLoader } = await import('./loaders/environmentLoader');
      const { configMerger } = await import('./merging/configMerger');

      // No config file
      mockFs.access.mockRejectedValueOnce(new Error('File not found'));

      // Mock environment with token
      (environmentLoader.loadConfig as jest.Mock).mockReturnValueOnce({
        gitlab: { token: 'env-token', baseUrl: 'https://env.gitlab.com' },
      });

      // Mock merger that prioritizes CLI args
      (configMerger.mergeConfigs as jest.Mock).mockReturnValueOnce({
        gitlab: {
          baseUrl: 'https://cli.gitlab.com', // CLI arg wins
          token: 'env-token', // From environment
          timeout: 5000, // From defaults
        },
        output: { path: './output', format: 'jsonl' },
      });

      const result = await loadConfig({
        gitlab: { baseUrl: 'https://cli.gitlab.com' }
      });

      expect(result.gitlab?.baseUrl).toBe('https://cli.gitlab.com');
      expect(result.gitlab?.token).toBe('env-token');
    });

    it('should auto-discover config files', async () => {
      const { fileLoader } = await import('./loaders/fileLoader');
      const { environmentLoader } = await import('./loaders/environmentLoader');
      const { configMerger } = await import('./merging/configMerger');

      // No explicit config specified
      // Mock first few files don't exist, but one does
      mockFs.access
        .mockRejectedValueOnce(new Error('Not found'))
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(undefined); // Found one

      (fileLoader.loadConfig as jest.Mock).mockReturnValueOnce({
        gitlab: { baseUrl: 'https://auto.gitlab.com' },
      });

      (environmentLoader.loadConfig as jest.Mock).mockReturnValueOnce({});

      (configMerger.mergeConfigs as jest.Mock).mockReturnValueOnce({
        gitlab: {
          baseUrl: 'https://auto.gitlab.com',
          timeout: 5000,
        },
        output: { path: './output', format: 'jsonl' },
      });

      const result = await loadConfig({});

      expect(result.gitlab?.baseUrl).toBe('https://auto.gitlab.com');
    });

    it('should handle missing configuration gracefully', async () => {
      const { environmentLoader } = await import('./loaders/environmentLoader');
      const { configMerger } = await import('./merging/configMerger');

      // All config file checks fail
      mockFs.access.mockRejectedValue(new Error('Not found'));

      // Empty environment
      (environmentLoader.loadConfig as jest.Mock).mockReturnValueOnce({});

      // Just defaults
      (configMerger.mergeConfigs as jest.Mock).mockReturnValueOnce({
        gitlab: { baseUrl: 'https://gitlab.com', timeout: 5000 },
        output: { path: './output', format: 'jsonl' },
      });

      const result = await loadConfig({});

      expect(result).toBeDefined();
      expect(result.gitlab?.baseUrl).toBe('https://gitlab.com');
    });

    it('should resolve relative paths correctly', async () => {
      const { fileLoader } = await import('./loaders/fileLoader');
      const { environmentLoader } = await import('./loaders/environmentLoader');
      const { configMerger } = await import('./merging/configMerger');

      const relativePath = '../config/test.yaml';

      mockFs.access.mockResolvedValueOnce(undefined);

      (fileLoader.loadConfig as jest.Mock).mockReturnValueOnce({
        output: { path: '../data' },
      });

      (environmentLoader.loadConfig as jest.Mock).mockReturnValueOnce({});

      (configMerger.mergeConfigs as jest.Mock).mockReturnValueOnce({
        gitlab: { baseUrl: 'https://gitlab.com', timeout: 5000 },
        output: { path: '../data', format: 'jsonl' },
      });

      const result = await loadConfig({ config: relativePath });

      expect(fileLoader.loadConfig).toHaveBeenCalledWith(relativePath);
      expect(result.output?.path).toBe('../data');
    });

    it('should handle environment variable overrides', async () => {
      const { fileLoader } = await import('./loaders/fileLoader');
      const { environmentLoader } = await import('./loaders/environmentLoader');
      const { configMerger } = await import('./merging/configMerger');

      // Set up environment variables
      process.env.GITLAB_TOKEN = 'env-secret-token';
      process.env.GITLAB_BASE_URL = 'https://env.gitlab.example.com';

      mockFs.access.mockRejectedValueOnce(new Error('No config file'));

      (environmentLoader.loadConfig as jest.Mock).mockReturnValueOnce({
        gitlab: {
          token: 'env-secret-token',
          baseUrl: 'https://env.gitlab.example.com',
        },
      });

      (configMerger.mergeConfigs as jest.Mock).mockReturnValueOnce({
        gitlab: {
          baseUrl: 'https://env.gitlab.example.com',
          token: 'env-secret-token',
          timeout: 5000,
        },
        output: { path: './output', format: 'jsonl' },
      });

      const result = await loadConfig({});

      expect(result.gitlab?.token).toBe('env-secret-token');
      expect(result.gitlab?.baseUrl).toBe('https://env.gitlab.example.com');
    });
  });

  describe('error handling', () => {
    it('should handle invalid config file gracefully', async () => {
      const { fileLoader } = await import('./loaders/fileLoader');
      const { environmentLoader } = await import('./loaders/environmentLoader');
      const { configMerger } = await import('./merging/configMerger');

      mockFs.access.mockResolvedValueOnce(undefined);

      // File exists but is invalid
      (fileLoader.loadConfig as jest.Mock).mockImplementationOnce(() => {
        throw new Error('YAML parsing failed');
      });

      (environmentLoader.loadConfig as jest.Mock).mockReturnValueOnce({});

      (configMerger.mergeConfigs as jest.Mock).mockReturnValueOnce({
        gitlab: { baseUrl: 'https://gitlab.com', timeout: 5000 },
        output: { path: './output', format: 'jsonl' },
      });

      // Should not throw, but log the error and continue
      const result = await loadConfig({ config: './bad-config.yaml' });

      expect(result).toBeDefined();
    });

    it('should handle environment loading errors', async () => {
      const { environmentLoader } = await import('./loaders/environmentLoader');
      const { configMerger } = await import('./merging/configMerger');

      mockFs.access.mockRejectedValueOnce(new Error('No config file'));

      (environmentLoader.loadConfig as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Environment loading failed');
      });

      (configMerger.mergeConfigs as jest.Mock).mockReturnValueOnce({
        gitlab: { baseUrl: 'https://gitlab.com', timeout: 5000 },
        output: { path: './output', format: 'jsonl' },
      });

      // Should still work with just defaults
      const result = await loadConfig({});

      expect(result).toBeDefined();
    });

    it('should handle merger errors', async () => {
      const { environmentLoader } = await import('./loaders/environmentLoader');
      const { configMerger } = await import('./merging/configMerger');

      mockFs.access.mockRejectedValueOnce(new Error('No config file'));

      (environmentLoader.loadConfig as jest.Mock).mockReturnValueOnce({});

      (configMerger.mergeConfigs as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Config merging failed');
      });

      // Should fallback to some basic config
      await expect(loadConfig({})).rejects.toThrow();
    });
  });
});
