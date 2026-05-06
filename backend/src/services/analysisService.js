/**
 * Technical Analysis Service
 * ------------------------
 * Calculates indicators: SMA, EMA, RSI, Trend Detection
 */

const logger = require('../utils/logger');

class AnalysisService {
  /**
   * Calculate Simple Moving Average
   * @param {Array} data - Array of price data with 'Close' field
   * @param {number} period - SMA period
   * @returns {Array} Data with SMA values
   */
  calculateSMA(data, period = 20) {
    const result = [...data];
    const key = `sma${period}`; // e.g. sma20, sma50
    
    for (let i = 0; i < result.length; i++) {
      if (i < period - 1) {
        result[i][key] = null;
        continue;
      }
      
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += result[i - j].Close;
      }
      result[i][key] = sum / period;
    }
    
    return result;
  }

  /**
   * Calculate Exponential Moving Average
   * @param {Array} data - Array of price data
   * @param {number} period - EMA period
   * @returns {Array} Data with EMA values
   */
  calculateEMA(data, period = 20) {
    const result = [...data];
    const key = `ema${period}`;
    const multiplier = 2 / (period + 1);

    for (let i = 0; i < result.length; i++) {
      if (i < period - 1) {
        result[i][key] = null;
        continue;
      }

      if (i === period - 1) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += result[i - j].Close;
        }
        result[i][key] = sum / period;
      } else {
        result[i][key] = result[i].Close * multiplier + result[i - 1][key] * (1 - multiplier);
      }
    }

    return result;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   * @param {Array} data - Array of price data
   * @param {number} period - RSI period (default 14)
   * @returns {Array} Data with RSI values
   */
  calculateRSI(data, period = 14) {
    const result = [...data];
    
    // Calculate price changes
    for (let i = 1; i < result.length; i++) {
      result[i].change = result[i].Close - result[i - 1].Close;
      result[i].gain = result[i].change > 0 ? result[i].change : 0;
      result[i].loss = result[i].change < 0 ? Math.abs(result[i].change) : 0;
    }
    
    // Calculate RSI
    for (let i = 0; i < result.length; i++) {
      if (i < period) {
        result[i].rsi = null;
        continue;
      }
      
      // Average gains and losses using Wilder's smoothing
      let avgGain = 0;
      let avgLoss = 0;
      
      for (let j = 0; j < period; j++) {
        avgGain += result[i - j].gain || 0;
        avgLoss += result[i - j].loss || 0;
      }
      
      avgGain /= period;
      avgLoss /= period;
      
      if (avgLoss === 0) {
        result[i].rsi = 100;
      } else {
        const rs = avgGain / avgLoss;
        result[i].rsi = 100 - (100 / (1 + rs));
      }
    }
    
    return result;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   * @param {Array} data - Array of price data
   * @returns {Array} Data with MACD values
   */
  calculateMACD(data) {
    const result = [...data];
    const ema12Period = 12;
    const ema26Period = 26;
    const signalPeriod = 9;
    
    // Calculate EMA12 and EMA26
    const multiplier12 = 2 / (ema12Period + 1);
    const multiplier26 = 2 / (ema26Period + 1);
    const signalMultiplier = 2 / (signalPeriod + 1);
    
    for (let i = 0; i < result.length; i++) {
      // EMA12
      if (i < ema12Period - 1) {
        result[i].ema12 = null;
      } else if (i === ema12Period - 1) {
        let sum = 0;
        for (let j = 0; j < ema12Period; j++) {
          sum += result[i - j].Close;
        }
        result[i].ema12 = sum / ema12Period;
      } else {
        result[i].ema12 = result[i].Close * multiplier12 + result[i - 1].ema12 * (1 - multiplier12);
      }
      
      // EMA26
      if (i < ema26Period - 1) {
        result[i].ema26 = null;
      } else if (i === ema26Period - 1) {
        let sum = 0;
        for (let j = 0; j < ema26Period; j++) {
          sum += result[i - j].Close;
        }
        result[i].ema26 = sum / ema26Period;
      } else {
        result[i].ema26 = result[i].Close * multiplier26 + result[i - 1].ema26 * (1 - multiplier26);
      }
      
      // MACD Line = EMA12 - EMA26
      if (result[i].ema12 !== null && result[i].ema26 !== null) {
        result[i].macd = result[i].ema12 - result[i].ema26;
      } else {
        result[i].macd = null;
      }
    }
    
    // Calculate Signal Line (EMA9 of MACD)
    for (let i = 0; i < result.length; i++) {
      if (i < ema26Period + signalPeriod - 2) {
        result[i].macdSignal = null;
      } else if (i === ema26Period + signalPeriod - 2) {
        let sum = 0;
        let count = 0;
        for (let j = 0; j < signalPeriod && (i - j) >= 0; j++) {
          if (result[i - j].macd !== null) {
            sum += result[i - j].macd;
            count++;
          }
        }
        result[i].macdSignal = count > 0 ? sum / count : null;
      } else {
        result[i].macdSignal = result[i].macd * signalMultiplier + result[i - 1].macdSignal * (1 - signalMultiplier);
      }
      
      // MACD Histogram = MACD - Signal
      if (result[i].macd !== null && result[i].macdSignal !== null) {
        result[i].macdHistogram = result[i].macd - result[i].macdSignal;
      } else {
        result[i].macdHistogram = null;
      }
    }
    
    return result;
  }

  calculateBollingerBands(data, period = 20, multiplier = 2) {
    const result = [...data];

    for (let i = 0; i < result.length; i++) {
      if (i < period - 1) {
        result[i].bbUpper = null;
        result[i].bbMiddle = null;
        result[i].bbLower = null;
        continue;
      }

      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += result[i - j].Close;
      }
      const sma = sum / period;

      let variance = 0;
      for (let j = 0; j < period; j++) {
        variance += Math.pow(result[i - j].Close - sma, 2);
      }
      const stdDev = Math.sqrt(variance / period);

      result[i].bbMiddle = sma;
      result[i].bbUpper = sma + (multiplier * stdDev);
      result[i].bbLower = sma - (multiplier * stdDev);
    }

    return result;
  }

  /**
   * Detect trend based on moving averages
   * @param {Array} data - Data with SMA values
   * @returns {Object} Trend information
   */
  detectTrend(data) {
    if (data.length < 50) {
      return { direction: 'UNKNOWN', strength: 0 };
    }

    const lastIdx = data.length - 1;
    const current = data[lastIdx];
    const prev20 = data[lastIdx - 20] || current;
    
    const sma20 = current.sma20;
    const sma50 = current.sma50;
    const price = current.Close;
    
    if (!sma20 || !sma50) {
      return { direction: 'UNKNOWN', strength: 0 };
    }

    // Determine trend
    let direction = 'NEUTRAL';
    let strength = 0;

    // Strong bullish: Price > SMA20 > SMA50
    if (price > sma20 && sma20 > sma50) {
      direction = 'BULLISH';
      strength = (price - sma50) / sma50 * 100; // % above SMA50
    }
    // Strong bearish: Price < SMA20 < SMA50
    else if (price < sma20 && sma20 < sma50) {
      direction = 'BEARISH';
      strength = (sma50 - price) / sma50 * 100; // % below SMA50
    }
    // Weak bullish: Price > SMA50
    else if (price > sma50) {
      direction = 'WEAK_BULLISH';
      strength = (price - sma50) / sma50 * 100;
    }
    // Weak bearish: Price < SMA50
    else if (price < sma50) {
      direction = 'WEAK_BEARISH';
      strength = (sma50 - price) / sma50 * 100;
    }

    // Cap strength at 10%
    strength = Math.min(strength, 10);

    return {
      direction,
      strength: parseFloat(strength.toFixed(2)),
      sma20: parseFloat(sma20.toFixed(2)),
      sma50: parseFloat(sma50.toFixed(2)),
      price: parseFloat(price.toFixed(2))
    };
  }

  /**
   * Generate trading signal based on analysis
   * @param {Object} trend - Trend analysis
   * @param {number} rsi - Current RSI value
   * @returns {Object} Trading signal
   */
  generateSignal(trend, rsi) {
    let recommendation = 'HOLD';
    let confidence = 'LOW';
    let reasons = [];

    // RSI-based signals
    if (rsi < 30) {
      reasons.push('RSI oversold (<30)');
      if (trend.direction.includes('BULLISH')) {
        recommendation = 'BUY';
        confidence = 'HIGH';
        reasons.push('Oversold in uptrend - potential reversal');
      } else if (trend.direction === 'BEARISH') {
        recommendation = 'HOLD';
        confidence = 'MEDIUM';
        reasons.push('Oversold but strong downtrend - wait for confirmation');
      } else {
        recommendation = 'BUY';
        confidence = 'MEDIUM';
      }
    } else if (rsi > 70) {
      reasons.push('RSI overbought (>70)');
      if (trend.direction.includes('BEARISH')) {
        recommendation = 'SELL';
        confidence = 'HIGH';
        reasons.push('Overbought in downtrend - potential reversal');
      } else if (trend.direction === 'BULLISH') {
        recommendation = 'HOLD';
        confidence = 'MEDIUM';
        reasons.push('Overbought but strong uptrend - avoid shorting');
      } else {
        recommendation = 'SELL';
        confidence = 'MEDIUM';
      }
    } else {
      reasons.push(`RSI neutral (${rsi.toFixed(1)})`);
    }

    // Trend-based signals
    if (trend.direction === 'BULLISH' && rsi > 40 && rsi < 70) {
      recommendation = 'BUY';
      confidence = trend.strength > 5 ? 'HIGH' : 'MEDIUM';
      reasons.push(`Strong uptrend (${trend.strength.toFixed(1)}% above SMA50)`);
    } else if (trend.direction === 'BEARISH' && rsi < 60 && rsi > 30) {
      recommendation = 'SELL';
      confidence = trend.strength > 5 ? 'HIGH' : 'MEDIUM';
      reasons.push(`Strong downtrend (${trend.strength.toFixed(1)}% below SMA50)`);
    } else if (trend.direction.includes('BULLISH')) {
      reasons.push(`Uptrend detected (${trend.direction})`);
    } else if (trend.direction.includes('BEARISH')) {
      reasons.push(`Downtrend detected (${trend.direction})`);
    }

    return {
      recommendation,
      confidence,
      reasons
    };
  }

  /**
   * Perform complete technical analysis
   * @param {Array} ohlcvData - Array of OHLCV data
   * @returns {Object} Complete analysis result
   */
  analyze(ohlcvData) {
    if (!ohlcvData || ohlcvData.length < 50) {
      throw new Error('Insufficient data for analysis. Need at least 50 data points.');
    }

    logger.info(`Analyzing ${ohlcvData.length} data points`);

    // Calculate indicators
    logger.info(`[Analysis] Calculating indicators for ${ohlcvData.length} data points`);
    let data = this.calculateSMA(ohlcvData, 20);
    data = this.calculateSMA(data, 50);
    data = this.calculateEMA(data, 9);
    data = this.calculateEMA(data, 21);
    data = this.calculateEMA(data, 200);
    data = this.calculateRSI(data, 14);
    data = this.calculateMACD(data);
    data = this.calculateBollingerBands(data, 20);

    // Get latest values
    const lastIdx = data.length - 1;
    const lastData = data[lastIdx];
    const prevData = data[lastIdx - 1] || lastData;

    // Detect trend
    const trend = this.detectTrend(data);

    // Generate signal
    const signal = this.generateSignal(trend, lastData.rsi || 50);

    // Calculate support and resistance
    const highs = data.slice(-20).map(d => d.High);
    const lows = data.slice(-20).map(d => d.Low);
    const resistance = Math.max(...highs);
    const support = Math.min(...lows);

    // Calculate Bollinger width
    const bbWidth = lastData.bbMiddle !== 0 
      ? ((lastData.bbUpper - lastData.bbLower) / lastData.bbMiddle * 100)
      : 0;

    // Helper: Extract time-series for an indicator
    const extractTimeSeries = (indicatorKey, data) => {
      return data
        .filter(d => d[indicatorKey] !== null && d[indicatorKey] !== undefined)
        .map(d => ({
          time: d.Date || d.time || Math.floor(new Date(d.date).getTime() / 1000),
          value: parseFloat(d[indicatorKey].toFixed(2))
        }))
        .sort((a, b) => a.time - b.time);
    };

    // Build time-series for chart rendering
    const timeSeries = {
      ema_short: extractTimeSeries('ema9', data),
      ema_long: extractTimeSeries('ema21', data),
      bb_upper: extractTimeSeries('bbUpper', data),
      bb_middle: extractTimeSeries('bbMiddle', data),
      bb_lower: extractTimeSeries('bbLower', data)
    };

    // Build nested indicators object (scalar values for UI components)
    const indicators = {
      rsi: lastData.rsi !== null ? parseFloat(lastData.rsi.toFixed(2)) : null,
      macd: {
        line: lastData.macd !== null ? parseFloat(lastData.macd.toFixed(2)) : null,
        signal: lastData.macdSignal !== null ? parseFloat(lastData.macdSignal.toFixed(2)) : null,
        histogram: lastData.macdHistogram !== null ? parseFloat(lastData.macdHistogram.toFixed(2)) : null
      },
      ema: {
        ema9: lastData.ema9 !== null ? parseFloat(lastData.ema9.toFixed(2)) : null,
        ema21: lastData.ema21 !== null ? parseFloat(lastData.ema21.toFixed(2)) : null,
        ema200: lastData.ema200 !== null ? parseFloat(lastData.ema200.toFixed(2)) : null
      },
      bollinger: {
        upper: lastData.bbUpper !== null ? parseFloat(lastData.bbUpper.toFixed(2)) : null,
        middle: lastData.bbMiddle !== null ? parseFloat(lastData.bbMiddle.toFixed(2)) : null,
        lower: lastData.bbLower !== null ? parseFloat(lastData.bbLower.toFixed(2)) : null,
        width: parseFloat(bbWidth.toFixed(2))
      }
    };

    logger.info(`[Analysis] Computed indicators:`, indicators);

    return {
      currentPrice: parseFloat(lastData.Close.toFixed(2)),
      change: parseFloat(((lastData.Close - prevData.Close) / prevData.Close * 100).toFixed(2)),
      volume: lastData.Volume,
      indicators,
      timeSeries,
      trend: {
        direction: trend.direction,
        strength: trend.strength,
        sma20: trend.sma20,
        sma50: trend.sma50
      },
      levels: {
        support: parseFloat(support.toFixed(2)),
        resistance: parseFloat(resistance.toFixed(2))
      },
      signal,
      lastUpdated: new Date().toISOString(),
      dataPoints: data.length
    };
  }
}

module.exports = new AnalysisService();
