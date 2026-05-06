/**
 * api.js
 * --------
 * Service layer for communicating with the FastAPI backend.
 * Handles fetching analysis data and error handling.
 */

// Backend API URL - defaults to local backend on port 8080
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * NORMALISATION UTILITY
 * ---------------------
 * Maps PascalCase API keys to camelCase at the data-fetch boundary.
 * This ensures the rest of the app always works with camelCase fields.
 * 
 * @param {Object} record - Raw API record (e.g., candle with Date, Open, High, Low, Close)
 * @returns {Object} Normalized record with camelCase keys (time, open, high, low, close)
 */
export function normaliseApiRecord(record) {
  if (!record || typeof record !== 'object') return record;
  
  return {
    // Time field: API uses 'Date', we use 'time'
    time: record.Date ?? record.time,
    
    // OHLC fields: API uses PascalCase, we use camelCase
    open: record.Open ?? record.open,
    high: record.High ?? record.high,
    low: record.Low ?? record.low,
    close: record.Close ?? record.close,
    
    // Volume: API uses 'Volume', we use 'volume'
    volume: record.Volume ?? record.volume,
    
    // Indicator value fields
    value: record.Value ?? record.value ?? record.Close ?? record.close,
    
    // Preserve any other fields that may exist
    ...record,
  };
}

/**
 * Helper to normalise an array of API records (e.g., candles, indicator series)
 * @param {Array} data - Array of raw API records
 * @returns {Array} Array of normalized records
 */
export function normaliseApiArray(data) {
  if (!Array.isArray(data)) return [];
  return data.map(normaliseApiRecord);
}

/**
 * Supported timeframe intervals
 */
export const INTERVALS = [
  { value: '1m', label: '1 Minute', description: 'Intraday scalping' },
  { value: '5m', label: '5 Minutes', description: 'Short-term trades' },
  { value: '15m', label: '15 Minutes', description: 'Swing trading' },
  { value: '30m', label: '30 Minutes', description: 'Medium-term' },
  { value: '1h', label: '1 Hour', description: 'Hourly analysis' },
  { value: '4h', label: '4 Hours', description: 'Multi-hour trends' },
  { value: '1d', label: '1 Day', description: 'Daily charts (default)', default: true },
  { value: '1wk', label: '1 Week', description: 'Weekly trends' },
  { value: '1mo', label: '1 Month', description: 'Long-term view' },
];

/**
 * Popular symbols for quick selection
 */
export const POPULAR_SYMBOLS = [
  // Indian Stocks (NSE)
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', category: 'Indian Stock' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', category: 'Indian Stock' },
  { symbol: 'INFY.NS', name: 'Infosys Ltd', category: 'Indian Stock' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', category: 'Indian Stock' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', category: 'Indian Stock' },
  { symbol: 'SBIN.NS', name: 'State Bank of India', category: 'Indian Stock' },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance', category: 'Indian Stock' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', category: 'Indian Stock' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', category: 'Indian Stock' },
  { symbol: 'ITC.NS', name: 'ITC Ltd', category: 'Indian Stock' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever', category: 'Indian Stock' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro', category: 'Indian Stock' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank', category: 'Indian Stock' },
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki', category: 'Indian Stock' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors', category: 'Indian Stock' },
];

/**
 * Fetch full technical analysis for a symbol and interval
 * @param {string} symbol - Stock/crypto symbol (e.g., 'AAPL', 'BTC-USD')
 * @param {string} interval - Timeframe interval (e.g., '1d', '1h')
 * @returns {Promise<Object>} Analysis data from the API (transformed for Dashboard)
 */
export async function fetchAnalysis(symbol, interval = '1d') {
  const url = new URL(`${API_BASE_URL}/analyze`);
  url.searchParams.append('symbol', symbol.toUpperCase().trim());
  url.searchParams.append('interval', interval);

  const response = await fetch(url);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.detail || `Failed to fetch analysis: ${response.statusText}`,
      response.status,
      errorData
    );
  }

  const result = await response.json();
  console.log('[api] fetchAnalysis response', result);
  
  // Handle API error responses
  if (!result.success) {
    throw new ApiError(
      result.error || 'Analysis failed',
      response.status,
      result
    );
  }

  const apiData = result?.data?.data ?? result?.data;
  console.log('[api] fetchAnalysis apiData', apiData);

  if (!apiData || typeof apiData !== 'object') {
    throw new ApiError('Invalid API response format', response.status, result);
  }

  const backendData = apiData;
  const normalizedCandles = normaliseApiArray(backendData.candles);
  const lastCandle = normalizedCandles[normalizedCandles.length - 1];
  const referenceTime = lastCandle?.time ?? lastCandle?.Date ?? lastCandle?.date ?? null;
  
  // Build series from backend timeSeries (if available) or scalar values
  const buildSeries = (value) => {
    if (value === null || value === undefined || referenceTime === null) return [];
    return [{ time: referenceTime, value }];
  };

  // Priority: use backend timeSeries if available, otherwise fall back to scalar-built arrays
  const backendTimeSeries = backendData.timeSeries || {};
  const emaShortSeries = Array.isArray(backendTimeSeries.ema_short) && backendTimeSeries.ema_short.length > 0
    ? backendTimeSeries.ema_short
    : buildSeries(backendData.ema?.ema9 ?? backendData.ema9 ?? null);
  const emaLongSeries = Array.isArray(backendTimeSeries.ema_long) && backendTimeSeries.ema_long.length > 0
    ? backendTimeSeries.ema_long
    : buildSeries(backendData.ema?.ema21 ?? backendData.ema21 ?? null);
  const bbUpperSeries = Array.isArray(backendTimeSeries.bb_upper) && backendTimeSeries.bb_upper.length > 0
    ? backendTimeSeries.bb_upper
    : buildSeries(backendData.bollinger?.upper ?? backendData.bollingerUpper ?? null);
  const bbMiddleSeries = Array.isArray(backendTimeSeries.bb_middle) && backendTimeSeries.bb_middle.length > 0
    ? backendTimeSeries.bb_middle
    : buildSeries(backendData.bollinger?.middle ?? backendData.bollingerMiddle ?? null);
  const bbLowerSeries = Array.isArray(backendTimeSeries.bb_lower) && backendTimeSeries.bb_lower.length > 0
    ? backendTimeSeries.bb_lower
    : buildSeries(backendData.bollinger?.lower ?? backendData.bollingerLower ?? null);
  const macdLineSeries = Array.isArray(backendTimeSeries.macd_line) && backendTimeSeries.macd_line.length > 0
    ? backendTimeSeries.macd_line
    : buildSeries(backendData.macd?.line ?? backendData.macd_line ?? null);
  const macdSignalSeries = Array.isArray(backendTimeSeries.macd_signal) && backendTimeSeries.macd_signal.length > 0
    ? backendTimeSeries.macd_signal
    : buildSeries(backendData.macd?.signal ?? backendData.macd_signal ?? null);
  const macdHistogramSeries = Array.isArray(backendTimeSeries.macd_histogram) && backendTimeSeries.macd_histogram.length > 0
    ? backendTimeSeries.macd_histogram
    : buildSeries(backendData.macd?.histogram ?? backendData.macd_histogram ?? null);

  const transformedData = {
    ...backendData,
    recommendation: backendData.signal?.recommendation || backendData.signal?.signal || 'HOLD',
    confidence: backendData.signal?.confidence || 'LOW',
    score: backendData.trend?.strength || 0,
    support: backendData.levels?.support || backendData.support,
    resistance: backendData.levels?.resistance || backendData.resistance,
    trend: backendData.trend?.direction || backendData.trend || 'NEUTRAL',
    trend_strength: backendData.trend?.strength || 0,
    rsi: backendData.rsi ?? backendData.indicators?.rsi14 ?? backendData.indicators?.rsi ?? null,
    rsi_condition: backendData.rsi_condition ??
      (backendData.rsi ?? backendData.indicators?.rsi14 ?? backendData.indicators?.rsi) > 70 ? 'Overbought' :
      (backendData.rsi ?? backendData.indicators?.rsi14 ?? backendData.indicators?.rsi) < 30 ? 'Oversold' : 'Neutral',
    macd: backendData.macd ?? {
      line: backendData.macd_line ?? backendData.indicators?.macd_line ?? null,
      signal: backendData.macd_signal ?? backendData.indicators?.macd_signal ?? null,
      histogram: backendData.macd_histogram ?? backendData.indicators?.macd_histogram ?? null
    },
    ema: backendData.ema ?? {
      ema9: backendData.ema9 ?? backendData.indicators?.ema_short ?? null,
      ema21: backendData.ema21 ?? backendData.indicators?.ema_long ?? null,
      ema200: backendData.ema200 ?? backendData.indicators?.ema_200 ?? null
    },
    bollinger: backendData.bollinger ?? {
      upper: backendData.bollingerUpper ?? backendData.indicators?.bb_upper ?? null,
      middle: backendData.bollingerMiddle ?? backendData.indicators?.bb_middle ?? null,
      lower: backendData.bollingerLower ?? backendData.indicators?.bb_lower ?? null,
      width: backendData.bollingerWidth ?? backendData.indicators?.bb_width ?? null
    },
    indicators: {
      ema_short: emaShortSeries,
      ema_long: emaLongSeries,
      bb_upper: bbUpperSeries,
      bb_middle: bbMiddleSeries,
      bb_lower: bbLowerSeries,
      macd_line: macdLineSeries,
      macd_signal: macdSignalSeries,
      macd_histogram: macdHistogramSeries,
      rsi: backendData.rsi ?? backendData.indicators?.rsi14 ?? backendData.indicators?.rsi ?? null,
      macd: backendData.macd ?? {
        line: backendData.macd_line ?? backendData.indicators?.macd_line ?? null,
        signal: backendData.macd_signal ?? backendData.indicators?.macd_signal ?? null,
        histogram: backendData.macd_histogram ?? backendData.indicators?.macd_histogram ?? null,
      },
      ema: backendData.ema ?? {
        ema9: backendData.ema9 ?? backendData.indicators?.ema_short ?? null,
        ema21: backendData.ema21 ?? backendData.indicators?.ema_long ?? null,
        ema200: backendData.ema200 ?? backendData.indicators?.ema_200 ?? null,
      },
      bollinger: backendData.bollinger ?? {
        upper: backendData.bollingerUpper ?? backendData.indicators?.bb_upper ?? null,
        middle: backendData.bollingerMiddle ?? backendData.indicators?.bb_middle ?? null,
        lower: backendData.bollingerLower ?? backendData.indicators?.bb_lower ?? null,
        width: backendData.bollingerWidth ?? backendData.indicators?.bb_width ?? null,
      },
    },
    current_price: backendData.current_price ?? backendData.currentPrice ?? backendData.price,
    price_change: backendData.price_change ?? backendData.change,
    patterns: backendData.patterns || [],
    candlestick_patterns: backendData.candlestick_patterns || [],
    signal_breakdown: backendData.signal?.reasons ||
      [backendData.trend?.direction, `RSI: ${backendData.rsi ?? backendData.indicators?.rsi14}`].filter(Boolean),
    summary: backendData.signal?.reasons?.[0] || `${backendData.trend?.direction || 'Neutral'} trend detected`,
    candles: normalizedCandles,
    series: normaliseApiArray(backendData.series),
  };

  return transformedData;
}

/**
 * Fetch supported intervals from the API
 * @returns {Promise<string[]>} List of supported intervals
 */
export async function fetchIntervals() {
  const url = `${API_BASE_URL}/intervals`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new ApiError('Failed to fetch intervals', response.status);
  }

  const data = await response.json();
  return data.intervals;
}

/**
 * Health check for the API
 * @returns {Promise<Object>} Health status
 */
export async function checkHealth() {
  const url = `${API_BASE_URL}/health`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new ApiError('API health check failed', response.status);
  }

  return response.json();
}

/**
 * Custom API error class with status code
 */
export class ApiError extends Error {
  constructor(message, statusCode, data = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

/**
 * WebSocket connection for live updates (bonus feature)
 * @param {string} symbol - Symbol to monitor
 * @param {string} interval - Interval for updates
 * @param {function} onMessage - Callback for new data
 * @param {function} onError - Callback for errors
 * @returns {WebSocket} WebSocket instance
 */
export function createLiveWebSocket(symbol, interval, onMessage, onError) {
  const wsUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
  const url = `${wsUrl}/ws/market-data`;
  
  const ws = new WebSocket(url);
  
  ws.onopen = () => {
    console.log(`WebSocket connected: ${symbol} ${interval}`);
    // Subscribe to the symbol
    ws.send(JSON.stringify({
      type: 'subscribe',
      instruments: [symbol.toUpperCase()]
    }));
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.error) {
        onError?.(new ApiError(data.error, 500));
      } else {
        onMessage?.(data);
      }
    } catch (err) {
      onError?.(err);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    onError?.(error);
  };
  
  ws.onclose = () => {
    console.log('WebSocket connection closed');
  };
  
  return ws;
}

/**
 * Get color class for recommendation
 * @param {string} recommendation - buy, sell, or hold
 * @returns {string} Tailwind color class
 */
export function getRecommendationColor(recommendation) {
  switch (recommendation?.toLowerCase()) {
    case 'buy':
      return 'text-buy bg-buy/10 border-buy';
    case 'sell':
      return 'text-sell bg-sell/10 border-sell';
    case 'hold':
      return 'text-hold bg-hold/10 border-hold';
    default:
      return 'text-gray-400 bg-gray-400/10 border-gray-400';
  }
}

/**
 * Get signal icon based on value
 * @param {string} signal - buy, sell, neutral
 * @returns {string} Icon indicator
 */
export function getSignalIcon(signal) {
  switch (signal?.toLowerCase()) {
    case 'buy':
      return '↑';
    case 'sell':
      return '↓';
    default:
      return '→';
  }
}
