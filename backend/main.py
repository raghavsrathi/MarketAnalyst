"""
main.py
-------
Production-grade FastAPI application entry point.

Refactored with:
- Configuration management via Pydantic Settings
- Structured logging with context
- Dependency injection
- Proper error handling middleware
- Testability through interfaces
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from api import router, setup_middleware
from config import get_settings
from logging_config import setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    settings = get_settings()
    logger = setup_logging()
    logger.info(
        f"🚀 {settings.name} v{settings.version} starting up",
        extra={"environment": settings.environment},
    )
    yield
    logger.info("🛑 Application shutting down")


def create_app() -> FastAPI:
    """
    Application factory.
    
    Returns:
        FastAPI: Configured application instance
    """
    settings = get_settings()
    
    app = FastAPI(
        title=settings.name,
        description=settings.description,
        version=settings.version,
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
    )
    
    # Setup middleware (includes CORS, logging, error handling)
    setup_middleware(app)
    
    # Include routers
    app.include_router(router, prefix="")
    
    return app


# Create the application instance
app = create_app()


# Run directly with `python main.py`
if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        workers=settings.workers,
    )
