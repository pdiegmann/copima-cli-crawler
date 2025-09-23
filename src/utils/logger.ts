import { createLogger as winstonCreateLogger, format, transports } from 'winston';
import { join } from 'path';
import pc from 'picocolors';

const logFilePath = join(process.cwd(), 'logs', 'app.log');

export const createLogger = (context: string) => {
  return winstonCreateLogger({
    level: 'info',
    format: format.combine(
      format.label({ label: context }),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf(({ timestamp, level, message, label }) => {
        const colorize = {
          error: pc.red,
          warn: pc.yellow,
          info: pc.green,
          debug: pc.cyan,
        }[level] || ((text) => text);

        return `[${timestamp}] [${label}] ${colorize(level.toUpperCase())}: ${message}`;
      })
    ),
    transports: [
      new transports.Console(),
      new transports.File({ filename: logFilePath })
    ],
  });
};
