/**
 * Implementation for test command.
 * Runs end-to-end tests using YAML configuration files.
 */

import { existsSync } from "fs";
import { createLogger } from "../../logging/index.js";
import { createTestRunner } from "../../testing/testRunner.js";

const logger = createLogger("TestCommand");

/**
 * Test command implementation.
 */
export const testImpl = async (
  flags: {
    verbose?: boolean;
    "dry-run"?: boolean;
    suite?: boolean;
    "cli-path"?: string;
    parallel?: boolean;
    "max-parallel"?: string;
    "stop-on-failure"?: boolean;
    "report-format"?: string;
    "generate-report"?: boolean;
    "force-cleanup"?: boolean;
    "list-examples"?: boolean;
  },
  configPath: string
): Promise<void> => {
  try {
    // Handle --list-examples option
    if (flags["list-examples"]) {
      listExampleConfigurations();
      return;
    }

    // Validate required config path
    if (!configPath) {
      logger.error("Test configuration file path is required");
      logger.info("Usage: test <config-file> [options]");
      logger.info("Use --list-examples to see available example configurations");
      process.exit(1);
    }

    // Check if config file exists
    if (!existsSync(configPath)) {
      logger.error(`Test configuration file not found: ${configPath}`);
      process.exit(1);
    }

    // Create test runner
    const testRunner = createTestRunner();

    // Setup process cleanup
    const cleanup = (): void => {
      logger.info("Cleaning up active test processes...");
      testRunner.cleanupProcesses();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    // Prepare execution options
    const executionOptions = {
      verbose: flags.verbose || false,
      dryRun: flags["dry-run"] || false,
      forceCleanup: flags["force-cleanup"] || false,
      cliPath: flags["cli-path"] || `bun ${process.cwd()}/src/bin/cli.ts`,
      env: process.env as Record<string, string>,
    };

    logger.info(`Loading test configuration: ${configPath}`);

    if (flags.suite) {
      // Run as test suite
      logger.info("Running as test suite");

      const suite = testRunner.loadTestSuite(configPath);

      // Override suite settings with CLI options if provided
      if (flags.parallel !== undefined) {
        suite.settings.parallel = flags.parallel;
      }
      if (flags["max-parallel"]) {
        suite.settings.maxParallel = parseInt(flags["max-parallel"], 10);
      }
      if (flags["stop-on-failure"] !== undefined) {
        suite.settings.stopOnFailure = flags["stop-on-failure"];
      }
      if (flags["generate-report"] !== undefined) {
        suite.settings.generateReport = flags["generate-report"];
      }
      if (flags["report-format"]) {
        suite.settings.reportFormat = flags["report-format"] as "json" | "yaml" | "html";
      }

      const result = await testRunner.runTestSuite(suite, executionOptions);

      // Report results
      logger.info("\nTest Suite Results:");
      logger.info("==================");
      logger.info(`Suite: ${result.suite.metadata.name}`);
      logger.info(`Status: ${result.success ? "✅ PASSED" : "❌ FAILED"}`);
      logger.info(`Total Tests: ${result.summary.total}`);
      logger.info(`Passed: ${result.summary.passed}`);
      logger.info(`Failed: ${result.summary.failed}`);
      logger.info(`Warnings: ${result.summary.warnings}`);
      logger.info(`Total Execution Time: ${result.totalExecutionTime}ms`);

      if (!result.success) {
        logger.error("\nFailed Tests:");
        result.results
          .filter((r) => !r.success)
          .forEach((r) => {
            logger.error(`- ${r.config.metadata.name}: ${r.error || "Unknown error"}`);
          });
        process.exit(1);
      }
    } else {
      // Run single test
      logger.info("Running single test");

      const config = testRunner.loadTestConfig(configPath);
      const result = await testRunner.runTest(config, executionOptions);

      // Report results
      logger.info("\nTest Results:");
      logger.info("=============");
      logger.info(`Test: ${result.config.metadata.name}`);
      logger.info(`Status: ${result.success ? "✅ PASSED" : "❌ FAILED"}`);
      logger.info(`Execution Time: ${result.executionTime}ms`);
      logger.info(`Crawler Exit Code: ${result.crawlerResult.exitCode}`);

      if (result.warnings.length > 0) {
        logger.warn(`Warnings: ${result.warnings.join(", ")}`);
      }

      if (result.error) {
        logger.error(`Error: ${result.error}`);
        process.exit(1);
      }

      // Show validation details
      if (result.validationResults.files.length > 0) {
        logger.info("\nFile Validation:");
        result.validationResults.files.forEach((file) => {
          const status = file.valid ? "✅" : "❌";
          const recordInfo = file.recordCount !== undefined ? ` (${file.recordCount} records)` : "";
          logger.info(`  ${status} ${file.path}${recordInfo}`);
          if (file.errors.length > 0) {
            file.errors.forEach((error) => logger.error(`    - ${error}`));
          }
        });
      }

      if (!result.validationResults.logs.valid) {
        logger.info("\nLog Validation:");
        logger.error("  ❌ Log validation failed");
        result.validationResults.logs.errors.forEach((error) => {
          logger.error(`    - ${error}`);
        });
      }
    }

    logger.info("\nTest execution completed successfully");
  } catch (error) {
    logger.error("Test execution failed", { error });
    process.exit(1);
  }
};

/**
 * Lists available example test configurations.
 */
const listExampleConfigurations = (): void => {
  logger.info("Available example test configurations:");
  logger.info("=====================================");

  const exampleConfigs = [
    {
      path: "examples/test-configs/basic-test.yaml",
      description: "Basic end-to-end test with file validation",
    },
    {
      path: "examples/test-configs/performance-test.yaml",
      description: "Performance-focused test with timing constraints (example)",
    },
    {
      path: "examples/test-configs/test-suite.yaml",
      description: "Test suite with multiple test configurations (example)",
    },
  ];

  exampleConfigs.forEach((config) => {
    const exists = existsSync(config.path) ? "✅" : "❌ (not created yet)";
    logger.info(`  ${config.path}`);
    logger.info(`    ${config.description}`);
    logger.info(`    Status: ${exists}`);
    logger.info("");
  });

  logger.info("Usage examples:");
  logger.info("  # Run single test");
  logger.info("  bun run src/bin/cli.ts test examples/test-configs/basic-test.yaml");
  logger.info("");
  logger.info("  # Run test with verbose output");
  logger.info("  bun run src/bin/cli.ts test examples/test-configs/basic-test.yaml --verbose");
  logger.info("");
  logger.info("  # Validate configuration only (dry run)");
  logger.info("  bun run src/bin/cli.ts test examples/test-configs/basic-test.yaml --dry-run");
  logger.info("");
  logger.info("  # Run test suite");
  logger.info("  bun run src/bin/cli.ts test examples/test-configs/test-suite.yaml --suite");
  logger.info("");
  logger.info("  # Run test suite with parallel execution and report generation");
  logger.info("  bun run src/bin/cli.ts test examples/test-configs/test-suite.yaml --suite --parallel --generate-report --report-format html");
};
