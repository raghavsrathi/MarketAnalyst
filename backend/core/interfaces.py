"""
interfaces.py
-------------
Abstract base classes and interfaces for service components.
Enables dependency injection and testability.
"""

from abc import ABC, abstractmethod
from typing import List

import pandas as pd

from .types import (
    AnalysisResult,
    IndicatorResult,
    OHLCVData,
    PatternResult,
    SignalResult,
)


class DataFetcherInterface(ABC):
    """
    Interface for market data fetching services.
    
    Implementations should handle fetching OHLCV data from various sources
    (Yahoo Finance, Alpha Vantage, etc.).
    """
    
    @abstractmethod
    async def fetch_ohlcv(
        self,
        symbol: str,
        interval: str,
        max_retries: int = 3,
    ) -> pd.DataFrame:
        """
        Fetch OHLCV data for a symbol.
        
        Args:
            symbol: The ticker symbol to fetch
            interval: Time interval (1m, 5m, 1h, 1d, etc.)
            max_retries: Maximum number of retry attempts
            
        Returns:
            pandas.DataFrame with columns: Open, High, Low, Close, Volume
            
        Raises:
            DataFetchError: If data cannot be fetched
            InvalidSymbolError: If the symbol is invalid
        """
        pass
    
    @abstractmethod
    def validate_symbol(self, symbol: str) -> bool:
        """
        Validate if a symbol is properly formatted.
        
        Args:
            symbol: The symbol to validate
            
        Returns:
            bool: True if valid, False otherwise
        """
        pass
    
    @abstractmethod
    def normalize_symbol(self, symbol: str) -> str:
        """
        Normalize a symbol to standard format.
        
        Args:
            symbol: Raw symbol string
            
        Returns:
            str: Normalized symbol (uppercase, stripped)
        """
        pass
    
    @abstractmethod
    def get_supported_intervals(self) -> List[str]:
        """
        Get list of supported time intervals.
        
        Returns:
            List[str]: Supported interval strings
        """
        pass


class IndicatorCalculatorInterface(ABC):
    """
    Interface for technical indicator calculation services.
    
    Implementations compute various technical indicators like RSI, MACD,
    EMA, Bollinger Bands, etc.
    """
    
    @abstractmethod
    def compute(self, df: pd.DataFrame) -> IndicatorResult:
        """
        Compute all technical indicators for the given data.
        
        Args:
            df: DataFrame with OHLCV data
            
        Returns:
            IndicatorResult containing all computed indicators
            
        Raises:
            IndicatorCalculationError: If calculation fails
        """
        pass
    
    @abstractmethod
    def compute_rsi(self, df: pd.DataFrame, period: int = 14) -> pd.Series:
        """
        Compute RSI (Relative Strength Index).
        
        Args:
            df: DataFrame with OHLCV data
            period: RSI calculation period
            
        Returns:
            pandas.Series with RSI values
        """
        pass
    
    @abstractmethod
    def compute_macd(
        self,
        df: pd.DataFrame,
        fast: int = 12,
        slow: int = 26,
        signal: int = 9,
    ) -> tuple[pd.Series, pd.Series, pd.Series]:
        """
        Compute MACD (Moving Average Convergence Divergence).
        
        Args:
            df: DataFrame with OHLCV data
            fast: Fast EMA period
            slow: Slow EMA period
            signal: Signal line period
            
        Returns:
            Tuple of (MACD line, Signal line, Histogram)
        """
        pass
    
    @abstractmethod
    def compute_ema(
        self,
        df: pd.DataFrame,
        period: int,
    ) -> pd.Series:
        """
        Compute EMA (Exponential Moving Average).
        
        Args:
            df: DataFrame with OHLCV data
            period: EMA period
            
        Returns:
            pandas.Series with EMA values
        """
        pass
    
    @abstractmethod
    def compute_bollinger_bands(
        self,
        df: pd.DataFrame,
        period: int = 20,
        std: float = 2.0,
    ) -> tuple[pd.Series, pd.Series, pd.Series]:
        """
        Compute Bollinger Bands.
        
        Args:
            df: DataFrame with OHLCV data
            period: Moving average period
            std: Number of standard deviations
            
        Returns:
            Tuple of (Upper band, Middle band, Lower band)
        """
        pass


class PatternDetectorInterface(ABC):
    """
    Interface for pattern detection services.
    
    Implementations detect various chart patterns including trends,
    support/resistance levels, and candlestick patterns.
    """
    
    @abstractmethod
    def detect(
        self,
        df: pd.DataFrame,
        indicators: IndicatorResult,
    ) -> PatternResult:
        """
        Detect all patterns in the given data.
        
        Args:
            df: DataFrame with OHLCV data
            indicators: Pre-computed indicator values
            
        Returns:
            PatternResult containing all detected patterns
            
        Raises:
            PatternDetectionError: If pattern detection fails
        """
        pass
    
    @abstractmethod
    def detect_trend(
        self,
        df: pd.DataFrame,
        indicators: IndicatorResult,
    ) -> tuple[str, str]:
        """
        Detect trend direction and strength.
        
        Args:
            df: DataFrame with OHLCV data
            indicators: Pre-computed indicator values
            
        Returns:
            Tuple of (trend_direction, trend_strength)
        """
        pass
    
    @abstractmethod
    def detect_support_resistance(
        self,
        df: pd.DataFrame,
        current_price: float,
    ) -> tuple[float | None, float | None]:
        """
        Detect support and resistance levels.
        
        Args:
            df: DataFrame with OHLCV data
            current_price: Current price for context
            
        Returns:
            Tuple of (support_level, resistance_level) or None
        """
        pass
    
    @abstractmethod
    def detect_candlestick_patterns(self, df: pd.DataFrame) -> List[str]:
        """
        Detect candlestick patterns.
        
        Args:
            df: DataFrame with OHLCV data
            
        Returns:
            List of detected pattern names
        """
        pass


class SignalGeneratorInterface(ABC):
    """
    Interface for trading signal generation services.
    
    Implementations combine indicator and pattern data to generate
    actionable trading recommendations.
    """
    
    @abstractmethod
    def generate(
        self,
        indicators: IndicatorResult,
        patterns: PatternResult,
        current_price: float,
    ) -> SignalResult:
        """
        Generate trading signal from indicators and patterns.
        
        Args:
            indicators: Computed indicator values
            patterns: Detected patterns
            current_price: Current market price
            
        Returns:
            SignalResult with recommendation and analysis
            
        Raises:
            SignalGenerationError: If signal generation fails
        """
        pass
    
    @abstractmethod
    def calculate_score(
        self,
        indicators: IndicatorResult,
        patterns: PatternResult,
        current_price: float,
    ) -> float:
        """
        Calculate raw signal score.
        
        Args:
            indicators: Computed indicator values
            patterns: Detected patterns
            current_price: Current market price
            
        Returns:
            float: Signal score (positive = bullish, negative = bearish)
        """
        pass
    
    @abstractmethod
    def get_rsi_signal(self, rsi: float | None) -> float:
        """
        Get signal contribution from RSI.
        
        Args:
            rsi: RSI value (0-100)
            
        Returns:
            float: Signal contribution score
        """
        pass
    
    @abstractmethod
    def get_macd_signal(
        self,
        macd_line: float | None,
        macd_signal: float | None,
        macd_histogram: float | None,
    ) -> tuple[float, str]:
        """
        Get signal contribution from MACD.
        
        Args:
            macd_line: MACD line value
            macd_signal: MACD signal line value
            macd_histogram: MACD histogram value
            
        Returns:
            Tuple of (signal_score, signal_label)
        """
        pass


class AnalysisServiceInterface(ABC):
    """
    High-level interface for the complete analysis service.
    
    Orchestrates data fetching, indicator calculation, pattern detection,
    and signal generation into a unified workflow.
    """
    
    @abstractmethod
    async def analyze(
        self,
        symbol: str,
        interval: str,
    ) -> AnalysisResult:
        """
        Perform complete technical analysis for a symbol.
        
        Args:
            symbol: Ticker symbol to analyze
            interval: Timeframe interval
            
        Returns:
            AnalysisResult containing all analysis data
            
        Raises:
            TradingAnalysisError: If analysis fails at any step
        """
        pass
    
    @abstractmethod
    def validate_request(
        self,
        symbol: str,
        interval: str,
    ) -> tuple[str, str]:
        """
        Validate analysis request parameters.
        
        Args:
            symbol: Requested symbol
            interval: Requested interval
            
        Returns:
            Tuple of (normalized_symbol, normalized_interval)
            
        Raises:
            InvalidSymbolError: If symbol is invalid
            ValueError: If interval is not supported
        """
        pass
