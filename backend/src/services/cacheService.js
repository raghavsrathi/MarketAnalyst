/**
 * Cache Service
 * -------------
 * High-performance in-memory caching with TTL
 * Handles /analyze (120s) and /price (10s) caching
 */

const NodeCache = require('node-cache');

// Analysis cache: 120 seconds TTL
const analysisCache = new NodeCache({
  stdTTL: 120,
  checkperiod: 60,
  useClones: false, // Faster - returns reference not copy
  maxKeys: 10000
});

// Price cache: 10 seconds TTL
const priceCache = new NodeCache({
  stdTTL: 10,
  checkperiod: 5,
  useClones: false,
  maxKeys: 5000
});

// Order deduplication cache: 30 seconds TTL
const orderCache = new NodeCache({
  stdTTL: 30,
  checkperiod: 15,
  maxKeys: 1000
});

// Request tracking for rate limiting insights
const requestTracker = new NodeCache({
  stdTTL: 60,
  checkPeriod: 30,
  maxKeys: 50000
});

const cacheService = {
  // Analysis caching
  getAnalysis: (key) => analysisCache.get(key),
  setAnalysis: (key, value, ttl = 120) => analysisCache.set(key, value, ttl),
  delAnalysis: (key) => analysisCache.del(key),
  flushAnalysis: () => analysisCache.flushAll(),
  getAnalysisStats: () => analysisCache.getStats(),

  // Price caching
  getPrice: (key) => priceCache.get(key),
  setPrice: (key, value, ttl = 10) => priceCache.set(key, value, ttl),
  delPrice: (key) => priceCache.del(key),
  flushPrice: () => priceCache.flushAll(),

  // Flush all caches
  flushAll: () => {
    analysisCache.flushAll();
    priceCache.flushAll();
    orderCache.flushAll();
  },

  // Order deduplication
  isDuplicateOrder: (orderKey) => orderCache.has(orderKey),
  setOrderLock: (orderKey, value = true, ttl = 30) => orderCache.set(orderKey, value, ttl),

  // Request tracking (for analytics)
  trackRequest: (ip, endpoint) => {
    const key = `${ip}:${endpoint}`;
    const current = requestTracker.get(key) || 0;
    requestTracker.set(key, current + 1, 60);
  },
  getRequestCount: (ip, endpoint) => {
    return requestTracker.get(`${ip}:${endpoint}`) || 0;
  },

  // Cache warming (pre-populate popular stocks)
  warmupCache: async (symbols, fetchFn) => {
    console.log(`[Cache] Warming up cache for ${symbols.length} symbols...`);
    const promises = symbols.map(async (symbol) => {
      try {
        const data = await fetchFn(symbol);
        analysisCache.set(symbol, data, 120);
      } catch (err) {
        // Silent fail for warmup
      }
    });
    await Promise.allSettled(promises);
    console.log('[Cache] Warmup complete');
  },

  // Memory stats
  getMemoryStats: () => ({
    analysis: analysisCache.getStats(),
    price: priceCache.getStats(),
    orders: orderCache.getStats()
  })
};

module.exports = cacheService;
