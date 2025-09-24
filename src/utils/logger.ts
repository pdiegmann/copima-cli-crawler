import { join } from "path";
import * as pc from "picocolors";
import { format, transports, createLogger as winstonCreateLogger } from "winston";
import type { Logger } from "../types/utilities.js";

const logFilePath = join(process.cwd(), "logs", "app.log");

const createLogger = (context: string): Logger => {
  return winstonCreateLogger({
    level: "info",
    format: format.combine(
      format.label({ label: context }),
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.printf(({ timestamp, level, message, label }): string => {
        const colorize =
          {
            error: pc.red,
            warn: pc.yellow,
            info: pc.green,
            debug: pc.cyan,
          }[level] || ((text: string): string => text);

        return `[${timestamp}] [${label}] ${colorize(level.toUpperCase())}: ${message}`;
      })
    ),
    transports: [new transports.Console(), new transports.File({ filename: logFilePath })],
  });
};

// Create a default logger instance for backward compatibility
const defaultLogger = createLogger("Default");

// Named export for new usage
export { createLogger };

// Default export for backward compatibility
export default defaultLogger;
