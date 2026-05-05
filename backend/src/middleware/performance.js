/**
 * Performance Monitoring Middleware
 * --------------------------------
 * Tracks request timing and logs slow requests
 * Optimized for high-traffic production use
 */

const logger = require('../utils/logger');
const cacheService = require('../services/cacheService');

// Track slow requests (threshold in ms)
const SLOW_REQUEST_THRESHOLD = parseInt(process.env.SLOW_REQUEST_THRESHOLD) || 1000;

// Track request counts for monitoring
const requestStats = {
  total: 0,
  success: 0,
  error: 0,
  slow: 0,
  cached: 0,
  avgResponseTime: 0,
  startTime: Date.now()
};

// Cleanup old stats periodically
setInterval(() => {
  const uptime = Date.now() - requestStats.startTime;
  if (uptime > 3600000) { // Reset every hour
    requestStats.total = 0;
    requestStats.success = 0;
    requestStats.error = 0;
    requestStats.slow = 0;
    requestStats.cached = 0;
    requestStats.avgResponseTime = 0;
    requestStats.startTime = Date.now();
  }
}, 3600000);

const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Track request
  cacheService.trackRequest(req.ip, req.path);
  requestStats.total++;
  
  // Capture response metrics
  const originalSend = res.send.bind(res);
  const originalJson = res.json.bind(res);
  
  // Track response time on send
  const trackResponse = () => {
    const duration = Date.now() - startTime;
    const isCached = res.locals.cached || false;
    
    // Update stats
    if (res.statusCode < 400) {
      requestStats.success++;
    } else {
      requestStats.error++;
    }
    
    if (isCached) {
      requestStats.cached++;
    }
    
    // Update rolling average
    requestStats.avgResponseTime = 
      (requestStats.avgResponseTime * (requestStats.total - 1) + duration) / requestStats.total;
    
    // Log slow requests
    if (duration > SLOW_REQUEST_THRESHOLD && !isCached) {
      requestStats.slow++;
      logger.warn(`[SLOW] ${req.method} ${req.path} took ${duration}ms`, {
        method: req.method,
        path: req.path,
        duration,
        query: req.query,
        ip: req.ip
      });
    }
    
    // Log normal requests at debug level
    logger.debug(`${req.method} ${req.path} ${res.statusCode} ${duration}ms ${isCached ? '(cached)' : ''}`, {
      requestId,
      duration,
      cached: isCached,
      statusCode: res.statusCode
    });
    
    // Add response time header
    res.setHeader('X-Response-Time', `${duration}ms`);
    res.setHeader('X-Request-Id', requestId);
  };
  
  // Override response methods
  res.send = (body) => {
    trackResponse();
    return originalSend(body);
  };
  
  res.json = (body) => {
    trackResponse();
    return originalJson(body);
  };
  
  // Store reference for cache middleware
  res.locals.startTime = startTime;
  res.locals.requestId = requestId;
  
  next();
};

// Get performance stats
const getStats = () => {
  const uptime = Date.now() - requestStats.startTime;
  return {
    ...requestStats,
    uptime,
    uptimeFormatted: `${Math.floor(uptime / 1000)}s`,
    requestsPerSecond: (requestStats.total / (uptime / 1000)).toFixed(2),
    cacheHitRate: requestStats.total > 0 
      ? ((requestStats.cached / requestStats.total) * 100).toFixed(2) 
      : 0,
    slowRequestRate: requestStats.total > 0
      ? ((requestStats.slow / requestStats.total) * 100).toFixed(2)
      : 0
  };
};

// Reset stats
const resetStats = () => {
  requestStats.total = 0;
  requestStats.success = 0;
  requestStats.error = 0;
  requestStats.slow = 0;
  requestStats.cached = 0;
  requestStats.avgResponseTime = 0;
  requestStats.startTime = Date.now();
};

module.exports = {
  performanceMonitor,
  getStats,
  resetStats,
  SLOW_REQUEST_THRESHOLD
};
