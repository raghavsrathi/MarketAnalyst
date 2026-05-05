/**
 * Models Index
 * ------------
 * Export all database models
 */

const Instrument = require('./Instrument');
const AnalysisCache = require('./AnalysisCache');

// Define associations if any
// Instrument.hasMany(AnalysisCache, { foreignKey: 'symbol', sourceKey: 'tradingsymbol' });

module.exports = {
  Instrument,
  AnalysisCache
};
