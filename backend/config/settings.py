"""
settings.py
-----------
Application configuration using Pydantic Settings.
Supports environment variables and .env files.
"""

import os
from functools import lru_cache
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class LoggingConfig(BaseSettings):
    """Logging configuration subset."""
    
    model_config = SettingsConfigDict(env_prefix="LOG_")
    
    level: str = Field(default="INFO", description="Logging level")
    format: str = Field(
        default="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        description="Log format string"
    )
    json_format: bool = Field(default=False, description="Use JSON formatting for logs")
    file_path: Optional[str] = Field(default=None, description="Log file path")
    max_bytes: int = Field(default=10_485_760, description="Max log file size (10MB)")
    backup_count: int = Field(default=5, description="Number of backup files")


class CacheConfig(BaseSettings):
    """Cache configuration."""
    
    model_config = SettingsConfigDict(env_prefix="CACHE_")
    
    enabled: bool = Field(default=True, description="Enable caching")
    ttl_seconds: int = Field(default=300, description="Cache TTL in seconds")
    max_size: int = Field(default=1000, description="Maximum cache entries")


class SecurityConfig(BaseSettings):
    """Security configuration."""
    
    model_config = SettingsConfigDict(env_prefix="SECURITY_")
    
    api_key_header: str = Field(default="X-API-Key", description="API key header name")
    api_key: Optional[str] = Field(default=None, description="API key for authentication")
    rate_limit_requests: int = Field(default=100, description="Rate limit requests per window")
    rate_limit_window: int = Field(default=60, description="Rate limit window in seconds")
    cors_origins: List[str] = Field(default_factory=lambda: ["*"], description="CORS allowed origins")
    
    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


class YahooFinanceConfig(BaseSettings):
    """Yahoo Finance specific configuration."""
    
    model_config = SettingsConfigDict(env_prefix="YF_")
    
    timeout_seconds: int = Field(default=30, description="Request timeout")
    max_retries: int = Field(default=3, description="Maximum retry attempts")
    retry_delay: float = Field(default=1.0, description="Delay between retries")
    user_agent: str = Field(
        default="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        description="User agent for requests"
    )


class Settings(BaseSettings):
    """
    Main application settings.
    
    Environment variables are automatically loaded from .env file
    and environment with the APP_ prefix.
    """
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="APP_",
        extra="ignore",
    )
    
    # Application
    name: str = Field(default="Trading Analysis API", description="Application name")
    version: str = Field(default="1.0.0", description="Application version")
    description: str = Field(
        default="Automated technical analysis engine for stocks and crypto",
        description="Application description"
    )
    environment: str = Field(default="development", description="Environment (development/staging/production)")
    debug: bool = Field(default=False, description="Debug mode")
    
    # Server
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    reload: bool = Field(default=False, description="Auto-reload on code changes")
    workers: Optional[int] = Field(default=None, description="Number of worker processes")
    
    # Feature flags
    enable_websocket: bool = Field(default=True, description="Enable WebSocket endpoints")
    enable_metrics: bool = Field(default=True, description="Enable metrics endpoint")
    enable_cache: bool = Field(default=True, description="Enable data caching")
    
    # Sub-configurations
    logging: LoggingConfig = Field(default_factory=LoggingConfig)
    cache: CacheConfig = Field(default_factory=CacheConfig)
    security: SecurityConfig = Field(default_factory=SecurityConfig)
    yahoo_finance: YahooFinanceConfig = Field(default_factory=YahooFinanceConfig)
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.environment.lower() == "development"
    
    def __hash__(self):
        """Make Settings hashable for LRU cache."""
        return hash((self.environment, self.host, self.port))


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached application settings.
    
    The settings are cached to avoid reloading from environment
    on every request. Use this function to get settings in the app.
    
    Returns:
        Settings: Application configuration
        
    Example:
        >>> from config import get_settings
        >>> settings = get_settings()
        >>> print(settings.app_name)
    """
    return Settings()


def get_test_settings() -> Settings:
    """
    Get settings configured for testing.
    
    Returns:
        Settings: Test-optimized configuration
    """
    return Settings(
        environment="testing",
        debug=True,
        logging=LoggingConfig(level="DEBUG"),
        cache=CacheConfig(enabled=False),
        enable_websocket=False,
    )
