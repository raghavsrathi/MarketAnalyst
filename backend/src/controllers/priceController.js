/**
 * Price Controller
 * ----------------
 * Fast price endpoint with aggressive caching
 * Target: < 200ms response time
 */

const upstoxService = require('../services/upstoxService');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

// Fallback prices for common stocks (if Upstox fails)
const FALLBACK_PRICES = {
  'RELIANCE': { price: 2456.75, change: 12.5, changePercent: 0.51 },
  'TCS': { price: 3421.50, change: -8.25, changePercent: -0.24 },
  'INFY': { price: 1456.80, change: 5.2, changePercent: 0.36 },
  'HDFCBANK': { price: 1523.45, change: 3.1, changePercent: 0.20 }
};

/**
 * Get current price
 * GET /price?symbol=RELIANCE
 * Cached for 10 seconds
 */
exports.getPrice = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { symbol } = req.query;
    const normalizedSymbol = symbol.toUpperCase().trim();
    
    // Check cache first
    const cached = cacheService.getPrice(normalizedSymbol);
    if (cached) {
      const duration = Date.now() - startTime;
      logger.debug(`[Price Cache HIT] ${normalizedSymbol} (${duration}ms)`);
      
      return res.json({
        success: true,
        data: cached,
        cached: true,
        responseTimeMs: duration
      });
    }
    
    // Try Upstox if authenticated
    let priceData = null;
    
    if (upstoxService.accessToken) {
      try {
        const instrumentKey = `NSE_EQ|${normalizedSymbol}`;
        const quote = await upstoxService.getMarketQuote(instrumentKey);
        
        if (quote?.data?.[instrumentKey]) {
          const data = quote.data[instrumentKey];
          priceData = {
            symbol: normalizedSymbol,
            price: parseFloat(data.last_price),
            change: parseFloat(data.change),
            changePercent: parseFloat(data.pChange),
            open: parseFloat(data.open),
            high: parseFloat(data.high),
            low: parseFloat(data.low),
            close: parseFloat(data.close),
            volume: parseInt(data.volume),
            timestamp: new Date().toISOString(),
            source: 'upstox'
          };
        }
      } catch (upstoxError) {
        logger.warn(`[Price] Upstox fetch failed for ${normalizedSymbol}:`, upstoxError.message);
      }
    }
    
    // Fallback to cached/historical data if Upstox fails
    if (!priceData) {
      const fallback = FALLBACK_PRICES[normalizedSymbol];
      if (fallback) {
        priceData = {
          symbol: normalizedSymbol,
          ...fallback,
          timestamp: new Date().toISOString(),
          source: 'fallback'
        };
        logger.info(`[Price] Using fallback for ${normalizedSymbol}`);
      } else {
        // Generate synthetic price (for demo purposes)
        priceData = {
          symbol: normalizedSymbol,
          price: (Math.random() * 5000 + 500).toFixed(2),
          change: (Math.random() * 100 - 50).toFixed(2),
          changePercent: (Math.random() * 5 - 2.5).toFixed(2),
          timestamp: new Date().toISOString(),
          source: 'synthetic'
        };
        logger.warn(`[Price] Using synthetic data for ${normalizedSymbol}`);
      }
    }
    
    // Cache for 10 seconds
    cacheService.setPrice(normalizedSymbol, priceData);
    
    const duration = Date.now() - startTime;
    logger.info(`[Price] ${normalizedSymbol} fetched in ${duration}ms (${priceData.source})`);
    
    res.json({
      success: true,
      data: priceData,
      cached: false,
      responseTimeMs: duration
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[Price] Failed after ${duration}ms:`, error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'PRICE_FETCH_FAILED',
      responseTimeMs: duration
    });
  }
};

/**
 * Get multiple prices at once
 * POST /prices/batch
 * Body: { symbols: ['RELIANCE', 'TCS', 'INFY'] }
 */
exports.getBatchPrices = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { symbols } = req.body;
    
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'symbols array required',
        code: 'MISSING_SYMBOLS'
      });
    }
    
    if (symbols.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Max 50 symbols per batch',
        code: 'TOO_MANY_SYMBOLS'
      });
    }
    
    // Fetch all prices in parallel
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const normalized = symbol.toUpperCase().trim();
        
        // Check cache
        const cached = cacheService.getPrice(normalized);
        if (cached) {
          return { symbol: normalized, ...cached, cached: true };
        }
        
        // Fetch fresh
        try {
          const instrumentKey = `NSE_EQ|${normalized}`;
          const quote = await upstoxService.getMarketQuote(instrumentKey);
          
          if (quote?.data?.[instrumentKey]) {
            const data = quote.data[instrumentKey];
            const priceData = {
              symbol: normalized,
              price: parseFloat(data.last_price),
              change: parseFloat(data.change),
              changePercent: parseFloat(data.pChange),
              timestamp: new Date().toISOString(),
              source: 'upstox'
            };
            
            // Cache it
            cacheService.setPrice(normalized, priceData);
            return { ...priceData, cached: false };
          }
        } catch (e) {
          return { symbol: normalized, error: 'Fetch failed', cached: false };
        }
      })
    );
    
    const prices = results.map(r => 
      r.status === 'fulfilled' ? r.value : { error: r.reason?.message }
    );
    
    const duration = Date.now() - startTime;
    logger.info(`[Batch Prices] ${symbols.length} symbols in ${duration}ms`);
    
    res.json({
      success: true,
      count: prices.length,
      responseTimeMs: duration,
      data: prices
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'BATCH_PRICE_FAILED'
    });
  }
};
