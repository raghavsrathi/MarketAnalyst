"""
API module containing FastAPI application setup, routes, and middleware.
"""

from .dependencies import get_analysis_service, get_data_fetcher
from .middleware import setup_middleware
from .routes import router

__all__ = [
    "router",
    "setup_middleware",
    "get_analysis_service",
    "get_data_fetcher",
]
