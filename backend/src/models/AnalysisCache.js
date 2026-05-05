/**
 * Analysis Cache Model (MS SQL Server)
 * ------------------------------------
 * Stores cached technical analysis results
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class AnalysisCache extends Model {}

AnalysisCache.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  symbol: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  exchange: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'NSE'
  },
  interval: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: '1d'
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Complete analysis result JSON'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  sequelize,
  tableName: 'analysis_cache',
  indexes: [
    { fields: ['symbol', 'exchange', 'interval'], unique: true },
    { fields: ['expires_at'] }
  ]
});

// Auto-cleanup expired cache entries
AnalysisCache.cleanup = async () => {
  await AnalysisCache.destroy({
    where: {
      expires_at: { [DataTypes.Op.lt]: new Date() }
    }
  });
};

module.exports = AnalysisCache;
