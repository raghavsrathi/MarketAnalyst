/**
 * Winston Logger Configuration
 * ---------------------------
 * Production-ready structured logging
 */

const winston = require('winston');

const { combine, timestamp, json, errors, printf, colorize } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Determine log level
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create logger
const logger = winston.createLogger({
  level: logLevel,
  defaultMeta: {
    service: 'indian-stock-api'
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: combine(
        timestamp(),
        process.env.NODE_ENV === 'production' ? json() : combine(colorize(), devFormat)
      )
    })
  ],
  exceptionHandlers: [
    new winston.transports.Console({ format: json() })
  ],
  rejectionHandlers: [
    new winston.transports.Console({ format: json() })
  ]
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: combine(timestamp(), json())
  }));
  
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    format: combine(timestamp(), json())
  }));
}

module.exports = logger;
