/**
 * Rate Limiter Middleware
 * ----------------------
 * Prevents API abuse with request throttling
 */

const rateLimit = require('express-rate-limit');
const { RateLimitError } = require('./errorHandler');

// General API rate limiter - Optimized for 100-300 concurrent users
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 300, // Increased for 300 concurrent users
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: true, // Don't count failed requests against limit
  handler: (req, res, next, options) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(options.windowMs / 1000)
    });
  },
  keyGenerator: (req) => {
    // Use IP with fallback chain for proxy setups
    return req.ip || 
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.headers['x-real-ip'] || 
           'unknown';
  },
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health' || req.path === '/'
});

// Stricter limiter for analysis endpoint (computationally expensive)
const analysisLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Analysis rate limit exceeded. Max 30 requests per minute.',
      code: 'ANALYSIS_RATE_LIMIT'
    });
  }
});

// Very strict for instrument sync (expensive operation)
const syncLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 syncs per hour
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Sync rate limit exceeded. Max 10 syncs per hour.',
      code: 'SYNC_RATE_LIMIT'
    });
  }
});

// WebSocket connection limiter (by IP)
const wsConnectionLimiter = new Map();
const WS_MAX_CONNECTIONS = 5; // Max 5 connections per IP
const WS_WINDOW_MS = 60 * 1000; // 1 minute

const checkWsConnectionLimit = (ip) => {
  const now = Date.now();
  
  if (!wsConnectionLimiter.has(ip)) {
    wsConnectionLimiter.set(ip, { count: 1, resetTime: now + WS_WINDOW_MS });
    return true;
  }
  
  const record = wsConnectionLimiter.get(ip);
  
  if (now > record.resetTime) {
    // Reset window
    record.count = 1;
    record.resetTime = now + WS_WINDOW_MS;
    return true;
  }
  
  if (record.count >= WS_MAX_CONNECTIONS) {
    return false;
  }
  
  record.count++;
  return true;
};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of wsConnectionLimiter.entries()) {
    if (now > record.resetTime) {
      wsConnectionLimiter.delete(ip);
    }
  }
}, 60 * 1000);

module.exports = {
  apiLimiter,
  analysisLimiter,
  syncLimiter,
  checkWsConnectionLimit
};
