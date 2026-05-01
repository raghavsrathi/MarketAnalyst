"""
conftest.py
-----------
Pytest configuration and fixtures.
"""

import pytest
from fastapi.testclient import TestClient

from config import get_test_settings
from core import get_test_settings as core_test_settings
from main import create_app
from api.dependencies import clear_service_cache


@pytest.fixture(scope="session")
def test_settings():
    """Provide test settings for all tests."""
    return get_test_settings()


@pytest.fixture(scope="function")
def app():
    """Create a fresh app instance for each test."""
    # Clear any cached services
    clear_service_cache()
    
    # Create app with test settings
    app = create_app()
    
    yield app
    
    # Cleanup
    clear_service_cache()


@pytest.fixture(scope="function")
def client(app):
    """Provide a test client."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="function")
def mock_data_fetcher():
    """Provide a mock data fetcher for unit tests."""
    from unittest.mock import Mock
    
    mock = Mock()
    mock.fetch_ohlcv.return_value = None  # Will be set in tests
    mock.validate_symbol.return_value = True
    mock.normalize_symbol.return_value = "AAPL"
    mock.get_supported_intervals.return_value = ["1d", "1h", "1m"]
    
    return mock


@pytest.fixture
def sample_ohlcv_data():
    """Provide sample OHLCV data for testing."""
    import pandas as pd
    from datetime import datetime, timedelta
    import numpy as np
    
    # Generate 50 days of sample data
    dates = pd.date_range(start=datetime.now() - timedelta(days=50), periods=50, freq='D')
    
    # Generate trending data
    base_price = 100
    prices = base_price + np.cumsum(np.random.randn(50) * 2)
    
    df = pd.DataFrame({
        'Open': prices + np.random.randn(50) * 0.5,
        'High': prices + abs(np.random.randn(50)) + 1,
        'Low': prices - abs(np.random.randn(50)) - 1,
        'Close': prices,
        'Volume': np.random.randint(1000000, 10000000, 50),
    }, index=dates)
    
    return df
