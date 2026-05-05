/**
 * Request Validator Middleware
 * ----------------------------
 * Validates API requests for symbols, quantity, side, etc.
 */

const { body, query, validationResult } = require('express-validator');

// Common Indian stock symbols pattern
const VALID_SYMBOL_PATTERN = /^[A-Z0-9\-.]{1,25}$/;

// Validation rules
const validateSymbol = query('symbol')
  .exists().withMessage('Symbol is required')
  .trim()
  .toUpperCase()
  .matches(VALID_SYMBOL_PATTERN).withMessage('Invalid symbol format')
  .isLength({ min: 1, max: 25 }).withMessage('Symbol must be 1-25 characters');

const validateInterval = query('interval')
  .optional()
  .trim()
  .isIn(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1mo'])
  .withMessage('Invalid interval. Use: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1mo');

const validateOrderBody = [
  body('symbol')
    .exists().withMessage('Symbol is required')
    .trim()
    .toUpperCase()
    .matches(VALID_SYMBOL_PATTERN)
    .withMessage('Invalid symbol format'),
  
  body('qty')
    .exists().withMessage('Quantity is required')
    .isInt({ min: 1, max: 100000 })
    .withMessage('Quantity must be 1-100000'),
  
  body('side')
    .exists().withMessage('Side is required')
    .trim()
    .toUpperCase()
    .isIn(['BUY', 'SELL'])
    .withMessage('Side must be BUY or SELL'),
  
  body('orderType')
    .optional()
    .trim()
    .toUpperCase()
    .isIn(['MARKET', 'LIMIT', 'SL', 'SL-M'])
    .withMessage('Order type must be MARKET, LIMIT, SL, or SL-M'),
  
  body('price')
    .optional()
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Price must be 0.01 - 1,000,000'),
  
  body('triggerPrice')
    .optional()
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Trigger price must be 0.01 - 1,000,000')
];

// Middleware to check validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
};

// Symbol sanitization middleware
const sanitizeSymbol = (req, res, next) => {
  if (req.query.symbol) {
    req.query.symbol = req.query.symbol.toUpperCase().trim();
  }
  if (req.body.symbol) {
    req.body.symbol = req.body.symbol.toUpperCase().trim();
  }
  next();
};

module.exports = {
  validateSymbol,
  validateInterval,
  validateOrderBody,
  handleValidationErrors,
  sanitizeSymbol
};
