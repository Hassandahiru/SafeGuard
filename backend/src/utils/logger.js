import winston from 'winston';
import 'winston-daily-rotate-file';
import config from '../config/environment.js';

const { combine, timestamp, errors, json, colorize, simple, printf } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    errors({ stack: true }),
    json()
  ),
  transports: [
    // Error logs - separate file for errors only
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: config.logging.datePattern,
      level: 'error',
      maxSize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
      zippedArchive: true,
      handleExceptions: true,
      handleRejections: true
    }),
    
    // Combined logs - all log levels
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: config.logging.datePattern,
      maxSize: config.logging.maxSize,
      maxFiles: '30d',
      zippedArchive: true
    }),
    
    // Security logs - authentication and authorization
    new winston.transports.DailyRotateFile({
      filename: 'logs/security-%DATE%.log',
      datePattern: config.logging.datePattern,
      level: 'warn',
      maxSize: '10m',
      maxFiles: '60d',
      zippedArchive: true
    }),
    
    // Database logs - database operations and errors
    new winston.transports.DailyRotateFile({
      filename: 'logs/database-%DATE%.log',
      datePattern: config.logging.datePattern,
      maxSize: '15m',
      maxFiles: '21d',
      zippedArchive: true
    }),
    
    // Payment logs - payment processing events
    new winston.transports.DailyRotateFile({
      filename: 'logs/payment-%DATE%.log',
      datePattern: config.logging.datePattern,
      maxSize: '10m',
      maxFiles: '90d',
      zippedArchive: true
    }),
    
    // API logs - request/response logging
    new winston.transports.DailyRotateFile({
      filename: 'logs/api-%DATE%.log',
      datePattern: config.logging.datePattern,
      maxSize: '25m',
      maxFiles: config.logging.maxFiles,
      zippedArchive: true
    })
  ],
  
  // Don't exit on handled exceptions
  exitOnError: false
});

// Console logging for development
if (config.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({
        format: 'HH:mm:ss'
      }),
      devFormat
    ),
    level: 'debug'
  }));
}

// Create specialized loggers for different concerns
const createSpecializedLogger = (category) => {
  return {
    info: (message, meta = {}) => logger.info(message, { category, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { category, ...meta }),
    error: (message, meta = {}) => logger.error(message, { category, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { category, ...meta })
  };
};

// Specialized loggers
const loggers = {
  security: createSpecializedLogger('security'),
  database: createSpecializedLogger('database'),
  payment: createSpecializedLogger('payment'),
  api: createSpecializedLogger('api'),
  socket: createSpecializedLogger('socket'),
  visit: createSpecializedLogger('visit'),
  visitor: createSpecializedLogger('visitor'),
  auth: createSpecializedLogger('auth'),
  qrcode: createSpecializedLogger('qrcode')
};

// Log application startup
logger.info('Logger initialized', {
  level: config.logging.level,
  environment: config.NODE_ENV,
  timestamp: new Date().toISOString()
});

// Export individual loggers
export const { security, database, payment, api, socket, visit, visitor, auth, qrcode } = loggers;

export {
  logger,
  loggers
};

export default logger;