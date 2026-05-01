"""
Configuration module for the trading analysis API.
Uses Pydantic Settings for environment-based configuration.
"""

from .settings import Settings, get_settings

__all__ = ["Settings", "get_settings"]
