"""
pattern_detector.py
-------------------
Chart pattern detector implementing PatternDetectorInterface.

Detects:
  - Trend direction and strength (via EMA analysis)
  - Support and resistance levels (swing highs/lows)
  - Candlestick patterns (Doji, Hammer, Engulfing, etc.)
"""

from typing import List, Optional, Tuple

import numpy as np
import pandas as pd

from core import (
    PatternDetectorInterface,
    PatternResult,
    IndicatorResult,
    TrendDirection,
    TrendStrength,
    RSICondition,
    PatternDetectionError,
)
from logging_config import get_logger, log_execution_time

logger = get_logger(__name__)


class ChartPatternDetector(PatternDetectorInterface):
    """
    Chart pattern detector implementation.
    
    Detects trend direction, support/resistance levels, and candlestick patterns
    to provide comprehensive technical analysis.
    """
    
    def __init__(self):
        """Initialize the pattern detector."""
        logger.info("ChartPatternDetector initialized")
    
    @log_execution_time(logger)
    def detect(self, df: pd.DataFrame, indicators: IndicatorResult) -> PatternResult:
        """
        Detect all patterns.
        
        Args:
            df: DataFrame with OHLCV data
            indicators: Pre-computed indicator values
            
        Returns:
            PatternResult with all detected patterns
        """
        try:
            close = df["Close"]
            latest_close = float(close.iloc[-1])
            
            # Detect trend
            trend, trend_strength = self.detect_trend(df, indicators)
            
            # RSI condition from indicators
            rsi_condition = indicators.rsi_condition
            
            # Support/Resistance
            support, resistance = self.detect_support_resistance(df, latest_close)
            
            # Candlestick patterns
            candlestick_patterns = self.detect_candlestick_patterns(df)
            
            # Aggregate patterns
            patterns: List[str] = []
            
            if trend == TrendDirection.BULLISH:
                patterns.append("uptrend")
            elif trend == TrendDirection.BEARISH:
                patterns.append("downtrend")
            
            if rsi_condition == RSICondition.OVERBOUGHT:
                patterns.append("overbought")
            elif rsi_condition == RSICondition.OVERSOLD:
                patterns.append("oversold")
            
            patterns.extend(candlestick_patterns)
            
            # Near support/resistance
            if resistance and latest_close >= resistance * 0.99:
                patterns.append("near_resistance")
            if support and latest_close <= support * 1.01:
                patterns.append("near_support")
            
            return PatternResult(
                trend=trend,
                trend_strength=trend_strength,
                rsi_condition=rsi_condition,
                support=support,
                resistance=resistance,
                candlestick_patterns=candlestick_patterns,
                patterns=patterns,
            )
            
        except Exception as exc:
            logger.exception("Pattern detection failed")
            raise PatternDetectionError(
                message=f"Pattern detection failed: {str(exc)}",
            )
    
    def detect_trend(
        self,
        df: pd.DataFrame,
        indicators: IndicatorResult,
    ) -> Tuple[TrendDirection, TrendStrength]:
        """
        Detect trend direction and strength using match/case.
        
        Args:
            df: DataFrame with OHLCV data
            indicators: Pre-computed indicator values
            
        Returns:
            Tuple of (trend_direction, trend_strength)
        """
        ema_short = indicators.ema_short
        ema_long = indicators.ema_long
        ema_200 = indicators.ema_200
        latest_close = float(df["Close"].iloc[-1])
        
        if ema_short is None or ema_long is None:
            return TrendDirection.NEUTRAL, TrendStrength.WEAK
        
        # Determine trend direction
        trend = (
            TrendDirection.BULLISH if ema_short > ema_long
            else TrendDirection.BEARISH if ema_short < ema_long
            else TrendDirection.NEUTRAL
        )
        
        if trend == TrendDirection.NEUTRAL:
            return TrendDirection.NEUTRAL, TrendStrength.WEAK
        
        # Determine strength via 200-EMA confirmation
        if ema_200 is None:
            return trend, TrendStrength.MODERATE
        
        above_200 = latest_close > ema_200 and ema_short > ema_200
        partially_above = latest_close > ema_200 or ema_short > ema_200
        
        match (trend, above_200, partially_above):
            case (TrendDirection.BULLISH, True, _):
                return trend, TrendStrength.STRONG
            case (TrendDirection.BULLISH, False, True):
                return trend, TrendStrength.MODERATE
            case (TrendDirection.BULLISH, _, _):
                return trend, TrendStrength.WEAK
            case (TrendDirection.BEARISH, True, _):
                # Above 200 but bearish trend = weak
                return trend, TrendStrength.WEAK
            case (TrendDirection.BEARISH, False, True):
                return trend, TrendStrength.MODERATE
            case _:
                return trend, TrendStrength.STRONG
    
    def detect_support_resistance(
        self,
        df: pd.DataFrame,
        current_price: float,
    ) -> Tuple[Optional[float], Optional[float]]:
        """
        Detect support and resistance levels.
        
        Args:
            df: DataFrame with OHLCV data
            current_price: Current price for context
            
        Returns:
            Tuple of (support_level, resistance_level) or None
        """
        window = 10
        highs = df["High"].values
        lows = df["Low"].values
        n = len(df)
        
        swing_highs = []
        swing_lows = []
        
        for i in range(window, n - window):
            left_h = highs[max(0, i - window): i]
            right_h = highs[i + 1: i + window + 1]
            if len(left_h) == 0 or len(right_h) == 0:
                continue
            if highs[i] >= max(left_h) and highs[i] >= max(right_h):
                swing_highs.append(float(highs[i]))
            
            left_l = lows[max(0, i - window): i]
            right_l = lows[i + 1: i + window + 1]
            if len(left_l) == 0 or len(right_l) == 0:
                continue
            if lows[i] <= min(left_l) and lows[i] <= min(right_l):
                swing_lows.append(float(lows[i]))
        
        # Cluster levels
        swing_highs = self._cluster_levels(swing_highs, tolerance=0.005)
        swing_lows = self._cluster_levels(swing_lows, tolerance=0.005)
        
        # Get nearest levels
        resistances = [h for h in swing_highs if h > current_price]
        supports = [l for l in swing_lows if l < current_price]
        
        resistance = round(min(resistances), 4) if resistances else None
        support = round(max(supports), 4) if supports else None
        
        return support, resistance
    
    def detect_candlestick_patterns(self, df: pd.DataFrame) -> List[str]:
        """
        Detect candlestick patterns.
        
        Args:
            df: DataFrame with OHLCV data
            
        Returns:
            List of detected pattern names
        """
        if len(df) < 2:
            return []
        
        patterns = []
        
        # Latest bar
        o1 = float(df["Open"].iloc[-1])
        h1 = float(df["High"].iloc[-1])
        l1 = float(df["Low"].iloc[-1])
        c1 = float(df["Close"].iloc[-1])
        
        body1 = abs(c1 - o1)
        range1 = h1 - l1
        
        # Previous bar
        o0 = float(df["Open"].iloc[-2])
        c0 = float(df["Close"].iloc[-2])
        
        # Doji: body is < 10% of range
        if range1 > 0 and body1 / range1 < 0.10:
            patterns.append("doji")
        
        # Hammer
        lower_wick1 = min(o1, c1) - l1
        upper_wick1 = h1 - max(o1, c1)
        if (
            body1 > 0
            and lower_wick1 >= 2 * body1
            and upper_wick1 <= 0.3 * body1
            and c0 < o0
        ):
            patterns.append("hammer")
        
        # Shooting Star
        if (
            body1 > 0
            and upper_wick1 >= 2 * body1
            and lower_wick1 <= 0.3 * body1
            and c0 > o0
        ):
            patterns.append("shooting_star")
        
        # Bullish Engulfing
        if (
            c0 < o0
            and c1 > o1
            and o1 <= c0
            and c1 >= o0
        ):
            patterns.append("bullish_engulfing")
        
        # Bearish Engulfing
        if (
            c0 > o0
            and c1 < o1
            and o1 >= c0
            and c1 <= o0
        ):
            patterns.append("bearish_engulfing")
        
        return patterns
    
    def _cluster_levels(
        self,
        levels: List[float],
        tolerance: float = 0.005,
    ) -> List[float]:
        """Merge price levels within tolerance of each other."""
        if not levels:
            return []
        
        import numpy as np
        
        levels_sorted = sorted(levels)
        clusters = [[levels_sorted[0]]]
        
        for price in levels_sorted[1:]:
            if abs(price - clusters[-1][-1]) / clusters[-1][-1] <= tolerance:
                clusters[-1].append(price)
            else:
                clusters.append([price])
        
        return [float(np.mean(c)) for c in clusters]
