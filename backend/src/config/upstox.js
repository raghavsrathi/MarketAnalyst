/**
 * Upstox API Configuration
 * -------------------------
 * Manages OAuth2 flow and API endpoints
 */

const logger = require('../utils/logger');

const UPSTOX_CONFIG = {
  // API Endpoints
  BASE_URL: 'https://api.upstox.com/v2',
  AUTH_URL: 'https://api.upstox.com/v2/login/authorization/dialog',
  TOKEN_URL: 'https://api.upstox.com/v2/login/authorization/token',
  
  // WebSocket
  WS_URL: 'wss://api.upstox.com/v2/feed/market-data-feed',
  
  // Get credentials from env
  get apiKey() {
    return process.env.UPSTOX_API_KEY;
  },
  
  get apiSecret() {
    return process.env.UPSTOX_SECRET;
  },
  
  get redirectUri() {
    return process.env.UPSTOX_REDIRECT_URI || 'http://localhost:3000/auth/callback';
  },
  
  get accessToken() {
    return process.env.UPSTOX_ACCESS_TOKEN;
  },
  
  set accessToken(token) {
    process.env.UPSTOX_ACCESS_TOKEN = token;
  }
};

// Validate configuration
const validateConfig = () => {
  const required = ['UPSTOX_API_KEY', 'UPSTOX_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.error(`Missing required Upstox config: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
};

// Generate OAuth login URL
const getAuthUrl = () => {
  if (!validateConfig()) {
    throw new Error('Upstox configuration incomplete');
  }
  
  const params = new URLSearchParams({
    client_id: UPSTOX_CONFIG.apiKey,
    redirect_uri: UPSTOX_CONFIG.redirectUri,
    response_type: 'code'
  });
  
  return `${UPSTOX_CONFIG.AUTH_URL}?${params.toString()}`;
};

module.exports = {
  UPSTOX_CONFIG,
  validateConfig,
  getAuthUrl
};
