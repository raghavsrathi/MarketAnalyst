"""
data_fetcher.py
---------------
Production-grade Yahoo Finance data fetcher implementing DataFetcherInterface.
"""

import asyncio
from typing import List, Optional

import pandas as pd
import yfinance as yf
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from config import get_settings
from core import (
    DataFetcherInterface,
    DataFetchError,
    InvalidSymbolError,
)
from logging_config import get_logger, log_execution_time

logger = get_logger(__name__)


class YahooFinanceDataFetcher(DataFetcherInterface):
    """
    Yahoo Finance data fetcher implementation.
    
    Fetches OHLCV market data with retry logic and proper error handling.
    """
    
    # Map human-readable intervals to yfinance-compatible values
    VALID_INTERVALS = {
        "1m": "1m",
        "5m": "5m",
        "15m": "15m",
        "30m": "30m",
        "1h": "60m",
        "4h": "4h",
        "1d": "1d",
        "1wk": "1wk",
        "1mo": "1mo",
    }
    
    # Period to fetch based on interval
    INTERVAL_TO_PERIOD = {
        "1m":  "7d",
        "5m":  "60d",
        "15m": "60d",
        "30m": "60d",
        "1h":  "730d",
        "60m": "730d",
        "4h":  "730d",
        "1d":  "2y",
        "1wk": "5y",
        "1mo": "10y",
    }
    
    def __init__(self):
        """Initialize the data fetcher with configuration."""
        self.settings = get_settings()
        self.yf_config = self.settings.yahoo_finance
        logger.info(
            "YahooFinanceDataFetcher initialized",
            extra={
                "timeout": self.yf_config.timeout_seconds,
                "max_retries": self.yf_config.max_retries,
            },
        )
    
    @log_execution_time(logger)
    async def fetch_ohlcv(
        self,
        symbol: str,
        interval: str,
        max_retries: int = 3,
    ) -> pd.DataFrame:
        """
        Fetch OHLCV data for the given symbol and interval.
        
        Args:
            symbol: Ticker symbol (e.g., 'AAPL', 'BTC-USD')
            interval: Timeframe interval (1m, 5m, 1h, 1d, etc.)
            max_retries: Maximum retry attempts
            
        Returns:
            DataFrame with OHLCV data
            
        Raises:
            DataFetchError: If data cannot be fetched
            InvalidSymbolError: If symbol is invalid
        """
        normalized_symbol = self.normalize_symbol(symbol)
        normalized_interval = interval.lower().strip()
        
        logger.info(
            f"Fetching data: {normalized_symbol} ({normalized_interval})",
            extra={
                "symbol": normalized_symbol,
                "interval": normalized_interval,
                "max_retries": max_retries,
            },
        )
        
        # Validate interval
        if normalized_interval not in self.VALID_INTERVALS:
            raise DataFetchError(
                message=f"Invalid interval '{interval}'. Allowed: {list(self.VALID_INTERVALS.keys())}",
                symbol=normalized_symbol,
                interval=normalized_interval,
            )
        
        # Execute fetch with retry logic (run in thread pool since yfinance is blocking)
        try:
            df = await asyncio.to_thread(
                self._fetch_with_retry,
                normalized_symbol,
                normalized_interval,
                max_retries,
            )
        except Exception as exc:
            if "symbol" in str(exc).lower() or "no data" in str(exc).lower():
                raise InvalidSymbolError(normalized_symbol)
            raise DataFetchError(
                message=f"Failed to fetch data: {str(exc)}",
                symbol=normalized_symbol,
                interval=normalized_interval,
            )
        
        if df is None or df.empty:
            raise InvalidSymbolError(
                normalized_symbol,
                message=f"No data returned for '{normalized_symbol}'. "
                        f"Check that the symbol is valid and the market is not closed."
            )
        
        # Process data
        df = self._process_dataframe(df)
        
        logger.info(
            f"Successfully fetched {len(df)} bars",
            extra={
                "symbol": normalized_symbol,
                "interval": normalized_interval,
                "bars": len(df),
                "date_range": f"{df.index[0]} to {df.index[-1]}" if len(df) > 0 else None,
            },
        )
        
        return df
    
    def _fetch_with_retry(
        self,
        symbol: str,
        interval: str,
        max_retries: int,
    ) -> pd.DataFrame:
        """Execute fetch with retry logic."""
        @retry(
            stop=stop_after_attempt(max_retries),
            wait=wait_exponential(
                multiplier=self.yf_config.retry_delay,
                min=1,
                max=10,
            ),
            retry=retry_if_exception_type(Exception),
            reraise=True,
        )
        def _fetch():
            yf_interval = self.VALID_INTERVALS[interval]
            period = self.INTERVAL_TO_PERIOD.get(yf_interval, "1y")
            
            # Handle 4h resampling
            if interval == "4h":
                ticker = yf.Ticker(symbol)
                df = ticker.history(
                    period=period,
                    interval="60m",
                    timeout=self.yf_config.timeout_seconds,
                )
                return self._resample_to_4h(df)
            else:
                ticker = yf.Ticker(symbol)
                return ticker.history(
                    period=period,
                    interval=yf_interval,
                    timeout=self.yf_config.timeout_seconds,
                )
        
        return _fetch()
    
    def _process_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Process and clean the DataFrame."""
        # Keep only OHLCV columns
        required_cols = ["Open", "High", "Low", "Close", "Volume"]
        
        # Handle case where columns might have different casing
        df.columns = [col.capitalize() if col.lower() in [c.lower() for c in required_cols] else col 
                      for col in df.columns]
        
        # Select only required columns
        available_cols = [col for col in required_cols if col in df.columns]
        df = df[available_cols].copy()
        
        # Clean data
        df.dropna(inplace=True)
        df.sort_index(inplace=True)
        
        return df
    
    def _resample_to_4h(self, df: pd.DataFrame) -> pd.DataFrame:
        """Resample 1-hour data to 4-hour bars."""
        if df.empty:
            return df
        
        resampled = df.resample("4h").agg({
            "Open":   "first",
            "High":   "max",
            "Low":    "min",
            "Close":  "last",
            "Volume": "sum",
        })
        resampled.dropna(subset=["Open", "Close"], inplace=True)
        return resampled
    
    def validate_symbol(self, symbol: str) -> bool:
        """
        Validate if a symbol is properly formatted.
        
        Args:
            symbol: The symbol to validate
            
        Returns:
            bool: True if valid format
        """
        if not symbol or not isinstance(symbol, str):
            return False
        
        normalized = symbol.strip().upper()
        
        # Basic validation: 1-20 alphanumeric characters, hyphens and dots allowed (for exchange suffixes like .NS, .BO)
        import re
        return bool(re.match(r'^[A-Z0-9\-.]{1,25}$', normalized))
    
    def normalize_symbol(self, symbol: str) -> str:
        """
        Normalize a symbol to standard format.
        
        Args:
            symbol: Raw symbol string
            
        Returns:
            str: Normalized symbol (uppercase, stripped)
        """
        return symbol.strip().upper()
    
    def get_supported_intervals(self) -> List[str]:
        """
        Get list of supported time intervals.
        
        Returns:
            List[str]: Supported interval strings
        """
        return list(self.VALID_INTERVALS.keys())
    
    def dataframe_to_records(self, df: pd.DataFrame) -> List[dict]:
        """
        Convert DataFrame to JSON-serializable records.
        
        Args:
            df: DataFrame with OHLCV data
            
        Returns:
            List of dict records with timestamp and OHLCV values
        """
        records = []
        for ts, row in df.iterrows():
            try:
                time_val = int(ts.timestamp())
            except Exception:
                time_val = str(ts)
            
            records.append({
                "time":   time_val,
                "open":   round(float(row["Open"]),   4),
                "high":   round(float(row["High"]),   4),
                "low":    round(float(row["Low"]),    4),
                "close":  round(float(row["Close"]),  4),
                "volume": int(row["Volume"]),
            })
        return records
