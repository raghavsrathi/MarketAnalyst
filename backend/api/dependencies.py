"""
dependencies.py
---------------
FastAPI dependency injection setup.
Provides singleton instances of services.
"""

from functools import lru_cache
from typing import AsyncGenerator

from fastapi import Request

from config import get_settings
from core import DataFetcherInterface, AnalysisServiceInterface
from services import YahooFinanceDataFetcher, AnalysisService


@lru_cache()
def get_data_fetcher() -> DataFetcherInterface:
    """
    Get cached data fetcher instance.
    
    Returns:
        DataFetcherInterface: Yahoo Finance data fetcher
    """
    return YahooFinanceDataFetcher()


@lru_cache()
def get_analysis_service() -> AnalysisServiceInterface:
    """
    Get cached analysis service instance.
    
    Returns:
        AnalysisServiceInterface: Complete analysis service
    """
    settings = get_settings()
    return AnalysisService(
        data_fetcher=get_data_fetcher(),
        enable_cache=settings.enable_cache,
    )


async def get_request_context(request: Request) -> AsyncGenerator[dict, None]:
    """
    Get request context for logging correlation.
    
    Yields a dictionary with request context info.
    Can be used to add correlation IDs to logs.
    
    Args:
        request: FastAPI request object
        
    Yields:
        dict: Request context with correlation_id
    """
    # Generate or extract correlation ID
    correlation_id = request.headers.get("X-Correlation-ID")
    if not correlation_id:
        import uuid
        correlation_id = str(uuid.uuid4())[:8]
    
    context = {
        "correlation_id": correlation_id,
        "request_method": request.method,
        "request_path": request.url.path,
        "client_host": request.client.host if request.client else None,
    }
    
    yield context


# Cleanup function for shutdown events
def clear_service_cache():
    """Clear the service cache (useful for testing)."""
    get_data_fetcher.cache_clear()
    get_analysis_service.cache_clear()
