"""
analysis_service.py
-------------------
High-level analysis service that orchestrates the complete workflow:
data fetching → indicator calculation → pattern detection → signal generation.
Implements AnalysisServiceInterface.
"""

from typing import List

import pandas as pd

from config import get_settings
from core import (
    AnalysisServiceInterface,
    AnalysisResult,
    DataFetcherInterface,
    IndicatorCalculatorInterface,
    PatternDetectorInterface,
    SignalGeneratorInterface,
    IndicatorResult,
    OHLCVData,
    PatternResult,
    SignalResult,
    TrendDirection,
    TrendStrength,
    TradingAnalysisError,
    InvalidSymbolError,
    InsufficientDataError,
    DataFetchError,
)
from logging_config import get_logger, log_execution_time

logger = get_logger(__name__)


class AnalysisService(AnalysisServiceInterface):
    """
    Complete technical analysis service.
    
    Orchestrates the full analysis pipeline with caching and error handling.
    """
    
    MIN_BARS_REQUIRED = 30
    
    def __init__(
        self,
        data_fetcher: DataFetcherInterface,
        indicator_calculator: IndicatorCalculatorInterface = None,
        pattern_detector: PatternDetectorInterface = None,
        signal_generator: SignalGeneratorInterface = None,
        enable_cache: bool = True,
    ):
        """
        Initialize the analysis service.
        
        Args:
            data_fetcher: Data fetcher implementation
            indicator_calculator: Indicator calculator (optional)
            pattern_detector: Pattern detector (optional)
            signal_generator: Signal generator (optional)
            enable_cache: Enable result caching
        """
        self.data_fetcher = data_fetcher
        self.indicator_calculator = indicator_calculator or TechnicalIndicatorCalculator()
        self.pattern_detector = pattern_detector or ChartPatternDetector()
        self.signal_generator = signal_generator or TradingSignalGenerator()
        self.enable_cache = enable_cache
        self._cache = {} if enable_cache else None
        
        logger.info(
            "AnalysisService initialized",
            extra={
                "enable_cache": enable_cache,
                "min_bars_required": self.MIN_BARS_REQUIRED,
            },
        )
    
    @log_execution_time(logger)
    async def analyze(self, symbol: str, interval: str) -> AnalysisResult:
        """
        Perform complete technical analysis.
        
        Args:
            symbol: Ticker symbol to analyze
            interval: Timeframe interval
            
        Returns:
            Complete analysis result
            
        Raises:
            TradingAnalysisError: If analysis fails
        """
        # Validate inputs
        normalized_symbol, normalized_interval = self.validate_request(symbol, interval)
        
        # Check cache
        cache_key = f"{normalized_symbol}:{normalized_interval}"
        if self.enable_cache and cache_key in self._cache:
            logger.debug(f"Cache hit for {cache_key}")
            return self._cache[cache_key]
        
        logger.info(f"Starting analysis: {normalized_symbol} ({normalized_interval})")
        
        try:
            # Step 1: Fetch data
            df = await self._fetch_data(normalized_symbol, normalized_interval)
            
            # Step 2: Compute indicators
            indicators = self._compute_indicators(df)
            
            # Step 3: Detect patterns
            patterns = self._detect_patterns(df, indicators)
            
            # Step 4: Generate signals
            current_price = float(df["Close"].iloc[-1])
            signals = self._generate_signals(indicators, patterns, current_price)
            
            # Step 5: Build result
            candles = self._convert_to_ohlcv(df)
            
            result = AnalysisResult(
                symbol=normalized_symbol,
                interval=normalized_interval,
                current_price=current_price,
                candles=candles,
                indicators=indicators,
                patterns=patterns,
                signals=signals,
                bars=len(df),
            )
            
            # Cache result
            if self.enable_cache:
                self._cache[cache_key] = result
            
            logger.info(
                f"Analysis completed: {signals.recommendation.value} ({signals.confidence.value})",
                extra={
                    "symbol": normalized_symbol,
                    "interval": normalized_interval,
                    "recommendation": signals.recommendation.value,
                    "score": signals.score,
                },
            )
            
            return result
            
        except TradingAnalysisError:
            raise
        except Exception as exc:
            logger.exception(f"Analysis failed for {normalized_symbol}")
            raise TradingAnalysisError(
                message=f"Analysis failed: {str(exc)}",
                error_code="ANALYSIS_FAILED",
                details={"symbol": normalized_symbol, "interval": normalized_interval},
            )
    
    def validate_request(self, symbol: str, interval: str) -> tuple[str, str]:
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
        # Normalize
        normalized_symbol = symbol.upper().strip()
        normalized_interval = interval.lower().strip()
        
        # Validate symbol
        if not self.data_fetcher.validate_symbol(normalized_symbol):
            raise InvalidSymbolError(
                normalized_symbol,
                message=f"Invalid symbol format: '{symbol}'"
            )
        
        # Validate interval
        if normalized_interval not in self.data_fetcher.get_supported_intervals():
            raise ValueError(
                f"Invalid interval '{interval}'. "
                f"Allowed: {self.data_fetcher.get_supported_intervals()}"
            )
        
        return normalized_symbol, normalized_interval
    
    async def _fetch_data(self, symbol: str, interval: str) -> pd.DataFrame:
        """Fetch market data with error handling."""
        try:
            df = await self.data_fetcher.fetch_ohlcv(symbol, interval)
        except (InvalidSymbolError, DataFetchError):
            raise
        except Exception as exc:
            raise DataFetchError(
                message=f"Data fetch failed: {str(exc)}",
                symbol=symbol,
                interval=interval,
            )
        
        # Check data sufficiency
        if len(df) < self.MIN_BARS_REQUIRED:
            raise InsufficientDataError(
                symbol=symbol,
                interval=interval,
                required_bars=self.MIN_BARS_REQUIRED,
                available_bars=len(df),
            )
        
        return df
    
    def _compute_indicators(self, df: pd.DataFrame) -> IndicatorResult:
        """Compute technical indicators with error handling."""
        try:
            return self.indicator_calculator.compute(df)
        except Exception as exc:
            logger.exception("Indicator calculation failed")
            raise TradingAnalysisError(
                message=f"Indicator calculation failed: {str(exc)}",
                error_code="INDICATOR_ERROR",
            )
    
    def _detect_patterns(self, df: pd.DataFrame, indicators: IndicatorResult) -> PatternResult:
        """Detect patterns with error handling."""
        try:
            return self.pattern_detector.detect(df, indicators)
        except Exception as exc:
            logger.exception("Pattern detection failed")
            raise TradingAnalysisError(
                message=f"Pattern detection failed: {str(exc)}",
                error_code="PATTERN_ERROR",
            )
    
    def _generate_signals(
        self,
        indicators: IndicatorResult,
        patterns: PatternResult,
        current_price: float,
    ) -> SignalResult:
        """Generate trading signals with error handling."""
        try:
            return self.signal_generator.generate(indicators, patterns, current_price)
        except Exception as exc:
            logger.exception("Signal generation failed")
            raise TradingAnalysisError(
                message=f"Signal generation failed: {str(exc)}",
                error_code="SIGNAL_ERROR",
            )
    
    def _convert_to_ohlcv(self, df: pd.DataFrame) -> List[OHLCVData]:
        """Convert DataFrame to OHLCV data list."""
        candles = []
        for ts, row in df.iterrows():
            candles.append(OHLCVData(
                time=ts,
                open=float(row["Open"]),
                high=float(row["High"]),
                low=float(row["Low"]),
                close=float(row["Close"]),
                volume=int(row["Volume"]),
            ))
        return candles


# Import here to avoid circular imports
from .indicators import TechnicalIndicatorCalculator
from .pattern_detector import ChartPatternDetector
from .signal_engine import TradingSignalGenerator
