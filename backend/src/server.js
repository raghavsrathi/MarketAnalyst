/**
 * Indian Stock Analysis API
 * -------------------------
 * Production-ready Node.js + Express backend
 * 
 * Features:
 * - Upstox OAuth integration
 * - yfinance historical data
 * - Technical analysis (SMA, EMA, RSI, Trend)
 * - WebSocket for real-time data
 * - MS SQL Server database
 * - Rate limiting & CORS
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');

const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { performanceMonitor, getStats } = require('./middleware/performance');
const marketDataSocket = require('./websocket/marketDataSocket');
const { connectMongoDB, testMSSQLConnection, sequelize } = require('./config/database');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 8080;

// ==================== SECURITY MIDDLEWARE ====================

// CORS configuration - allow multiple origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  'https://trading-chart-analyzer.netlify.app'
].filter(Boolean);

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In development, allow all
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance monitoring (tracks response times)
app.use(performanceMonitor);

// Rate limiting (general)
app.use(apiLimiter);

// ==================== ROUTES ====================
app.use('/', routes);

// 404 handler
app.use(notFound);

// Performance stats endpoint (admin use)
app.get('/performance', (req, res) => {
  const stats = getStats();
  res.json({
    success: true,
    data: stats
  });
});

// Global error handler
app.use(errorHandler);

// ==================== SERVER SETUP ====================

const server = http.createServer(app);

// Initialize WebSocket
marketDataSocket.init(server);

// ==================== DATABASE CONNECTION ====================

const connectDatabases = async () => {
  try {
    // Connect MS SQL Server (if configured)
    if (sequelize) {
      await testMSSQLConnection(sequelize);
      await sequelize.sync({ alter: true }); // Sync models
      logger.info('MS SQL Server models synced');
    }
    
    // Connect MongoDB (if configured for caching)
    await connectMongoDB();
    
    logger.info('Database connections established');
  } catch (error) {
    logger.warn('Database connection issue:', error.message);
    logger.info('Continuing without database (some features may be limited)');
  }
};

// ==================== START SERVER ====================

const startServer = async () => {
  try {
    // Connect databases first
    await connectDatabases();
    
    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || '*'}`);
      logger.info(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws/market-data`);
      
      if (!process.env.UPSTOX_API_KEY) {
        logger.warn('⚠️  UPSTOX_API_KEY not set - OAuth features disabled');
      }
      
      if (!process.env.DATABASE_URL && !process.env.DB_HOST && !process.env.MONGODB_URI) {
        logger.warn('⚠️  No database configured - Using in-memory mode');
      }
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ==================== GRACEFUL SHUTDOWN ====================

const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      if (sequelize) {
        await sequelize.close();
        logger.info('MS SQL Server connection closed');
      }
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
    
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  if (error.code === 'EADDRINUSE') {
    // Let index.js handle port fallback - don't crash
    logger.warn(`Port already in use, will try next port`);
    return;
  }
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export for index.js to start
module.exports = { app, server, startServer };
