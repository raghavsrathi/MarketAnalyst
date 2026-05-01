"""
Core module containing base classes, interfaces, and utilities.
"""

from .interfaces import (
    AnalysisServiceInterface,
    DataFetcherInterface,
    IndicatorCalculatorInterface,
    PatternDetectorInterface,
    SignalGeneratorInterface,
)
from .exceptions import (
    TradingAnalysisError,
    DataFetchError,
    InvalidSymbolError,
    InsufficientDataError,
    IndicatorCalculationError,
    PatternDetectionError,
    SignalGenerationError,
)
from .types import (
    Confidence,
    OHLCVData,
    IndicatorResult,
    PatternResult,
    Recommendation,
    RSICondition,
    SignalBreakdown,
    SignalResult,
    AnalysisResult,
    TrendDirection,
    TrendStrength,
)

__all__ = [
    # Interfaces
    "AnalysisServiceInterface",
    "DataFetcherInterface",
    "IndicatorCalculatorInterface",
    "PatternDetectorInterface",
    "SignalGeneratorInterface",
    # Exceptions
    "TradingAnalysisError",
    "DataFetchError",
    "InvalidSymbolError",
    "IndicatorCalculationError",
    "PatternDetectionError",
    "SignalGenerationError",
    "InsufficientDataError",
    # Types
    "OHLCVData",
    "IndicatorResult",
    "PatternResult",
    "SignalBreakdown",
    "SignalResult",
    "AnalysisResult",
    # Enums
    "TrendDirection",
    "TrendStrength",
    "RSICondition",
    "Recommendation",
    "Confidence",
]
