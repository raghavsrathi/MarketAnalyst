/**
 * Cache Middleware
 * ----------------
 * Express middleware for response caching
 */

const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

// Generate cache key from request
const generateCacheKey = (req) => {
  const { path, query } = req;
  const sortedQuery = Object.keys(query)
    .sort()
    .map(key => `${key}=${query[key]}`)
    .join('&');
  return `${path}?${sortedQuery}`;
};

// Cache middleware for analysis endpoint
const cacheAnalysis = (req, res, next) => {
  const key = generateCacheKey(req);
  const cached = cacheService.getAnalysis(key);

  if (cached) {
    logger.debug(`[Cache HIT] Analysis: ${key}`);
    return res.json({
      success: true,
      cached: true,
      cachedAt: cached.timestamp,
      data: cached.data
    });
  }

  // Store original res.json to capture response
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body.success) {
      cacheService.setAnalysis(key, {
        data: body.data,
        timestamp: new Date().toISOString()
      });
      logger.debug(`[Cache SET] Analysis: ${key}`);
    }
    return originalJson(body);
  };

  next();
};

// Cache middleware for price endpoint
const cachePrice = (req, res, next) => {
  const symbol = req.query.symbol?.toUpperCase();
  if (!symbol) return next();

  const cached = cacheService.getPrice(symbol);

  if (cached) {
    logger.debug(`[Cache HIT] Price: ${symbol}`);
    return res.json({
      success: true,
      cached: true,
      data: cached
    });
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body.success && body.data) {
      cacheService.setPrice(symbol, body.data);
      logger.debug(`[Cache SET] Price: ${symbol}`);
    }
    return originalJson(body);
  };

  next();
};

// Clear cache middleware (for admin use)
const clearCache = (req, res) => {
  const { type } = req.query;

  if (type === 'analysis') {
    cacheService.flushAnalysis();
    logger.info('[Cache] Analysis cache cleared');
  } else if (type === 'price') {
    cacheService.flushPrice();
    logger.info('[Cache] Price cache cleared');
  } else {
    cacheService.flushAnalysis();
    cacheService.flushPrice();
    logger.info('[Cache] All caches cleared');
  }

  res.json({ success: true, message: 'Cache cleared' });
};

module.exports = {
  cacheAnalysis,
  cachePrice,
  clearCache
};
