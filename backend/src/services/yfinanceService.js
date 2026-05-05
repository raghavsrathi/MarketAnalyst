/**
 * yfinance Service
 * --------------
 * Provides historical data for Indian stocks using Python yfinance
 * Node.js spawns Python process for yfinance calls
 */

const { spawn } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');

class YFinanceService {
  constructor() {
    this.pythonScript = path.join(__dirname, 'python', 'yfinance_fetcher.py');
  }

  /**
   * Detect if symbol is Indian (NSE) or US
   * Indian stocks: RELIANCE, TCS, INFY, HDFCBANK, etc. (no dot, 3-10 chars)
   * US stocks: AAPL, MSFT, GOOGL (no suffix needed)
   * @param {string} symbol - Raw symbol input
   * @returns {string} Formatted ticker for yfinance
   */
  formatSymbol(symbol) {
    if (!symbol) return null;
    
    const cleanSymbol = symbol.toUpperCase().trim();
    
    // Already has exchange suffix
    if (cleanSymbol.includes('.NS') || cleanSymbol.includes('.BO')) {
      return cleanSymbol;
    }
    
    // Common Indian stock patterns (5+ chars or known NSE symbols)
    const commonIndianStocks = [
      'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'BAJFINANCE',
      'BHARTIARTL', 'KOTAKBANK', 'ITC', 'HINDUNILVR', 'LT', 'AXISBANK', 'MARUTI',
      'TATAMOTORS', 'ASIANPAINT', 'SUNPHARMA', 'TITAN', 'ADANIENT', 'ULTRACEMCO',
      'NESTLEIND', 'WIPRO', 'POWERGRID', 'NTPC', 'COALINDIA', 'TATASTEEL',
      'HCLTECH', 'TECHM', 'INDUSINDBK', 'GRASIM', 'ONGC', 'ADANIPORTS',
      'CIPLA', 'DRREDDY', 'DIVISLAB', 'EICHERMOT', 'JSWSTEEL', 'HEROMOTOCO',
      'BRITANNIA', 'BAJAJFINSV', 'APOLLOHOSP', 'HINDALCO', 'M&M', 'BAJAJ-AUTO'
    ];
    
    if (commonIndianStocks.includes(cleanSymbol) || cleanSymbol.length >= 5) {
      return `${cleanSymbol}.NS`;
    }
    
    // Default: US stock (no suffix)
    return cleanSymbol;
  }

  /**
   * Validate inputs before fetching
   */
  validateInputs(symbol, interval, period) {
    const errors = [];
    
    if (!symbol || typeof symbol !== 'string') {
      errors.push('Symbol is required');
    }
    
    const validIntervals = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'];
    if (!validIntervals.includes(interval)) {
      errors.push(`Invalid interval: ${interval}. Valid: ${validIntervals.join(', ')}`);
    }
    
    const validPeriods = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'];
    if (!validPeriods.includes(period)) {
      errors.push(`Invalid period: ${period}. Valid: ${validPeriods.join(', ')}`);
    }
    
    return errors.length > 0 ? errors : null;
  }

  /**
   * Fetch historical OHLCV data from yfinance
   * @param {string} symbol - Symbol (e.g., RELIANCE or AAPL)
   * @param {string} interval - 1d, 1h, 15m, 5m
   * @param {string} period - 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
   * @returns {Promise<Object>} { success: true, data: [], symbol: '' }
   */
  async fetchHistoricalData(symbol, interval = '1d', period = '1y') {
    // Validate inputs
    const validationErrors = this.validateInputs(symbol, interval, period);
    if (validationErrors) {
      return { success: false, error: validationErrors.join(', ') };
    }

    const formattedSymbol = this.formatSymbol(symbol);
    if (!formattedSymbol) {
      return { success: false, error: 'Invalid symbol format' };
    }

    logger.info(`[yfinance] Fetching ${formattedSymbol} (${interval}, ${period})`);

    return new Promise((resolve) => {
      const pythonPath = process.env.PYTHON_PATH || 'python';
      
      const pythonProcess = spawn(pythonPath, [
        '-c',
        this.getPythonScript(formattedSymbol, interval, period)
      ]);

      let dataString = '';
      let errorString = '';
      let timeout;

      // 30 second timeout
      timeout = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        logger.error(`[yfinance] Timeout for ${formattedSymbol}`);
        resolve({ success: false, error: 'Request timeout - yfinance took too long' });
      }, 30000);

      pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code !== 0 && code !== null) {
          logger.error(`[yfinance] Python error (code ${code}): ${errorString}`);
          return resolve({ success: false, error: `Python error: ${errorString || 'Unknown error'}` });
        }

        try {
          const result = JSON.parse(dataString);
          if (result.error) {
            logger.warn(`[yfinance] No data for ${formattedSymbol}: ${result.error}`);
            return resolve({ success: false, error: result.error });
          }
          
          const data = result.data || [];
          if (data.length === 0) {
            logger.warn(`[yfinance] Empty data for ${formattedSymbol}`);
            return resolve({ success: false, error: 'No historical data available' });
          }

          logger.info(`[yfinance] Success: ${data.length} bars for ${formattedSymbol}`);
          resolve({ 
            success: true, 
            data, 
            symbol: formattedSymbol,
            count: data.length 
          });
        } catch (parseError) {
          logger.error(`[yfinance] Parse error for ${formattedSymbol}:`, parseError.message);
          logger.error(`[yfinance] Raw output: ${dataString.substring(0, 200)}`);
          resolve({ success: false, error: 'Failed to parse yfinance response' });
        }
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        logger.error(`[yfinance] Failed to start Python:`, error.message);
        resolve({ 
          success: false, 
          error: 'Python not available. Run: pip install yfinance pandas' 
        });
      });
    });
  }

  /**
   * Python script to fetch data from yfinance
   */
  getPythonScript(tickerSymbol, interval, period) {
    return `
import yfinance as yf
import json
import sys

try:
    ticker = yf.Ticker("${tickerSymbol}")
    df = ticker.history(period="${period}", interval="${interval}")
    
    if df.empty:
        print(json.dumps({"error": "No data available for ${tickerSymbol}"}))
        sys.exit(0)
    
    # Reset index to make Date a column
    df = df.reset_index()
    
    # Rename columns (remove spaces)
    df.columns = [col.replace(' ', '') for col in df.columns]
    
    # Convert to records
    records = df.to_dict('records')
    
    # Format dates and clean values
    import math
    for record in records:
        # Format dates
        if 'Date' in record:
            record['Date'] = record['Date'].strftime('%Y-%m-%d %H:%M:%S') if hasattr(record['Date'], 'strftime') else str(record['Date'])
        elif 'Datetime' in record:
            record['Datetime'] = record['Datetime'].strftime('%Y-%m-%d %H:%M:%S') if hasattr(record['Datetime'], 'strftime') else str(record['Datetime'])
        
        # Clean NaN values
        for key in ['Open', 'High', 'Low', 'Close', 'Volume']:
            if key in record:
                val = record[key]
                if val is None or (isinstance(val, float) and math.isnan(val)):
                    record[key] = None
    
    print(json.dumps({"data": records}))
    
except Exception as e:
    error_msg = str(e)
    print(json.dumps({"error": error_msg}))
    sys.exit(0)
`;
  }

  /**
   * Alternative: HTTP-based approach using a microservice
   * If Python integration is complex, deploy a separate Python FastAPI service
   */
  async fetchViaMicroservice(symbol, interval = '1d', period = '1y') {
    const serviceUrl = process.env.YFINANCE_SERVICE_URL || 'http://localhost:8000';
    
    try {
      const axios = require('axios');
      const response = await axios.get(`${serviceUrl}/historical`, {
        params: { symbol, interval, period }
      });
      return response.data;
    } catch (error) {
      logger.error('Microservice fetch failed:', error.message);
      throw error;
    }
  }
}

module.exports = new YFinanceService();
