"""
indicators.py
-------------
Production-grade technical indicator calculator.
Implements IndicatorCalculatorInterface using pandas-ta.
"""

from typing import List, Optional, Tuple

import pandas as pd
import pandas_ta as ta

from config import get_settings
from core import (
    IndicatorCalculatorInterface,
    IndicatorResult,
    IndicatorCalculationError,
    RSICondition,
)
from logging_config import get_logger, log_execution_time

logger = get_logger(__name__)


class TechnicalIndicatorCalculator(IndicatorCalculatorInterface):
    """
    Technical indicator calculator implementation.
    
    Computes RSI, MACD, EMA, and Bollinger Bands using pandas-ta.
    """
    
    def __init__(self):
        """Initialize the calculator."""
        self.settings = get_settings()
        logger.info("TechnicalIndicatorCalculator initialized")
    
    @log_execution_time(logger)
    def compute(self, df: pd.DataFrame) -> IndicatorResult:
        """
        Compute all technical indicators.
        
        Args:
            df: DataFrame with OHLCV data
            
        Returns:
            IndicatorResult with all computed values
            
        Raises:
            IndicatorCalculationError: If calculation fails
        """
        try:
            df = df.copy()
            
            # Compute RSI
            rsi_series = self.compute_rsi(df, period=14)
            rsi_val = float(rsi_series.iloc[-1]) if not rsi_series.empty else None
            rsi_condition = self._classify_rsi(rsi_val)
            
            # Compute MACD
            macd_line, macd_signal, macd_histogram = self.compute_macd(df)
            macd_val = float(macd_line.iloc[-1]) if not macd_line.empty else None
            macd_s_val = float(macd_signal.iloc[-1]) if not macd_signal.empty else None
            macd_h_val = float(macd_histogram.iloc[-1]) if not macd_histogram.empty else None
            macd_signal_type = self._classify_macd(macd_val, macd_s_val, macd_h_val)
            
            # Compute EMAs
            ema_short_series = self.compute_ema(df, period=9)
            ema_long_series = self.compute_ema(df, period=21)
            ema_200_series = self.compute_ema(df, period=200)
            
            ema_short = float(ema_short_series.iloc[-1]) if not ema_short_series.empty else None
            ema_long = float(ema_long_series.iloc[-1]) if not ema_long_series.empty else None
            ema_200 = float(ema_200_series.iloc[-1]) if not ema_200_series.empty else None
            
            # Compute Bollinger Bands
            bb_upper, bb_middle, bb_lower = self.compute_bollinger_bands(df)
            bb_u_val = float(bb_upper.iloc[-1]) if not bb_upper.empty else None
            bb_m_val = float(bb_middle.iloc[-1]) if not bb_middle.empty else None
            bb_l_val = float(bb_lower.iloc[-1]) if not bb_lower.empty else None
            bb_width = self._calculate_bb_width(bb_u_val, bb_l_val, bb_m_val)
            
            # Build series for charts
            def to_series(series: pd.Series) -> List[dict]:
                if series.empty:
                    return []
                return [
                    {"time": int(ts.timestamp()), "value": round(float(val), 4)}
                    for ts, val in series.dropna().items()
                ]
            
            return IndicatorResult(
                rsi=round(rsi_val, 4) if rsi_val else None,
                rsi_series=to_series(rsi_series),
                rsi_condition=rsi_condition,
                macd_line=round(macd_val, 4) if macd_val else None,
                macd_signal=round(macd_s_val, 4) if macd_s_val else None,
                macd_histogram=round(macd_h_val, 4) if macd_h_val else None,
                macd_signal_type=macd_signal_type,
                ema_short=round(ema_short, 4) if ema_short else None,
                ema_long=round(ema_long, 4) if ema_long else None,
                ema_200=round(ema_200, 4) if ema_200 else None,
                ema_short_series=to_series(ema_short_series),
                ema_long_series=to_series(ema_long_series),
                bb_upper=round(bb_u_val, 4) if bb_u_val else None,
                bb_middle=round(bb_m_val, 4) if bb_m_val else None,
                bb_lower=round(bb_l_val, 4) if bb_l_val else None,
                bb_width=round(bb_width, 4) if bb_width else None,
                bb_upper_series=to_series(bb_upper),
                bb_middle_series=to_series(bb_middle),
                bb_lower_series=to_series(bb_lower),
            )
            
        except Exception as exc:
            logger.exception("Indicator calculation failed")
            raise IndicatorCalculationError(
                message=f"Failed to compute indicators: {str(exc)}",
                details={"dataframe_shape": df.shape if df is not None else None},
            )
    
    def compute_rsi(self, df: pd.DataFrame, period: int = 14) -> pd.Series:
        """
        Compute RSI.
        
        Args:
            df: DataFrame with OHLCV data
            period: RSI period
            
        Returns:
            pd.Series with RSI values
        """
        return ta.rsi(df["Close"], length=period)
    
    def compute_macd(
        self,
        df: pd.DataFrame,
        fast: int = 12,
        slow: int = 26,
        signal: int = 9,
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """
        Compute MACD.
        
        Args:
            df: DataFrame with OHLCV data
            fast: Fast EMA period
            slow: Slow EMA period
            signal: Signal line period
            
        Returns:
            Tuple of (MACD line, Signal line, Histogram)
        """
        macd = ta.macd(df["Close"], fast=fast, slow=slow, signal=signal)
        return macd.iloc[:, 0], macd.iloc[:, 1], macd.iloc[:, 2]
    
    def compute_ema(self, df: pd.DataFrame, period: int) -> pd.Series:
        """
        Compute EMA.
        
        Args:
            df: DataFrame with OHLCV data
            period: EMA period
            
        Returns:
            pd.Series with EMA values
        """
        return ta.ema(df["Close"], length=period)
    
    def compute_bollinger_bands(
        self,
        df: pd.DataFrame,
        period: int = 20,
        std: float = 2.0,
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """
        Compute Bollinger Bands.
        
        Args:
            df: DataFrame with OHLCV data
            period: Moving average period
            std: Number of standard deviations
            
        Returns:
            Tuple of (Upper band, Middle band, Lower band)
        """
        bb = ta.bbands(df["Close"], length=period, std=std)
        return bb.iloc[:, 0], bb.iloc[:, 1], bb.iloc[:, 2]
    
    def _classify_rsi(self, rsi: Optional[float]) -> RSICondition:
        """Classify RSI value into condition."""
        if rsi is None:
            return RSICondition.NEUTRAL
        if rsi >= 70:
            return RSICondition.OVERBOUGHT
        if rsi <= 30:
            return RSICondition.OVERSOLD
        return RSICondition.NEUTRAL
    
    def _classify_macd(
        self,
        macd_line: Optional[float],
        macd_signal: Optional[float],
        macd_histogram: Optional[float],
    ) -> str:
        """Classify MACD signal."""
        if macd_line is None or macd_signal is None:
            return "neutral"
        if macd_line > macd_signal:
            return "buy"
        if macd_line < macd_signal:
            return "sell"
        return "neutral"
    
    def _calculate_bb_width(
        self,
        upper: Optional[float],
        lower: Optional[float],
        middle: Optional[float],
    ) -> Optional[float]:
        """Calculate Bollinger Band width percentage."""
        if upper is None or lower is None or middle is None or middle == 0:
            return None
        return (upper - lower) / middle * 100
