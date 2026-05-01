"""
signal_engine.py
----------------
Trading signal generator implementing SignalGeneratorInterface.

Combines all indicator and pattern signals into a final trading recommendation.

Scoring system:
  Each signal contributes a score in the range [-2, +2].
  Positive  → bullish / buy pressure
  Negative  → bearish / sell pressure
  Final score is mapped to: BUY | HOLD | SELL
"""

from typing import Optional, Tuple

from core import (
    SignalGeneratorInterface,
    SignalResult,
    SignalBreakdown,
    IndicatorResult,
    PatternResult,
    Recommendation,
    Confidence,
    RSICondition,
    TrendDirection,
    TrendStrength,
    SignalGenerationError,
)
from logging_config import get_logger, log_execution_time

logger = get_logger(__name__)


class TradingSignalGenerator(SignalGeneratorInterface):
    """
    Trading signal generator implementation.
    
    Aggregates multiple technical indicators and pattern signals into a unified
    trading recommendation with confidence scoring.
    """
    
    def __init__(self):
        """Initialize the signal generator."""
        logger.info("TradingSignalGenerator initialized")
    
    @log_execution_time(logger)
    def generate(
        self,
        indicators: IndicatorResult,
        patterns: PatternResult,
        current_price: float,
    ) -> SignalResult:
        """
        Generate trading signal.
        
        Args:
            indicators: Computed indicator values
            patterns: Detected patterns
            current_price: Current market price
            
        Returns:
            SignalResult with recommendation and analysis
        """
        try:
            score = self.calculate_score(indicators, patterns, current_price)
            
            breakdown = self._calculate_breakdown(indicators, patterns, current_price)
            
            # Map score to recommendation
            recommendation = self._score_to_recommendation(score)
            confidence = self._score_to_confidence(score)
            
            # MACD signal
            macd_score, macd_label = self.get_macd_signal(
                indicators.macd_line,
                indicators.macd_signal,
                indicators.macd_histogram,
            )
            
            # Build summary
            summary = self._build_summary(recommendation, patterns, indicators, macd_label, score)
            
            return SignalResult(
                recommendation=recommendation,
                confidence=confidence,
                score=round(score, 3),
                breakdown=breakdown,
                macd_signal=macd_label,
                summary=summary,
            )
            
        except Exception as exc:
            logger.exception("Signal generation failed")
            raise SignalGenerationError(
                message=f"Signal generation failed: {str(exc)}",
            )
    
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
            Signal score (positive = bullish, negative = bearish)
        """
        score = 0.0
        
        # RSI signal
        score += self.get_rsi_signal(indicators.rsi)
        
        # MACD signal
        macd_score, _ = self.get_macd_signal(
            indicators.macd_line,
            indicators.macd_signal,
            indicators.macd_histogram,
        )
        score += macd_score
        
        # EMA trend signal
        score += self._get_ema_signal(patterns.trend, patterns.trend_strength)
        
        # Bollinger Bands signal
        score += self._get_bollinger_signal(
            current_price,
            indicators.bb_upper,
            indicators.bb_lower,
            indicators.bb_middle,
        )
        
        # Support/Resistance signal
        score += self._get_support_resistance_signal(
            current_price,
            patterns.support,
            patterns.resistance,
        )
        
        # Candlestick pattern signal
        score += self._get_candlestick_signal(patterns.candlestick_patterns)
        
        return score
    
    def _calculate_breakdown(
        self,
        indicators: IndicatorResult,
        patterns: PatternResult,
        current_price: float,
    ) -> SignalBreakdown:
        """Calculate signal breakdown by component."""
        rsi_score = self.get_rsi_signal(indicators.rsi)
        
        macd_score, _ = self.get_macd_signal(
            indicators.macd_line,
            indicators.macd_signal,
            indicators.macd_histogram,
        )
        
        return SignalBreakdown(
            rsi=rsi_score,
            macd=macd_score,
            ema_trend=self._get_ema_signal(patterns.trend, patterns.trend_strength),
            bollinger_bands=self._get_bollinger_signal(
                current_price,
                indicators.bb_upper,
                indicators.bb_lower,
                indicators.bb_middle,
            ),
            support_resistance=self._get_support_resistance_signal(
                current_price,
                patterns.support,
                patterns.resistance,
            ),
            candlestick=self._get_candlestick_signal(patterns.candlestick_patterns),
        )
    
    def get_rsi_signal(self, rsi: Optional[float]) -> float:
        """
        Get signal contribution from RSI using match/case.
        
        Args:
            rsi: RSI value (0-100)
            
        Returns:
            Signal contribution score
        """
        if rsi is None:
            return 0.0
        
        match rsi:
            case _ if rsi >= 80:
                return -2.0
            case _ if rsi >= 70:
                return -1.5
            case _ if rsi >= 60:
                return -0.5
            case _ if rsi <= 20:
                return 2.0
            case _ if rsi <= 30:
                return 1.5
            case _ if rsi <= 40:
                return 0.5
            case _:
                return 0.0
    
    def get_macd_signal(
        self,
        macd_line: Optional[float],
        macd_signal: Optional[float],
        macd_histogram: Optional[float],
    ) -> Tuple[float, str]:
        """
        Get signal contribution from MACD.
        
        Args:
            macd_line: MACD line value
            macd_signal: MACD signal line value
            macd_histogram: MACD histogram value
            
        Returns:
            Tuple of (signal_score, signal_label)
        """
        if macd_line is None or macd_signal is None:
            return 0.0, "neutral"
        
        if macd_line > macd_signal:
            label = "buy"
            base = 1.5
            histogram_bonus = 0.5 if (macd_histogram and macd_histogram > 0) else 0.0
            return base + histogram_bonus, label
        elif macd_line < macd_signal:
            label = "sell"
            base = -1.5
            histogram_penalty = -0.5 if (macd_histogram and macd_histogram < 0) else 0.0
            return base + histogram_penalty, label
        else:
            return 0.0, "neutral"
    
    def _get_ema_signal(
        self,
        trend: TrendDirection,
        strength: TrendStrength,
    ) -> float:
        """Get signal contribution from EMA trend."""
        strength_multiplier = {
            TrendStrength.STRONG: 2.0,
            TrendStrength.MODERATE: 1.0,
            TrendStrength.WEAK: 0.5,
        }.get(strength, 0.5)
        
        if trend == TrendDirection.BULLISH:
            return strength_multiplier
        elif trend == TrendDirection.BEARISH:
            return -strength_multiplier
        
        return 0.0
    
    def _get_bollinger_signal(
        self,
        price: float,
        bb_upper: Optional[float],
        bb_lower: Optional[float],
        bb_middle: Optional[float],
    ) -> float:
        """Get signal contribution from Bollinger Bands."""
        if bb_upper is None or bb_lower is None or bb_middle is None or bb_middle == 0:
            return 0.0
        
        band_range = bb_upper - bb_lower
        if band_range == 0:
            return 0.0
        
        position = (price - bb_lower) / band_range
        
        if position >= 0.95:
            return -1.5
        if position >= 0.80:
            return -0.75
        if position <= 0.05:
            return 1.5
        if position <= 0.20:
            return 0.75
        
        return 0.0
    
    def _get_support_resistance_signal(
        self,
        price: float,
        support: Optional[float],
        resistance: Optional[float],
    ) -> float:
        """Get signal contribution from support/resistance."""
        score = 0.0
        
        if resistance:
            dist_pct = (resistance - price) / price
            if dist_pct <= 0.01:
                score -= 1.0
            elif dist_pct <= 0.03:
                score -= 0.5
        
        if support:
            dist_pct = (price - support) / price
            if dist_pct <= 0.01:
                score += 1.0
            elif dist_pct <= 0.03:
                score += 0.5
        
        return score
    
    def _get_candlestick_signal(self, patterns: list) -> float:
        """Get signal contribution from candlestick patterns."""
        bullish_patterns = {"hammer", "bullish_engulfing", "morning_star"}
        bearish_patterns = {"shooting_star", "bearish_engulfing", "evening_star"}
        
        score = 0.0
        for pattern in patterns:
            if pattern in bullish_patterns:
                score += 1.0
            elif pattern in bearish_patterns:
                score -= 1.0
        
        return score
    
    def _score_to_recommendation(self, score: float) -> Recommendation:
        """Convert score to recommendation using match/case."""
        match score:
            case _ if score >= 2.0:
                return Recommendation.BUY
            case _ if score <= -2.0:
                return Recommendation.SELL
            case _:
                return Recommendation.HOLD
    
    def _score_to_confidence(self, score: float) -> Confidence:
        """Convert score to confidence level using match/case."""
        match abs(score):
            case _ if abs(score) >= 4.0:
                return Confidence.HIGH
            case _ if abs(score) >= 2.0:
                return Confidence.MEDIUM
            case _:
                return Confidence.LOW
    
    def _build_summary(
        self,
        recommendation: Recommendation,
        patterns: PatternResult,
        indicators: IndicatorResult,
        macd_label: str,
        score: float,
    ) -> str:
        """Build human-readable summary."""
        parts = []
        
        if patterns.trend != TrendDirection.NEUTRAL:
            parts.append(f"{patterns.trend.value.capitalize()} EMA trend")
        
        if indicators.rsi is not None:
            if indicators.rsi >= 70:
                parts.append(f"RSI overbought ({indicators.rsi:.1f})")
            elif indicators.rsi <= 30:
                parts.append(f"RSI oversold ({indicators.rsi:.1f})")
            else:
                parts.append(f"RSI neutral ({indicators.rsi:.1f})")
        
        if macd_label != "neutral":
            parts.append(f"MACD {macd_label} crossover")
        
        signal_text = recommendation.value.upper()
        
        if parts:
            return f"{signal_text}: {'; '.join(parts)}. Score: {score:+.2f}"
        
        return f"{signal_text}: Insufficient data for detailed analysis."
