"""
test_services.py
----------------
Unit tests for service layer.
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from core import (
    RSICondition,
    TrendDirection,
    TrendStrength,
    Recommendation,
    Confidence,
    InvalidSymbolError,
    DataFetchError,
)
from services import (
    TechnicalIndicatorCalculator,
    ChartPatternDetector,
    TradingSignalGenerator,
)


class TestTechnicalIndicatorCalculator:
    """Tests for the indicator calculator."""
    
    @pytest.fixture
    def calculator(self):
        return TechnicalIndicatorCalculator()
    
    @pytest.fixture
    def sample_df(self):
        """Create sample OHLCV data."""
        dates = pd.date_range(end=datetime.now(), periods=50, freq='D')
        prices = 100 + np.cumsum(np.random.randn(50) * 2)
        
        return pd.DataFrame({
            'Open': prices + np.random.randn(50) * 0.5,
            'High': prices + abs(np.random.randn(50)) + 1,
            'Low': prices - abs(np.random.randn(50)) - 1,
            'Close': prices,
            'Volume': np.random.randint(1000000, 10000000, 50),
        }, index=dates)
    
    def test_compute_all_indicators(self, calculator, sample_df):
        """Test computing all indicators."""
        result = calculator.compute(sample_df)
        
        assert result.rsi is not None
        assert result.macd_line is not None
        assert result.ema_short is not None
        assert result.ema_long is not None
        assert result.bb_upper is not None
    
    def test_compute_rsi(self, calculator, sample_df):
        """Test RSI calculation."""
        rsi_series = calculator.compute_rsi(sample_df, period=14)
        
        assert not rsi_series.empty
        assert 0 <= rsi_series.iloc[-1] <= 100
    
    def test_compute_macd(self, calculator, sample_df):
        """Test MACD calculation."""
        macd_line, macd_signal, macd_hist = calculator.compute_macd(sample_df)
        
        assert not macd_line.empty
        assert not macd_signal.empty
        assert not macd_hist.empty
    
    def test_compute_ema(self, calculator, sample_df):
        """Test EMA calculation."""
        ema = calculator.compute_ema(sample_df, period=9)
        
        assert not ema.empty
        assert len(ema) == len(sample_df)
    
    def test_compute_bollinger_bands(self, calculator, sample_df):
        """Test Bollinger Bands calculation."""
        upper, middle, lower = calculator.compute_bollinger_bands(sample_df)
        
        assert not upper.empty
        assert not middle.empty
        assert not lower.empty
        assert (upper >= middle).all()
        assert (middle >= lower).all()
    
    def test_rsi_classification(self, calculator):
        """Test RSI condition classification."""
        assert calculator._classify_rsi(75) == RSICondition.OVERBOUGHT
        assert calculator._classify_rsi(25) == RSICondition.OVERSOLD
        assert calculator._classify_rsi(50) == RSICondition.NEUTRAL


class TestChartPatternDetector:
    """Tests for the pattern detector."""
    
    @pytest.fixture
    def detector(self):
        return ChartPatternDetector()
    
    @pytest.fixture
    def sample_df(self):
        """Create sample OHLCV data."""
        dates = pd.date_range(end=datetime.now(), periods=50, freq='D')
        
        # Create data with a clear uptrend
        prices = np.linspace(100, 150, 50) + np.random.randn(50) * 2
        
        return pd.DataFrame({
            'Open': prices + np.random.randn(50) * 0.5,
            'High': prices + abs(np.random.randn(50)) + 1,
            'Low': prices - abs(np.random.randn(50)) - 1,
            'Close': prices,
            'Volume': np.random.randint(1000000, 10000000, 50),
        }, index=dates)
    
    @pytest.fixture
    def sample_indicators(self):
        """Create sample indicator result."""
        from core import IndicatorResult
        return IndicatorResult(
            rsi=55.0,
            ema_short=120.0,
            ema_long=115.0,
            ema_200=110.0,
        )
    
    def test_detect_trend_bullish(self, detector, sample_df, sample_indicators):
        """Test bullish trend detection."""
        trend, strength = detector.detect_trend(sample_df, sample_indicators)
        
        assert trend in [TrendDirection.BULLISH, TrendDirection.BEARISH, TrendDirection.NEUTRAL]
        assert strength in [TrendStrength.STRONG, TrendStrength.MODERATE, TrendStrength.WEAK]
    
    def test_detect_support_resistance(self, detector, sample_df):
        """Test support/resistance detection."""
        current_price = sample_df['Close'].iloc[-1]
        support, resistance = detector.detect_support_resistance(sample_df, current_price)
        
        # Support should be below current price if found
        if support:
            assert support < current_price
        
        # Resistance should be above current price if found
        if resistance:
            assert resistance > current_price


class TestTradingSignalGenerator:
    """Tests for the signal generator."""
    
    @pytest.fixture
    def generator(self):
        return TradingSignalGenerator()
    
    @pytest.fixture
    def bullish_indicators(self):
        """Create bullish indicator scenario."""
        from core import IndicatorResult
        return IndicatorResult(
            rsi=45.0,  # Neutral
            macd_line=2.0,
            macd_signal=1.0,
            macd_histogram=1.0,
            ema_short=120.0,
            ema_long=115.0,
            ema_200=110.0,
            bb_upper=130.0,
            bb_middle=120.0,
            bb_lower=110.0,
        )
    
    @pytest.fixture
    def bullish_patterns(self):
        """Create bullish pattern scenario."""
        from core import PatternResult
        return PatternResult(
            trend=TrendDirection.BULLISH,
            trend_strength=TrendStrength.STRONG,
            rsi_condition=RSICondition.NEUTRAL,
            support=110.0,
            resistance=130.0,
        )
    
    def test_generate_buy_signal(self, generator, bullish_indicators, bullish_patterns):
        """Test generating buy signal."""
        result = generator.generate(bullish_indicators, bullish_patterns, 125.0)
        
        assert result.recommendation == Recommendation.BUY
        assert result.score > 0
        assert result.breakdown.macd > 0
        assert result.breakdown.ema_trend > 0
    
    def test_calculate_score(self, generator, bullish_indicators, bullish_patterns):
        """Test score calculation."""
        score = generator.calculate_score(bullish_indicators, bullish_patterns, 125.0)
        
        assert isinstance(score, float)
    
    def test_get_rsi_signal(self, generator):
        """Test RSI signal contribution."""
        assert generator.get_rsi_signal(80) < 0  # Overbought = sell signal
        assert generator.get_rsi_signal(20) > 0  # Oversold = buy signal
        assert generator.get_rsi_signal(50) == 0  # Neutral
    
    def test_get_macd_signal(self, generator):
        """Test MACD signal contribution."""
        score, label = generator.get_macd_signal(2.0, 1.0, 0.5)
        
        assert score > 0
        assert label == "buy"


class TestYahooFinanceDataFetcher:
    """Tests for the data fetcher."""
    
    @pytest.fixture
    def fetcher(self):
        from services import YahooFinanceDataFetcher
        return YahooFinanceDataFetcher()
    
    def test_validate_symbol_valid(self, fetcher):
        """Test symbol validation with valid symbols."""
        assert fetcher.validate_symbol("AAPL") is True
        assert fetcher.validate_symbol("BTC-USD") is True
        assert fetcher.validate_symbol("SPY") is True
    
    def test_validate_symbol_invalid(self, fetcher):
        """Test symbol validation with invalid symbols."""
        assert fetcher.validate_symbol("") is False
        assert fetcher.validate_symbol("a" * 25) is False  # Too long
    
    def test_normalize_symbol(self, fetcher):
        """Test symbol normalization."""
        assert fetcher.normalize_symbol("aapl") == "AAPL"
        assert fetcher.normalize_symbol("  AAPL  ") == "AAPL"
    
    def test_get_supported_intervals(self, fetcher):
        """Test getting supported intervals."""
        intervals = fetcher.get_supported_intervals()
        
        assert isinstance(intervals, list)
        assert "1d" in intervals
        assert "1h" in intervals
