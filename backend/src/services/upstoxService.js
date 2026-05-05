/**
 * Upstox Service
 * --------------
 * Handles all Upstox API interactions
 */

const axios = require('axios');
const { UPSTOX_CONFIG } = require('../config/upstox');
const logger = require('../utils/logger');

class UpstoxService {
  constructor() {
    this.baseURL = UPSTOX_CONFIG.BASE_URL;
    this.accessToken = UPSTOX_CONFIG.accessToken;
  }

  // Set/update access token
  setAccessToken(token) {
    this.accessToken = token;
    UPSTOX_CONFIG.accessToken = token;
  }

  // Get auth headers
  getHeaders() {
    if (!this.accessToken) {
      throw new Error('Access token not set. Complete OAuth first.');
    }
    
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code) {
    try {
      logger.info('Exchanging authorization code for access token');
      
      const response = await axios.post(
        UPSTOX_CONFIG.TOKEN_URL,
        {
          code,
          client_id: UPSTOX_CONFIG.apiKey,
          client_secret: UPSTOX_CONFIG.apiSecret,
          redirect_uri: UPSTOX_CONFIG.redirectUri,
          grant_type: 'authorization_code'
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      if (response.data && response.data.access_token) {
        this.setAccessToken(response.data.access_token);
        logger.info('Access token obtained successfully');
        return {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresIn: response.data.expires_in,
          userId: response.data.user_id,
          userName: response.data.user_name
        };
      }
      
      throw new Error('Invalid response from Upstox');
    } catch (error) {
      logger.error('OAuth token exchange failed:', error.response?.data || error.message);
      throw new Error(`OAuth failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Fetch all instruments
  async fetchInstruments(exchange = 'NSE') {
    try {
      logger.info(`Fetching instruments for ${exchange}`);
      
      const response = await axios.get(
        `${this.baseURL}/instruments/${exchange}`,
        {
          headers: this.getHeaders(),
          responseType: 'json'
        }
      );

      if (Array.isArray(response.data)) {
        logger.info(`Fetched ${response.data.length} instruments from ${exchange}`);
        return response.data;
      }
      
      if (response.data.data) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      logger.error(`Failed to fetch instruments for ${exchange}:`, error.message);
      throw error;
    }
  }

  // Get market quote for a symbol
  async getMarketQuote(instrumentKey) {
    try {
      const response = await axios.get(
        `${this.baseURL}/market-quote/quotes`,
        {
          headers: this.getHeaders(),
          params: { instrument_key: instrumentKey }
        }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to get market quote for ${instrumentKey}:`, error.message);
      throw error;
    }
  }

  // Get historical candle data
  async getHistoricalData(instrumentKey, interval = '1d', toDate, fromDate) {
    try {
      const params = {
        instrument_key: instrumentKey,
        interval,
        to_date: toDate || new Date().toISOString().split('T')[0]
      };

      if (fromDate) {
        params.from_date = fromDate;
      }

      const response = await axios.get(
        `${this.baseURL}/historical-candle/${instrumentKey}/${interval}/${toDate}/${fromDate || ''}`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      logger.error(`Failed to get historical data for ${instrumentKey}:`, error.message);
      throw error;
    }
  }

  // Get user profile
  async getUserProfile() {
    try {
      const response = await axios.get(
        `${this.baseURL}/user/profile`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to get user profile:', error.message);
      throw error;
    }
  }

  // Get funds and margin
  async getFunds() {
    try {
      const response = await axios.get(
        `${this.baseURL}/user/get-funds-and-margin`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to get funds:', error.message);
      throw error;
    }
  }

  // Place order
  async placeOrder(orderParams) {
    try {
      const response = await axios.post(
        `${this.baseURL}/order/place`,
        orderParams,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to place order:', error.message);
      throw error;
    }
  }

  // Get order status
  async getOrderStatus(orderId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/order/history`,
        {
          headers: this.getHeaders(),
          params: { order_id: orderId }
        }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to get order status:', error.message);
      throw error;
    }
  }

  // Cancel order
  async cancelOrder(orderId) {
    try {
      const response = await axios.delete(
        `${this.baseURL}/order/cancel`,
        {
          headers: this.getHeaders(),
          params: { order_id: orderId }
        }
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to cancel order:', error.message);
      throw error;
    }
  }
}

module.exports = new UpstoxService();
