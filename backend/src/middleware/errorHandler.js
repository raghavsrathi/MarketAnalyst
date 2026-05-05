/**
 * Error Handler Middleware
 * -----------------------
 * Global error handling with proper HTTP responses
 */

const logger = require('../utils/logger');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, code = 'VALIDATION_ERROR') {
    super(message, 400, code);
  }
}

class NotFoundError extends AppError {
  constructor(message, code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

class UnauthorizedError extends AppError {
  constructor(message, code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

class RateLimitError extends AppError {
  constructor(message, code = 'RATE_LIMIT_EXCEEDED') {
    super(message, 429, code);
  }
}

// Main error handler
const errorHandler = (err, req, res, next) => {
  // Default error
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: messages.join(', '),
      code: 'VALIDATION_ERROR'
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Duplicate field value',
      code: 'DUPLICATE_ERROR'
    });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Invalid ${err.path}: ${err.value}`,
      code: 'INVALID_VALUE'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }

  // Axios errors
  if (err.isAxiosError) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message;
    
    return res.status(status).json({
      success: false,
      error: message,
      code: 'API_ERROR'
    });
  }

  // Custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler
const notFound = (req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
};

module.exports = {
  errorHandler,
  notFound,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  RateLimitError
};
