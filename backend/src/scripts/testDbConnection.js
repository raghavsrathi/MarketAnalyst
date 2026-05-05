#!/usr/bin/env node
/**
 * Test MS SQL Database Connection
 * -------------------------------
 * Run: node src/scripts/testDbConnection.js
 */

require('dotenv').config();

const { testMSSQLConnection, sequelize } = require('../config/database');
const logger = require('../utils/logger');

const testConnection = async () => {
  console.log('🔌 Testing MS SQL Server Connection...\n');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log('  DB_HOST:', process.env.DB_HOST || 'NOT SET');
  console.log('  DB_PORT:', process.env.DB_PORT || '1433 (default)');
  console.log('  DB_NAME:', process.env.DB_NAME || 'NOT SET');
  console.log('  DB_USER:', process.env.DB_USER || 'NOT SET');
  console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
  console.log('  DB_ENCRYPT:', process.env.DB_ENCRYPT || 'true (default)');
  console.log('  DB_TRUST_CERT:', process.env.DB_TRUST_CERT || 'true (default)');
  console.log();
  
  if (!sequelize) {
    console.error('❌ FAILED: Database configuration incomplete');
    console.log('\nRequired variables:');
    console.log('  DB_HOST, DB_NAME, DB_USER, DB_PASSWORD');
    process.exit(1);
  }
  
  try {
    const connected = await testMSSQLConnection(sequelize);
    
    if (connected) {
      console.log('✅ SUCCESS: Connected to MS SQL Server');
      
      // Try a simple query
      try {
        const [results] = await sequelize.query('SELECT @@VERSION as version');
        console.log('\n📊 SQL Server Version:');
        console.log(' ', results[0].version.substring(0, 100) + '...');
      } catch (e) {
        console.log('⚠️  Could not get version:', e.message);
      }
      
      process.exit(0);
    } else {
      console.error('❌ FAILED: Could not connect to MS SQL Server');
      console.log('\nTroubleshooting:');
      console.log('  1. Check SQL Server is running');
      console.log('  2. Verify credentials in .env file');
      console.log('  3. Ensure TCP/IP is enabled in SQL Server Configuration Manager');
      console.log('  4. Check firewall allows port 1433');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
};

testConnection();
