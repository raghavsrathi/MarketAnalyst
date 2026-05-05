/**
 * Database Configuration
 * ----------------------
 * Supports MS SQL Server (primary) and MongoDB (caching)
 */

const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// MS SQL Server Configuration
const getMSSQLConfig = () => {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    // Try building from individual components
    if (process.env.DB_HOST) {
      const host = process.env.DB_HOST;
      const port = process.env.DB_PORT || 1433;
      const database = process.env.DB_NAME;
      const user = process.env.DB_USER;
      const password = process.env.DB_PASSWORD;
      
      if (!database || !user || !password) {
        logger.warn('Database configuration incomplete, using in-memory mode');
        return null;
      }
      
      const sequelize = new Sequelize(database, user, password, {
        dialect: 'mssql',
        host: host,
        port: port,
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        dialectOptions: {
          options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
            enableArithAbort: true
          }
        },
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000
        },
        define: {
          timestamps: true,
          underscored: false
        }
      });
      
      return sequelize;
    }
    
    logger.warn('DATABASE_URL not set, using in-memory mode for development');
    return null;
  }

  // Parse connection string for MSSQL
  const sequelize = new Sequelize(dbUrl, {
    dialect: 'mssql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true
      }
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false
    }
  });

  return sequelize;
};

// MongoDB Configuration
const connectMongoDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URL;
  
  if (!mongoUri) {
    logger.warn('MongoDB URI not set, skipping MongoDB connection');
    return null;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
};

// Test MS SQL Connection
const testMSSQLConnection = async (sequelize) => {
  if (!sequelize) return false;
  
  try {
    await sequelize.authenticate();
    logger.info('MS SQL Server connection established successfully');
    return true;
  } catch (error) {
    logger.error('Unable to connect to MS SQL Server:', error.message);
    return false;
  }
};

// Get connection string for MSSQL (for use with other libraries)
const getMSSQLConnectionString = () => {
  return process.env.DATABASE_URL || 
    `Server=${process.env.DB_HOST || 'localhost'};Database=${process.env.DB_NAME};User Id=${process.env.DB_USER};Password=${process.env.DB_PASSWORD};Encrypt=${process.env.DB_ENCRYPT || 'true'};TrustServerCertificate=${process.env.DB_TRUST_CERT || 'true'};`;
};

module.exports = {
  getMSSQLConfig,
  connectMongoDB,
  testMSSQLConnection,
  getMSSQLConnectionString,
  sequelize: getMSSQLConfig()
};
