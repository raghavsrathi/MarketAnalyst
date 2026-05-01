"""
middleware.py
-------------
FastAPI middleware for error handling, logging, and request/response processing.
"""

import time
import uuid
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware

from config import get_settings
from core import TradingAnalysisError
from logging_config import get_logger

logger = get_logger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Global error handling middleware.
    
    Catches all exceptions and converts them to proper API responses.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
            
        except TradingAnalysisError as exc:
            # Our custom exceptions - return structured response
            logger.warning(
                f"Business error: {exc.message}",
                extra={
                    "error_code": exc.error_code,
                    "status_code": exc.status_code,
                    "path": request.url.path,
                },
            )
            return JSONResponse(
                status_code=exc.status_code,
                content=exc.to_dict(),
            )
            
        except Exception as exc:
            # Unexpected errors - log and return generic message
            logger.exception(
                f"Unexpected error in {request.url.path}",
                extra={
                    "path": request.url.path,
                    "method": request.method,
                },
            )
            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": "INTERNAL_SERVER_ERROR",
                        "message": "An unexpected error occurred. Please try again later.",
                        "request_id": getattr(request.state, "request_id", str(uuid.uuid4())[:8]),
                    }
                },
            )


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Request/response logging middleware.
    
    Logs all requests with timing information.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Add request ID for correlation
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id
        
        # Start timing
        start_time = time.time()
        
        # Log request
        logger.info(
            f"Request started: {request.method} {request.url.path}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "query_params": str(request.query_params),
                "client_host": request.client.host if request.client else None,
            },
        )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Log response
            logger.info(
                f"Request completed: {request.method} {request.url.path} - {response.status_code}",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                },
            )
            
            # Add headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
            
            return response
            
        except Exception as exc:
            # Log error
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                f"Request failed: {request.method} {request.url.path} - {str(exc)}",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration_ms, 2),
                    "error": str(exc),
                },
            )
            raise


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple rate limiting middleware.
    
    Uses in-memory storage - consider Redis for production with multiple workers.
    """
    
    def __init__(self, app: FastAPI, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = {}  # client_ip -> [(timestamp, count)]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        settings = get_settings()
        
        # Skip rate limiting in development
        if settings.is_development:
            return await call_next(request)
        
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # Check rate limit
        if not self._is_allowed(client_ip):
            logger.warning(
                f"Rate limit exceeded for {client_ip}",
                extra={"client_ip": client_ip, "path": request.url.path},
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Rate limit exceeded. Maximum {self.max_requests} requests per {self.window_seconds} seconds.",
                    }
                },
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = self._get_remaining(client_ip)
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        
        return response
    
    def _is_allowed(self, client_ip: str) -> bool:
        """Check if request is allowed under rate limit."""
        import time
        
        now = time.time()
        window_start = now - self.window_seconds
        
        # Clean old entries
        if client_ip in self.requests:
            self.requests[client_ip] = [
                ts for ts in self.requests[client_ip] if ts > window_start
            ]
        else:
            self.requests[client_ip] = []
        
        # Check limit
        return len(self.requests.get(client_ip, [])) < self.max_requests
    
    def _get_remaining(self, client_ip: str) -> int:
        """Get remaining requests for client."""
        current = len(self.requests.get(client_ip, []))
        return max(0, self.max_requests - current)


def setup_middleware(app: FastAPI) -> None:
    """
    Configure all middleware for the FastAPI application.
    
    Args:
        app: FastAPI application instance
    """
    settings = get_settings()
    
    # CORS - must be first
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.security.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Error handling
    app.add_middleware(ErrorHandlingMiddleware)
    
    # Rate limiting (only in production)
    if settings.is_production:
        app.add_middleware(
            RateLimitMiddleware,
            max_requests=settings.security.rate_limit_requests,
            window_seconds=settings.security.rate_limit_window,
        )
    
    # Logging (last to capture everything)
    app.add_middleware(LoggingMiddleware)
    
    logger.info("Middleware configured")
