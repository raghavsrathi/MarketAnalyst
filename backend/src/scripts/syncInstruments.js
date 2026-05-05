#!/usr/bin/env node
/**
 * Sync Instruments Script
 * ----------------------
 * Fetches all instruments from Upstox and stores in DB
 * Run with: npm run sync-instruments
 */

require('dotenv').config();

const { Instrument } = require('../models');
const upstoxService = require('../services/upstoxService');
const { connectMongoDB, testMSSQLConnection, sequelize } = require('../config/database');
const logger = require('../utils/logger');

const syncInstruments = async () => {
  try {
    logger.info('Starting instrument sync...');
    
    // Connect database
    await testMSSQLConnection(sequelize);
    
    const exchanges = ['NSE', 'BSE'];
    const results = {};
    
    for (const exchange of exchanges) {
      try {
        logger.info(`Fetching instruments for ${exchange}...`);
        
        const instruments = await upstoxService.fetchInstruments(exchange);
        logger.info(`Fetched ${instruments.length} instruments from ${exchange}`);
        
        // Filter for equity only
        const equities = instruments.filter(i => 
          i.instrument_type === 'EQ' && i.segment === 'NSE'
        );
        
        logger.info(`Processing ${equities.length} equity instruments...`);
        
        // Bulk upsert
        let inserted = 0;
        let updated = 0;
        
        for (const inst of equities) {
          const [record, created] = await Instrument.upsert({
            instrument_key: inst.instrument_key,
            exchange_token: inst.exchange_token,
            tradingsymbol: inst.tradingsymbol,
            name: inst.name,
            exchange: inst.exchange,
            instrument_type: inst.instrument_type,
            segment: inst.segment,
            lot_size: inst.lot_size,
            tick_size: inst.tick_size,
            expiry: inst.expiry,
            strike: inst.strike,
            option_type: inst.option_type,
            is_active: true,
            last_updated: new Date()
          });
          
          if (created) inserted++;
          else updated++;
        }
        
        results[exchange] = {
          total: instruments.length,
          equities: equities.length,
          inserted,
          updated
        };
        
        logger.info(`${exchange} sync complete: ${inserted} new, ${updated} updated`);
        
      } catch (error) {
        logger.error(`Failed to sync ${exchange}:`, error.message);
        results[exchange] = { error: error.message };
      }
    }
    
    logger.info('Instrument sync completed!', results);
    process.exit(0);
    
  } catch (error) {
    logger.error('Sync script failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  syncInstruments();
}

module.exports = syncInstruments;
