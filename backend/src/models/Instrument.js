/**
 * Instrument Model (MS SQL Server via Sequelize)
 * ----------------------------------------------
 * Stores all available trading instruments from Upstox
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Instrument extends Model {}

Instrument.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  instrument_key: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique instrument key from Upstox'
  },
  exchange_token: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  tradingsymbol: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Trading symbol (e.g., RELIANCE)'
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Company name'
  },
  exchange: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Exchange code: NSE, BSE, NFO, etc.'
  },
  instrument_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'EQ, FUT, OPT, etc.'
  },
  segment: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Market segment'
  },
  lot_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
  },
  tick_size: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true
  },
  expiry: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'For derivatives'
  },
  strike: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'For options'
  },
  option_type: {
    type: DataTypes.STRING(5),
    allowNull: true,
    comment: 'CE or PE for options'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  last_price: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: true
  },
  last_updated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  tableName: 'instruments',
  indexes: [
    { fields: ['exchange'] },
    { fields: ['instrument_type'] },
    { fields: ['tradingsymbol'] },
    { fields: ['is_active'] },
    { 
      fields: ['tradingsymbol', 'exchange'],
      unique: true,
      name: 'symbol_exchange_unique'
    }
  ]
});

module.exports = Instrument;
