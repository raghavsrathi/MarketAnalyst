/**
 * Stocks Controller
 * ---------------
 * Handles stock listing and instrument management
 */

const { Instrument } = require('../models');
const upstoxService = require('../services/upstoxService');
const logger = require('../utils/logger');

/**
 * Get all stocks from database
 * GET /stocks
 */
exports.getAllStocks = async (req, res) => {
  try {
    const { exchange = 'NSE', type, search, page = 1, limit = 50 } = req.query;
    
    const where = { is_active: true };
    
    if (exchange) where.exchange = exchange;
    if (type) where.instrument_type = type;
    if (search) {
      where[Op.or] = [
        { tradingsymbol: { [Op.iLike]: `%${search}%` } },
        { name: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const offset = (page - 1) * limit;
    
    const { count, rows: stocks } = await Instrument.findAndCountAll({
      where,
      order: [['tradingsymbol', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: {
        stocks,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Failed to fetch stocks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get stock by symbol
 * GET /stocks/:symbol
 */
exports.getStockBySymbol = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { exchange = 'NSE' } = req.query;
    
    const stock = await Instrument.findOne({
      where: {
        tradingsymbol: symbol.toUpperCase(),
        exchange: exchange.toUpperCase(),
        is_active: true
      }
    });
    
    if (!stock) {
      return res.status(404).json({
        success: false,
        error: `Stock ${symbol} not found on ${exchange}`
      });
    }
    
    res.json({
      success: true,
      data: stock
    });
  } catch (error) {
    logger.error('Failed to fetch stock:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Sync instruments from Upstox
 * POST /stocks/sync
 */
exports.syncInstruments = async (req, res) => {
  try {
    const exchanges = ['NSE', 'BSE', 'NFO', 'BFO', 'CDS', 'MCX'];
    const results = {};
    
    for (const exchange of exchanges) {
      try {
        logger.info(`Syncing instruments for ${exchange}`);
        const instruments = await upstoxService.fetchInstruments(exchange);
        
        // Bulk upsert to database
        for (const instrument of instruments) {
          await Instrument.upsert({
            instrument_key: instrument.instrument_key,
            exchange_token: instrument.exchange_token,
            tradingsymbol: instrument.tradingsymbol,
            name: instrument.name,
            exchange: instrument.exchange,
            instrument_type: instrument.instrument_type,
            segment: instrument.segment,
            lot_size: instrument.lot_size,
            tick_size: instrument.tick_size,
            expiry: instrument.expiry,
            strike: instrument.strike,
            option_type: instrument.option_type,
            is_active: true,
            last_updated: new Date()
          });
        }
        
        results[exchange] = instruments.length;
      } catch (error) {
        logger.error(`Failed to sync ${exchange}:`, error.message);
        results[exchange] = `Error: ${error.message}`;
      }
    }
    
    res.json({
      success: true,
      message: 'Instrument sync completed',
      results
    });
  } catch (error) {
    logger.error('Sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get popular stocks (hardcoded list)
 * GET /stocks/popular
 */
exports.getPopularStocks = async (req, res) => {
  const popularStocks = [
    { symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE' },
    { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE' },
    { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank', exchange: 'NSE' },
    { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE' },
    { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', exchange: 'NSE' },
    { symbol: 'ITC', name: 'ITC Ltd', exchange: 'NSE' },
    { symbol: 'BAJFINANCE', name: 'Bajaj Finance', exchange: 'NSE' },
    { symbol: 'TATAMOTORS', name: 'Tata Motors', exchange: 'NSE' }
  ];
  
  res.json({
    success: true,
    data: popularStocks
  });
};
