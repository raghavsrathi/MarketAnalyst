/**
 * Order Controller
 * ----------------
 * Handles order placement with duplicate prevention
 */

const upstoxService = require('../services/upstoxService');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * Place order
 * POST /order
 * Body: { symbol, qty, side, orderType, price, triggerPrice }
 */
exports.placeOrder = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { symbol, qty, side, orderType = 'MARKET', price, triggerPrice } = req.body;
    const normalizedSymbol = symbol.toUpperCase().trim();
    
    // Generate order fingerprint for deduplication
    const orderFingerprint = `${req.ip}:${normalizedSymbol}:${qty}:${side}:${orderType}:${Math.floor(Date.now() / 30000)}`;
    
    // Check for duplicate order (within 30 seconds)
    if (cacheService.isDuplicateOrder(orderFingerprint)) {
      logger.warn(`[Order] Duplicate prevented: ${normalizedSymbol} ${side} ${qty}`);
      return res.status(429).json({
        success: false,
        error: 'Duplicate order detected. Please wait 30 seconds.',
        code: 'DUPLICATE_ORDER',
        retryAfter: 30
      });
    }
    
    // Check if Upstox is authenticated
    if (!upstoxService.accessToken) {
      return res.status(503).json({
        success: false,
        error: 'Upstox not authenticated. Complete OAuth flow first.',
        code: 'UPSTOX_NOT_AUTH'
      });
    }
    
    // Lock the order
    cacheService.setOrderLock(orderFingerprint, { symbol, qty, side, time: Date.now() });
    
    // Validate quantity limits
    if (qty < 1 || qty > 100000) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be 1-100000',
        code: 'INVALID_QUANTITY'
      });
    }
    
    // Get instrument key
    const instrumentKey = `NSE_EQ|${normalizedSymbol}`;
    
    // Prepare order params
    const orderParams = {
      instrument_key: instrumentKey,
      symbol: normalizedSymbol,
      quantity: parseInt(qty),
      side: side.toUpperCase(),
      order_type: orderType.toUpperCase(),
      product: 'D', // Delivery (CNC) - change to 'I' for intraday (MIS)
      validity: 'DAY'
    };
    
    // Add price for limit orders
    if (orderType === 'LIMIT' && price) {
      orderParams.price = parseFloat(price);
    }
    
    // Add trigger price for SL orders
    if ((orderType === 'SL' || orderType === 'SL-M') && triggerPrice) {
      orderParams.trigger_price = parseFloat(triggerPrice);
    }
    
    logger.info(`[Order] Placing ${side} order for ${qty} ${normalizedSymbol} @ ${orderType}`);
    
    // Place order via Upstox
    const orderResult = await upstoxService.placeOrder(orderParams);
    
    const duration = Date.now() - startTime;
    logger.info(`[Order] Success in ${duration}ms: ${orderResult.order_id || 'N/A'}`);
    
    res.json({
      success: true,
      message: 'Order placed successfully',
      orderId: orderResult.order_id,
      orderRef: orderResult.order_ref_id,
      status: orderResult.status,
      responseTimeMs: duration,
      data: orderResult
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[Order] Failed after ${duration}ms:`, error);
    
    // Check for specific Upstox errors
    if (error.message?.includes('insufficient funds')) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient funds',
        code: 'INSUFFICIENT_FUNDS'
      });
    }
    
    if (error.message?.includes('margin')) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient margin',
        code: 'INSUFFICIENT_MARGIN'
      });
    }
    
    if (error.message?.includes('market closed')) {
      return res.status(400).json({
        success: false,
        error: 'Market is closed',
        code: 'MARKET_CLOSED'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'ORDER_FAILED',
      responseTimeMs: duration
    });
  }
};

/**
 * Get order status
 * GET /order/:orderId/status
 */
exports.getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!upstoxService.accessToken) {
      return res.status(503).json({
        success: false,
        error: 'Upstox not authenticated'
      });
    }
    
    const status = await upstoxService.getOrderStatus(orderId);
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    logger.error('[Order Status] Failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cancel order
 * POST /order/:orderId/cancel
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!upstoxService.accessToken) {
      return res.status(503).json({
        success: false,
        error: 'Upstox not authenticated'
      });
    }
    
    const result = await upstoxService.cancelOrder(orderId);
    
    res.json({
      success: true,
      message: 'Order cancelled',
      data: result
    });
    
  } catch (error) {
    logger.error('[Order Cancel] Failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
