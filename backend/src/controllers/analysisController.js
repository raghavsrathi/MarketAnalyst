/**
 * Analysis Controller
 * ------------------
 * Handles technical analysis requests
 */

const yfinanceService = require('../services/yfinanceService');
const analysisService = require('../services/analysisService');
const upstoxService = require('../services/upstoxService');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

// In-memory cache TTL (seconds)
const MEM_CACHE_TTL = 120; // 2 minutes for fast responses
const DB_CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS) || 300; // 5 minutes for DB

/**
 * Analyze a stock
 * GET /analyze?symbol=RELIANCE&interval=1d
 */
exports.analyzeStock = async (req, res) => {
  try {
    const { symbol, interval = '1d', period = '1y', force = false } = req.query;
    
    // Validate inputs
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
        code: 'MISSING_SYMBOL'
      });
    }
    
    const normalizedSymbol = symbol.toUpperCase().trim();
    const cacheKey = `${normalizedSymbol}:${interval}:${period}`;
    const startTime = Date.now();
    
    // Check in-memory cache first (unless force=true)
    if (!force) {
      const memCached = cacheService.getAnalysis(cacheKey);
      if (memCached) {
        const duration = Date.now() - startTime;
        logger.info(`[MemCache HIT] ${normalizedSymbol} ${interval} (${duration}ms)`);
        return res.json({
          success: true,
          data: memCached.data,
          cached: true,
          cacheType: 'memory',
          responseTimeMs: duration
        });
      }
    }
    
    // Validate interval
    const validIntervals = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({
        success: false,
        error: `Invalid interval: ${interval}. Valid: ${validIntervals.join(', ')}`,
        code: 'INVALID_INTERVAL'
      });
    }

    // Fetch historical data from yfinance
    logger.info(`[Analyze] Fetching ${normalizedSymbol} (${interval}, ${period})`);
    const yfResult = await yfinanceService.fetchHistoricalData(
      normalizedSymbol,
      interval,
      period
    );
    
    // Handle yfinance errors
    if (!yfResult.success) {
      logger.warn(`[Analyze] yfinance failed for ${normalizedSymbol}: ${yfResult.error}`);
      return res.status(404).json({
        success: false,
        error: yfResult.error || `No data available for symbol: ${normalizedSymbol}`,
        code: 'NO_DATA'
      });
    }
    
    const ohlcvData = yfResult.data;
    const formattedSymbol = yfResult.symbol || normalizedSymbol;
    
    if (!ohlcvData || ohlcvData.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No data available for symbol: ${normalizedSymbol}`,
        code: 'NO_DATA'
      });
    }
    
    logger.info(`[Analyze] Received ${ohlcvData.length} data points for ${formattedSymbol}`);
    
    // Transform data for analysis (Python returns uppercase keys)
    const transformedData = ohlcvData.map(d => ({
      Date: d.Date || d.date,
      Open: d.Open || d.open,
      High: d.High || d.high,
      Low: d.Low || d.low,
      Close: d.Close || d.close,
      Volume: d.Volume || d.volume
    }));
    
    // Validate transformed data has no undefined Close values
    const validData = transformedData.filter(d => d.Close !== undefined && d.Close !== null);
    if (validData.length === 0) {
      logger.error(`[Analyze] All data points have undefined Close values for ${normalizedSymbol}`);
      return res.status(500).json({
        success: false,
        error: 'Invalid data format from yfinance',
        code: 'DATA_FORMAT_ERROR'
      });
    }
    
    if (validData.length < 50) {
      return res.status(400).json({
        success: false,
        error: `Insufficient data points (${validData.length}). Need at least 50.`,
        code: 'INSUFFICIENT_DATA'
      });
    }
    
    // Perform technical analysis
    logger.info(`[Analyze] Running technical analysis on ${validData.length} data points`);
    let analysis;
    try {
      analysis = analysisService.analyze(validData);
    } catch (analysisError) {
      logger.error(`[Analyze] Analysis computation failed:`, analysisError.message);
      return res.status(500).json({
        success: false,
        error: 'Technical analysis computation failed',
        code: 'ANALYSIS_COMPUTATION_ERROR'
      });
    }
    
    // Try to get real-time price from Upstox if available (only for NSE stocks)
    if (formattedSymbol.endsWith('.NS')) {
      try {
        if (upstoxService.accessToken) {
          const instrumentKey = `NSE_EQ|${normalizedSymbol}`;
          const quote = await upstoxService.getMarketQuote(instrumentKey);
          if (quote && quote.data) {
            const stockData = quote.data[instrumentKey];
            if (stockData) {
              analysis.realTimePrice = stockData.last_price;
              analysis.realTimeChange = stockData.change;
              analysis.realTimeChangePercent = stockData.pChange;
            }
          }
        }
      } catch (error) {
        logger.warn(`[Analyze] Could not fetch real-time data for ${normalizedSymbol}:`, error.message);
      }
    }
    
    // Determine exchange
    const exchange = formattedSymbol.endsWith('.NS') ? 'NSE' : 'US';
    
    // Prepare response
    const response = {
      symbol: normalizedSymbol,
      exchange,
      formattedSymbol,
      interval,
      ...analysis,
      candles: transformedData.slice(-100) // Last 100 candles for charting
    };
    
    // Cache the result in memory
    cacheService.setAnalysis(cacheKey, response, MEM_CACHE_TTL);
    
    res.json({
      success: true,
      data: response,
      cached: false,
      responseTimeMs: Date.now() - startTime
    });
    
  } catch (error) {
    logger.error('[Analyze] Unhandled error:', error);
    
    // Always return JSON, never crash
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Get historical data only
 * GET /historical?symbol=RELIANCE&interval=1d&period=1y
 */
exports.getHistoricalData = async (req, res) => {
  try {
    const { symbol, interval = '1d', period = '1y' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol required'
      });
    }
    
    const data = await yfinanceService.fetchHistoricalData(
      symbol.toUpperCase(),
      interval,
      period
    );
    
    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      count: data.length,
      data
    });
  } catch (error) {
    logger.error('Failed to get historical data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get market quote from Upstox
 * GET /quote?symbol=RELIANCE
 */
exports.getQuote = async (req, res) => {
  try {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol required'
      });
    }
    
    if (!upstoxService.accessToken) {
      return res.status(503).json({
        success: false,
        error: 'Upstox not authenticated. Complete OAuth flow first.'
      });
    }
    
    const instrumentKey = `NSE_EQ|${symbol.toUpperCase()}`;
    const quote = await upstoxService.getMarketQuote(instrumentKey);
    
    res.json({
      success: true,
      data: quote
    });
  } catch (error) {
    logger.error('Failed to get quote:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Clear analysis cache
 * POST /analysis/clear-cache
 */
exports.clearCache = async (req, res) => {
  try {
    cacheService.flushAll();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    logger.error('Failed to clear cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
