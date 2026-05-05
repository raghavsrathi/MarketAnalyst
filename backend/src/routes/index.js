/**
 * API Routes
 * ----------
 * Optimized routes for high-performance stock analysis API
 * Handles 100-300 concurrent users with caching and rate limiting
 */

const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');
const stocksController = require('../controllers/stocksController');
const analysisController = require('../controllers/analysisController');
const priceController = require('../controllers/priceController');
const orderController = require('../controllers/orderController');

// Middleware
const { apiLimiter, analysisLimiter, syncLimiter } = require('../middleware/rateLimiter');
const { cacheAnalysis, cachePrice } = require('../middleware/cacheMiddleware');
const { validateSymbol, validateInterval, validateOrderBody, handleValidationErrors, sanitizeSymbol } = require('../middleware/validator');

// Cache stats for monitoring
const cacheService = require('../services/cacheService');

// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'API running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==================== MONITORING ====================
router.get('/metrics', apiLimiter, (req, res) => {
  const stats = cacheService.getMemoryStats();
  res.json({
    success: true,
    data: {
      cache: stats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  });
});

// ==================== AUTH ROUTES ====================
router.get('/auth/login', apiLimiter, authController.getLoginUrl);
router.get('/auth/callback', apiLimiter, authController.handleCallback);
router.post('/auth/token', apiLimiter, authController.setToken);
router.get('/auth/profile', apiLimiter, authController.getProfile);

// ==================== STOCKS ROUTES ====================
router.get('/stocks', apiLimiter, stocksController.getAllStocks);
router.get('/stocks/popular', apiLimiter, stocksController.getPopularStocks);
router.get('/stocks/:symbol', apiLimiter, stocksController.getStockBySymbol);
router.post('/stocks/sync', syncLimiter, stocksController.syncInstruments);

// ==================== PRICE ROUTES ====================
router.get('/price', 
  apiLimiter, 
  sanitizeSymbol,
  validateSymbol, 
  validateInterval, 
  handleValidationErrors,
  cachePrice, 
  priceController.getPrice
);

router.post('/prices/batch', apiLimiter, priceController.getBatchPrices);

// ==================== ANALYSIS ROUTES (Optimized with Caching) ====================
router.get('/analyze', 
  analysisLimiter, 
  sanitizeSymbol,
  validateSymbol, 
  validateInterval, 
  handleValidationErrors,
  cacheAnalysis, 
  analysisController.analyzeStock
);

router.get('/historical', 
  apiLimiter, 
  sanitizeSymbol,
  validateSymbol, 
  validateInterval, 
  handleValidationErrors,
  analysisController.getHistoricalData
);

router.get('/quote', apiLimiter, sanitizeSymbol, validateSymbol, handleValidationErrors, analysisController.getQuote);

router.post('/analysis/clear-cache', apiLimiter, analysisController.clearCache);

// ==================== ORDER ROUTES ====================
router.post('/order', 
  apiLimiter, 
  validateOrderBody,
  handleValidationErrors,
  orderController.placeOrder
);

router.get('/order/:orderId/status', apiLimiter, orderController.getOrderStatus);
router.post('/order/:orderId/cancel', apiLimiter, orderController.cancelOrder);

// ==================== API INFO ====================
router.get('/', (req, res) => {
  res.json({
    name: 'Indian Stock Analysis API',
    version: '1.0.0',
    description: 'Technical analysis for Indian stocks using Upstox + yfinance',
    endpoints: {
      auth: {
        'GET /auth/login': 'Generate Upstox OAuth URL',
        'GET /auth/callback': 'OAuth callback handler',
        'GET /auth/profile': 'Get user profile'
      },
      stocks: {
        'GET /stocks': 'List all stocks',
        'GET /stocks/popular': 'Get popular stocks list',
        'GET /stocks/:symbol': 'Get stock details',
        'POST /stocks/sync': 'Sync instruments from Upstox'
      },
      analysis: {
        'GET /analyze?symbol=RELIANCE': 'Perform technical analysis',
        'GET /historical?symbol=RELIANCE': 'Get historical data',
        'GET /quote?symbol=RELIANCE': 'Get real-time quote (requires Upstox auth)',
        'POST /analysis/clear-cache': 'Clear analysis cache'
      },
      websocket: {
        'WS /ws/market-data': 'Real-time market data stream'
      }
    },
    documentation: 'See README.md for detailed API documentation'
  });
});

module.exports = router;
