"""
exceptions.py
-------------
Custom exceptions for the trading analysis system.
"""

from typing import Any, Dict, Optional


class TradingAnalysisError(Exception):
    """Base exception for all trading analysis errors."""
    
    def __init__(
        self,
        message: str,
        error_code: str = "UNKNOWN_ERROR",
        details: Optional[Dict[str, Any]] = None,
        status_code: int = 500,
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.status_code = status_code
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API responses."""
        return {
            "error": {
                "code": self.error_code,
                "message": self.message,
                "details": self.details,
            }
        }


class DataFetchError(TradingAnalysisError):
    """Error fetching market data."""
    
    def __init__(
        self,
        message: str,
        symbol: Optional[str] = None,
        interval: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            error_code="DATA_FETCH_ERROR",
            details={
                "symbol": symbol,
                "interval": interval,
                **(details or {}),
            },
            status_code=502,
        )
        self.symbol = symbol
        self.interval = interval


class InvalidSymbolError(TradingAnalysisError):
    """Invalid or unknown symbol."""
    
    def __init__(
        self,
        symbol: str,
        message: Optional[str] = None,
    ):
        super().__init__(
            message=message or f"Invalid or unknown symbol: '{symbol}'",
            error_code="INVALID_SYMBOL",
            details={"symbol": symbol},
            status_code=400,
        )
        self.symbol = symbol


class InsufficientDataError(TradingAnalysisError):
    """Not enough data for analysis."""
    
    def __init__(
        self,
        symbol: str,
        interval: str,
        required_bars: int,
        available_bars: int,
    ):
        super().__init__(
            message=(
                f"Insufficient data for '{symbol}' at '{interval}' interval. "
                f"Required: {required_bars} bars, Available: {available_bars} bars. "
                "Try a longer timeframe or a more liquid symbol."
            ),
            error_code="INSUFFICIENT_DATA",
            details={
                "symbol": symbol,
                "interval": interval,
                "required_bars": required_bars,
                "available_bars": available_bars,
            },
            status_code=400,
        )


class IndicatorCalculationError(TradingAnalysisError):
    """Error calculating technical indicators."""
    
    def __init__(
        self,
        message: str,
        indicator: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            error_code="INDICATOR_CALCULATION_ERROR",
            details={
                "indicator": indicator,
                **(details or {}),
            },
            status_code=500,
        )
        self.indicator = indicator


class PatternDetectionError(TradingAnalysisError):
    """Error detecting patterns."""
    
    def __init__(
        self,
        message: str,
        pattern_type: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            error_code="PATTERN_DETECTION_ERROR",
            details={
                "pattern_type": pattern_type,
                **(details or {}),
            },
            status_code=500,
        )


class SignalGenerationError(TradingAnalysisError):
    """Error generating trading signals."""
    
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            error_code="SIGNAL_GENERATION_ERROR",
            details=details,
            status_code=500,
        )


class ConfigurationError(TradingAnalysisError):
    """Application configuration error."""
    
    def __init__(
        self,
        message: str,
        config_key: Optional[str] = None,
    ):
        super().__init__(
            message=message,
            error_code="CONFIGURATION_ERROR",
            details={"config_key": config_key},
            status_code=500,
        )


class RateLimitError(TradingAnalysisError):
    """Rate limit exceeded."""
    
    def __init__(
        self,
        retry_after: int,
        limit: int,
        window: int,
    ):
        super().__init__(
            message=f"Rate limit exceeded. Retry after {retry_after} seconds.",
            error_code="RATE_LIMIT_EXCEEDED",
            details={
                "retry_after": retry_after,
                "limit": limit,
                "window": window,
            },
            status_code=429,
        )
        self.retry_after = retry_after
