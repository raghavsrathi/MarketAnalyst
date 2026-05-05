#!/usr/bin/env python3
"""
Standalone yfinance data fetcher for Node.js backend
----------------------------------------------------
Can be called directly or used as a microservice
"""

import sys
import json
import argparse
import yfinance as yf
import pandas as pd


def fetch_historical_data(symbol: str, interval: str = "1d", period: str = "1y"):
    """
    Fetch historical OHLCV data for a symbol
    
    Args:
        symbol: Stock symbol (e.g., RELIANCE, TCS)
        interval: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
        period: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    
    Returns:
        dict: { "data": [...], "error": None } or { "data": None, "error": "..." }
    """
    try:
        # Add .NS suffix for NSE stocks
        ticker_symbol = f"{symbol}.NS"
        
        ticker = yf.Ticker(ticker_symbol)
        df = ticker.history(period=period, interval=interval)
        
        if df.empty:
            return {"data": None, "error": f"No data available for {symbol}"}
        
        # Reset index to make date a column
        df = df.reset_index()
        
        # Standardize column names
        df.columns = [col.replace(' ', '').replace('Date', 'date').replace('Datetime', 'date') 
                      for col in df.columns]
        
        # Convert to list of dicts
        records = []
        for _, row in df.iterrows():
            record = {
                "date": row['date'].strftime('%Y-%m-%d %H:%M:%S') if hasattr(row['date'], 'strftime') else str(row['date']),
                "open": round(float(row['Open']), 2),
                "high": round(float(row['High']), 2),
                "low": round(float(row['Low']), 2),
                "close": round(float(row['Close']), 2),
                "volume": int(row['Volume'])
            }
            records.append(record)
        
        return {"data": records, "error": None, "symbol": symbol, "count": len(records)}
        
    except Exception as e:
        return {"data": None, "error": str(e), "symbol": symbol}


def fetch_multiple_symbols(symbols: list, interval: str = "1d", period: str = "1mo"):
    """Fetch data for multiple symbols"""
    results = {}
    for symbol in symbols:
        result = fetch_historical_data(symbol, interval, period)
        results[symbol] = result
    return results


def main():
    parser = argparse.ArgumentParser(description='yfinance data fetcher')
    parser.add_argument('--symbol', '-s', required=True, help='Stock symbol')
    parser.add_argument('--interval', '-i', default='1d', help='Interval (1m, 5m, 15m, 1h, 1d)')
    parser.add_argument('--period', '-p', default='1y', help='Period (1d, 1mo, 1y, 5y)')
    parser.add_argument('--format', '-f', default='json', choices=['json', 'csv'])
    
    args = parser.parse_args()
    
    result = fetch_historical_data(args.symbol, args.interval, args.period)
    
    if args.format == 'json':
        print(json.dumps(result))
    elif args.format == 'csv' and result['data']:
        df = pd.DataFrame(result['data'])
        print(df.to_csv(index=False))


if __name__ == "__main__":
    # Check if being called with CLI args
    if len(sys.argv) > 1:
        main()
    else:
        # Read from stdin (for Node.js integration)
        try:
            input_data = sys.stdin.read()
            if input_data:
                params = json.loads(input_data)
                result = fetch_historical_data(
                    params.get('symbol'),
                    params.get('interval', '1d'),
                    params.get('period', '1y')
                )
                print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
