import pino from "pino";

// Configure base logger options
const defaultOptions = {
  level: process.env.LOG_LEVEL || "info",
  timestamp: () => `,"timestamp":"${new Date(Date.now()).toISOString()}"`,
  formatters: {
    level: (label: string) => {
      return { level: label };
    },
  },
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      ignore: "pid,hostname",
      translateTime: "UTC:yyyy-mm-dd HH:MM:ss.l o",
    },
  },
};

// Create development-specific options
const developmentOptions = {
  ...defaultOptions,
  level: "debug",
};

// Create production-specific options
const productionOptions = {
  ...defaultOptions,
  level: "info",
  transport: undefined, // Disable pretty printing in production
};

// Select options based on environment
const options =
  process.env.NODE_ENV === "production"
    ? productionOptions
    : developmentOptions;

// Create the logger instance
const logger = pino(options);

// Create child loggers for different modules
export const createModuleLogger = (moduleName: string) => {
  return logger.child({ module: moduleName });
};

// Export the base logger as default
export default logger;
export { logger };

// Example module-specific loggers
export const httpLogger = createModuleLogger("http");
export const dbLogger = createModuleLogger("database");
export const authLogger = createModuleLogger("auth");
