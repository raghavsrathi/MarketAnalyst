"""
types.py
--------
Type definitions and data classes for the trading analysis system.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum


class TrendDirection(Enum):
    """Trend direction enumeration."""
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"


class TrendStrength(Enum):
    """Trend strength enumeration."""
    STRONG = "strong"
    MODERATE = "moderate"
    WEAK = "weak"


class RSICondition(Enum):
    """RSI condition enumeration."""
    OVERBOUGHT = "overbought"
    OVERSOLD = "oversold"
    NEUTRAL = "neutral"


class Recommendation(Enum):
    """Trading recommendation enumeration."""
    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"


class Confidence(Enum):
    """Confidence level enumeration."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass(slots=True)
class OHLCVData:
    """OHLCV (Open, High, Low, Close, Volume) data point."""
    time: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "time": int(self.time.timestamp()),
            "open": round(self.open, 4),
            "high": round(self.high, 4),
            "low": round(self.low, 4),
            "close": round(self.close, 4),
            "volume": self.volume,
        }


@dataclass(slots=True)
class CandlestickPattern:
    """Detected candlestick pattern."""
    name: str
    type: str  # bullish, bearish, neutral
    confidence: float  # 0.0 to 1.0
    bar_index: int  # which bar in the series


@dataclass(slots=True)
class IndicatorResult:
    """Result of technical indicator calculations."""
    # RSI
    rsi: Optional[float] = None
    rsi_series: List[Dict[str, Any]] = field(default_factory=list)
    rsi_condition: RSICondition = RSICondition.NEUTRAL
    
    # MACD
    macd_line: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_histogram: Optional[float] = None
    macd_signal_type: str = "neutral"  # buy, sell, neutral
    
    # EMAs
    ema_short: Optional[float] = None
    ema_long: Optional[float] = None
    ema_200: Optional[float] = None
    ema_short_series: List[Dict[str, Any]] = field(default_factory=list)
    ema_long_series: List[Dict[str, Any]] = field(default_factory=list)
    
    # Bollinger Bands
    bb_upper: Optional[float] = None
    bb_middle: Optional[float] = None
    bb_lower: Optional[float] = None
    bb_width: Optional[float] = None
    bb_upper_series: List[Dict[str, Any]] = field(default_factory=list)
    bb_middle_series: List[Dict[str, Any]] = field(default_factory=list)
    bb_lower_series: List[Dict[str, Any]] = field(default_factory=list)
    
    # Metadata
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "rsi": self.rsi,
            "macd_line": self.macd_line,
            "macd_signal": self.macd_signal,
            "macd_histogram": self.macd_histogram,
            "ema_short": self.ema_short,
            "ema_long": self.ema_long,
            "ema_200": self.ema_200,
            "bb_upper": self.bb_upper,
            "bb_middle": self.bb_middle,
            "bb_lower": self.bb_lower,
            "bb_width": self.bb_width,
        }


@dataclass(slots=True)
class PatternResult:
    """Result of pattern detection."""
    trend: TrendDirection = TrendDirection.NEUTRAL
    trend_strength: TrendStrength = TrendStrength.WEAK
    rsi_condition: RSICondition = RSICondition.NEUTRAL
    support: Optional[float] = None
    resistance: Optional[float] = None
    candlestick_patterns: List[str] = field(default_factory=list)
    patterns: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "trend": self.trend.value,
            "trend_strength": self.trend_strength.value,
            "rsi_condition": self.rsi_condition.value,
            "support": self.support,
            "resistance": self.resistance,
            "candlestick_patterns": self.candlestick_patterns,
            "patterns": self.patterns,
        }


@dataclass(slots=True)
class SignalBreakdown:
    """Individual signal contributions."""
    rsi: float = 0.0
    macd: float = 0.0
    ema_trend: float = 0.0
    bollinger_bands: float = 0.0
    support_resistance: float = 0.0
    candlestick: float = 0.0
    
    def to_dict(self) -> Dict[str, float]:
        """Convert to dictionary."""
        return {
            "rsi": self.rsi,
            "macd": self.macd,
            "ema_trend": self.ema_trend,
            "bollinger_bands": self.bollinger_bands,
            "support_resistance": self.support_resistance,
            "candlestick": self.candlestick,
        }


@dataclass(slots=True)
class SignalResult:
    """Final trading signal result."""
    recommendation: Recommendation = Recommendation.HOLD
    confidence: Confidence = Confidence.LOW
    score: float = 0.0
    breakdown: SignalBreakdown = field(default_factory=SignalBreakdown)
    macd_signal: str = "neutral"
    summary: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "recommendation": self.recommendation.value,
            "confidence": self.confidence.value,
            "score": round(self.score, 3),
            "signal_breakdown": self.breakdown.to_dict(),
            "macd_signal": self.macd_signal,
            "summary": self.summary,
        }


@dataclass(slots=True)
class AnalysisResult:
    """Complete analysis result."""
    symbol: str
    interval: str
    current_price: float
    candles: List[OHLCVData]
    indicators: IndicatorResult
    patterns: PatternResult
    signals: SignalResult
    bars: int
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "symbol": self.symbol,
            "interval": self.interval,
            "current_price": round(self.current_price, 4),
            "bars": self.bars,
            "candles": [c.to_dict() for c in self.candles],
            "indicators": self.indicators.to_dict(),
            "series": {
                "rsi": self.indicators.rsi_series,
                "ema_short": self.indicators.ema_short_series,
                "ema_long": self.indicators.ema_long_series,
                "bb_upper": self.indicators.bb_upper_series,
                "bb_middle": self.indicators.bb_middle_series,
                "bb_lower": self.indicators.bb_lower_series,
            },
            **self.patterns.to_dict(),
            **self.signals.to_dict(),
        }
