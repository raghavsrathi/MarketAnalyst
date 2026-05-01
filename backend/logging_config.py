"""
logging_config.py
------------------
Structured logging configuration for the application.
Supports both console and file logging with JSON formatting option.
"""

import logging
import logging.handlers
import sys
from datetime import datetime
from typing import Any, Dict

from pythonjsonlogger import jsonlogger

from config import get_settings


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter with additional fields."""
    
    def add_fields(
        self,
        log_record: Dict[str, Any],
        record: logging.LogRecord,
        message_dict: Dict[str, Any],
    ) -> None:
        """Add custom fields to the log record."""
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        
        # Add timestamp in ISO format
        if not log_record.get("timestamp"):
            log_record["timestamp"] = datetime.utcnow().isoformat()
        
        # Add log level
        if log_record.get("level"):
            log_record["level"] = log_record["level"].upper()
        else:
            log_record["level"] = record.levelname
        
        # Add source location
        log_record["source"] = {
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "pathname": record.pathname,
        }
        
        # Add correlation ID if available
        # This can be set via logging extras: logger.info("msg", extra={"correlation_id": "abc123"})
        if hasattr(record, "correlation_id"):
            log_record["correlation_id"] = record.correlation_id
        
        # Add request ID if available
        if hasattr(record, "request_id"):
            log_record["request_id"] = record.request_id
        
        # Rename 'name' to 'logger' for clarity
        if "name" in log_record:
            log_record["logger"] = log_record.pop("name")


def setup_logging() -> logging.Logger:
    """
    Configure application logging.
    
    Sets up structured logging with both console and optional file handlers.
    Supports JSON formatting for production environments.
    
    Returns:
        logging.Logger: The configured root logger
    """
    settings = get_settings()
    log_config = settings.logging
    
    # Get or create the root logger for the app
    logger = logging.getLogger("trading_analysis")
    logger.setLevel(getattr(logging, log_config.level.upper()))
    
    # Remove existing handlers to avoid duplicates on re-initialization
    logger.handlers = []
    
    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_config.level.upper()))
    
    if log_config.json_format:
        # JSON formatter for structured logging
        formatter = CustomJsonFormatter(
            "%(timestamp)s %(level)s %(name)s %(message)s",
            rename_fields={"levelname": "level", "name": "logger"},
        )
    else:
        # Human-readable formatter
        formatter = logging.Formatter(log_config.format)
    
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File Handler (optional)
    if log_config.file_path:
        file_handler = logging.handlers.RotatingFileHandler(
            filename=log_config.file_path,
            maxBytes=log_config.max_bytes,
            backupCount=log_config.backup_count,
        )
        file_handler.setLevel(getattr(logging, log_config.level.upper()))
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
    
    # yfinance can be verbose
    logging.getLogger("yfinance").setLevel(logging.WARNING)
    
    logger.info(
        "Logging configured",
        extra={
            "level": log_config.level,
            "json_format": log_config.json_format,
            "file_logging": log_config.file_path is not None,
        },
    )
    
    return logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the specified name.
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        logging.Logger: Configured logger instance
        
    Example:
        >>> from logging_config import get_logger
        >>> logger = get_logger(__name__)
        >>> logger.info("Application started")
    """
    return logging.getLogger(f"trading_analysis.{name}")


class ContextFilter(logging.Filter):
    """
    Filter that adds context information to log records.
    Useful for adding correlation IDs or request IDs.
    """
    
    def __init__(self, context: Dict[str, Any] = None):
        super().__init__()
        self.context = context or {}
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Add context fields to the log record."""
        for key, value in self.context.items():
            if not hasattr(record, key):
                setattr(record, key, value)
        return True


def add_context_to_logger(logger: logging.Logger, context: Dict[str, Any]) -> None:
    """
    Add a context filter to a logger.
    
    Args:
        logger: The logger to add context to
        context: Dictionary of context fields to add
    """
    context_filter = ContextFilter(context)
    logger.addFilter(context_filter)


# Performance logging decorator
import functools
import time


def log_execution_time(logger: logging.Logger = None, level: int = logging.DEBUG):
    """
    Decorator to log function execution time.
    
    Args:
        logger: Logger instance (uses root logger if not provided)
        level: Logging level for the timing message
        
    Example:
        >>> @log_execution_time()
        ... def slow_function():
        ...     time.sleep(1)
    """
    def decorator(func):
        log = logger or get_logger(func.__module__)
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                log.log(
                    level,
                    f"{func.__name__} executed in {execution_time:.3f}s",
                    extra={
                        "function": func.__name__,
                        "execution_time_ms": execution_time * 1000,
                        "status": "success",
                    },
                )
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                log.error(
                    f"{func.__name__} failed after {execution_time:.3f}s: {str(e)}",
                    extra={
                        "function": func.__name__,
                        "execution_time_ms": execution_time * 1000,
                        "status": "error",
                        "error": str(e),
                    },
                    exc_info=True,
                )
                raise
        
        return wrapper
    return decorator
