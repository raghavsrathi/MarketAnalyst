"""
test_api.py
-----------
API endpoint tests.
"""

import pytest


class TestHealthEndpoints:
    """Tests for health check endpoints."""
    
    def test_health_check(self, client):
        """Test the health check endpoint."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "service" in data
        assert "version" in data
    
    def test_readiness_check(self, client):
        """Test the readiness probe endpoint."""
        response = client.get("/ready")
        
        assert response.status_code == 200
        data = response.json()
        assert data["ready"] is True
    
    def test_metrics_endpoint(self, client):
        """Test the metrics endpoint."""
        response = client.get("/metrics")
        
        assert response.status_code == 200
        data = response.json()
        assert "timestamp" in data
        assert "service" in data


class TestIntervalsEndpoint:
    """Tests for the intervals endpoint."""
    
    def test_get_intervals(self, client):
        """Test getting supported intervals."""
        response = client.get("/intervals")
        
        assert response.status_code == 200
        data = response.json()
        assert "intervals" in data
        assert isinstance(data["intervals"], list)
        assert "1d" in data["intervals"]


class TestAnalysisEndpoint:
    """Tests for the analysis endpoint."""
    
    def test_analyze_invalid_symbol(self, client):
        """Test analysis with invalid symbol."""
        response = client.get("/analyze?symbol=INVALID_SYMBOL_123&interval=1d")
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
    
    def test_analyze_missing_symbol(self, client):
        """Test analysis without required symbol."""
        response = client.get("/analyze?interval=1d")
        
        assert response.status_code == 422  # Validation error
    
    def test_analyze_invalid_interval(self, client):
        """Test analysis with invalid interval."""
        response = client.get("/analyze?symbol=AAPL&interval=invalid")
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
    
    @pytest.mark.integration
    def test_analyze_success(self, client):
        """Integration test for successful analysis."""
        response = client.get("/analyze?symbol=AAPL&interval=1d")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert data["symbol"] == "AAPL"
        assert data["interval"] == "1d"
        assert "current_price" in data
        assert "candles" in data
        assert "indicators" in data
        assert "recommendation" in data
        
        # Check recommendation is valid
        assert data["recommendation"] in ["buy", "sell", "hold"]
        
        # Check confidence is valid
        assert data["confidence"] in ["high", "medium", "low"]


class TestErrorHandling:
    """Tests for error handling."""
    
    def test_not_found(self, client):
        """Test 404 for non-existent endpoint."""
        response = client.get("/nonexistent")
        
        assert response.status_code == 404
    
    def test_cors_headers(self, client):
        """Test CORS headers are present."""
        response = client.options("/health")
        
        assert "access-control-allow-origin" in response.headers


class TestResponseHeaders:
    """Tests for response headers."""
    
    def test_request_id_header(self, client):
        """Test X-Request-ID header is present."""
        response = client.get("/health")
        
        assert "x-request-id" in response.headers
        assert len(response.headers["x-request-id"]) > 0
    
    def test_response_time_header(self, client):
        """Test X-Response-Time header is present."""
        response = client.get("/health")
        
        assert "x-response-time" in response.headers
