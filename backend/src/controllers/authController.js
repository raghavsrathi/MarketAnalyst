/**
 * Auth Controller
 * ---------------
 * Handles Upstox OAuth2 flow
 */

const upstoxService = require('../services/upstoxService');
const { getAuthUrl } = require('../config/upstox');
const logger = require('../utils/logger');

/**
 * Generate Upstox login URL
 * GET /auth/login
 */
exports.getLoginUrl = (req, res) => {
  try {
    const authUrl = getAuthUrl();
    
    res.json({
      success: true,
      authUrl,
      message: 'Redirect user to this URL to authorize'
    });
  } catch (error) {
    logger.error('Failed to generate auth URL:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Handle OAuth callback
 * GET /auth/callback?code=xxx
 */
exports.handleCallback = async (req, res) => {
  try {
    const { code, error } = req.query;
    
    if (error) {
      logger.error('OAuth error from Upstox:', error);
      return res.status(400).json({
        success: false,
        error: `OAuth error: ${error}`
      });
    }
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code required'
      });
    }
    
    // Exchange code for token
    const tokenData = await upstoxService.exchangeCodeForToken(code);
    
    res.json({
      success: true,
      message: 'Authentication successful',
      data: {
        accessToken: tokenData.accessToken,
        expiresIn: tokenData.expiresIn,
        userId: tokenData.userId,
        userName: tokenData.userName
      }
    });
    
  } catch (error) {
    logger.error('OAuth callback failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Set access token manually (for testing)
 * POST /auth/token
 */
exports.setToken = (req, res) => {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'accessToken required'
      });
    }
    
    upstoxService.setAccessToken(accessToken);
    
    res.json({
      success: true,
      message: 'Access token set successfully'
    });
  } catch (error) {
    logger.error('Failed to set token:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get current user profile
 * GET /auth/profile
 */
exports.getProfile = async (req, res) => {
  try {
    const profile = await upstoxService.getUserProfile();
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Failed to get profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
