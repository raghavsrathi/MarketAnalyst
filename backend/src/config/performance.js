/**
 * Performance Configuration
 * -------------------------
 * Optimized settings for 100-300 concurrent users
 */

module.exports = {
  // Server performance
  server: {
    keepAliveTimeout: 120000,  // 120 seconds
    headersTimeout: 120000,
    requestTimeout: 30000,
    maxConnections: 1000
  },

  // Compression settings
  compression: {
    level: 6,  // Balance between speed and compression
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    }
  },

  // Body parser limits
  bodyParser: {
    json: { limit: '10mb' },
    urlencoded: { limit: '10mb', extended: true }
  },

  // Cache TTLs (seconds)
  cache: {
    analysis: 120,      // 2 minutes
    price: 10,          // 10 seconds
    orderDeduplication: 30,  // 30 seconds
    requestTracking: 60    // 1 minute
  },

  // Rate limits
  rateLimit: {
    windowMs: 60000,  // 1 minute window
    max: 300,         // 300 requests per minute per IP
    analysisMax: 30,    // 30 analysis requests per minute
    syncMax: 10       // 10 sync operations per hour
  },

  // Timeouts (ms)
  timeouts: {
    yfinance: 15000,   // 15 seconds for yfinance
    upstox: 10000,     // 10 seconds for Upstox API
    analysis: 10000    // 10 seconds for analysis computation
  },

  // Retry settings
  retry: {
    maxRetries: 3,
    initialDelay: 1000,  // 1 second
    backoffMultiplier: 2,
    maxDelay: 10000      // Max 10 seconds
  },

  // Popular stocks for cache warming
  popularStocks: [
    'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
    'SBIN', 'BAJFINANCE', 'BHARTIARTL', 'KOTAKBANK', 'ITC',
    'HINDUNILVR', 'LT', 'AXISBANK', 'MARUTI', 'TATAMOTORS',
    'ASIANPAINT', 'SUNPHARMA', 'TITAN', 'ADANIENT', 'ULTRACEMCO'
  ]
};
