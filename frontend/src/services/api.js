/**
 * api.js
 * --------
 * Service layer for communicating with the FastAPI backend.
 * Handles fetching analysis data and error handling.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://theanalyst-production.up.railway.app';

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
  // US Stocks
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'US Stock' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', category: 'US Stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'US Stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'US Stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', category: 'US Stock' },
  { symbol: 'META', name: 'Meta Platforms', category: 'US Stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', category: 'US Stock' },
  { symbol: 'AMD', name: 'AMD Inc.', category: 'US Stock' },
  { symbol: 'NFLX', name: 'Netflix Inc.', category: 'US Stock' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', category: 'ETF' },
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
  // Crypto
  { symbol: 'BTC-USD', name: 'Bitcoin USD', category: 'Crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum USD', category: 'Crypto' },
  { symbol: 'SOL-USD', name: 'Solana USD', category: 'Crypto' },
  { symbol: 'ADA-USD', name: 'Cardano USD', category: 'Crypto' },
  { symbol: 'DOT-USD', name: 'Polkadot USD', category: 'Crypto' },
  { symbol: 'MATIC-USD', name: 'Polygon USD', category: 'Crypto' },
  { symbol: 'AVAX-USD', name: 'Avalanche USD', category: 'Crypto' },
  { symbol: 'LINK-USD', name: 'Chainlink USD', category: 'Crypto' },
];

/**
 * Fetch full technical analysis for a symbol and interval
 * @param {string} symbol - Stock/crypto symbol (e.g., 'AAPL', 'BTC-USD')
 * @param {string} interval - Timeframe interval (e.g., '1d', '1h')
 * @returns {Promise<Object>} Analysis data from the API
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

  return response.json();
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
  const url = `${wsUrl}/ws/live?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&refresh_seconds=30`;
  
  const ws = new WebSocket(url);
  
  ws.onopen = () => {
    console.log(`WebSocket connected: ${symbol} ${interval}`);
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
    console.log('WebSocket disconnected');
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
