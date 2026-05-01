"""
routes.py
---------
FastAPI route definitions.
"""

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from api.dependencies import get_analysis_service, get_data_fetcher
from config import get_settings
from core import (
    AnalysisServiceInterface,
    DataFetcherInterface,
    InvalidSymbolError,
    TradingAnalysisError,
)
from logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter()


@asynccontextmanager
async def get_lifespan_context() -> AsyncGenerator[None, None]:
    """Application lifespan context manager."""
    settings = get_settings()
    logger.info(
        f"🚀 {settings.name} v{settings.version} starting up",
        extra={"environment": settings.environment},
    )
    yield
    logger.info("🛑 Application shutting down")


@router.get("/health", tags=["System"])
async def health_check() -> dict:
    """
    Health check endpoint.
    
    Returns:
        dict: Health status and application info
    """
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.name,
        "version": settings.version,
        "environment": settings.environment,
    }


@router.get("/ready", tags=["System"])
async def readiness_check() -> dict:
    """
    Readiness probe for orchestration.
    
    Checks if the service is ready to accept requests.
    """
    # Could add dependency checks here (database, external APIs, etc.)
    return {"ready": True}


@router.get("/metrics", tags=["System"])
async def metrics() -> dict:
    """
    Basic metrics endpoint.
    
    Returns:
        dict: Application metrics
    """
    import sys
    import time
    
    settings = get_settings()
    
    return {
        "timestamp": time.time(),
        "service": settings.name,
        "version": settings.version,
        "python_version": sys.version,
    }


@router.get("/intervals", tags=["Meta"])
async def get_intervals(
    data_fetcher: DataFetcherInterface = Depends(get_data_fetcher),
) -> dict:
    """
    Get supported timeframe intervals.
    
    Returns:
        dict: List of supported intervals
    """
    intervals = data_fetcher.get_supported_intervals()
    return {"intervals": intervals}


@router.get("/analyze", tags=["Analysis"])
async def analyze(
    symbol: str = Query(
        ...,
        description="Ticker symbol (e.g., AAPL, BTC-USD)",
        min_length=1,
        max_length=20,
    ),
    interval: str = Query(
        default="1d",
        description="Timeframe interval (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1wk, 1mo)",
    ),
    analysis_service: AnalysisServiceInterface = Depends(get_analysis_service),
) -> dict:
    """
    Perform full technical analysis for a symbol.
    
    Args:
        symbol: Ticker symbol to analyze
        interval: Timeframe interval
        analysis_service: Injected analysis service
        
    Returns:
        dict: Complete analysis results
        
    Raises:
        TradingAnalysisError: If analysis fails
    """
    logger.info(f"Analysis request: {symbol} {interval}")
    
    try:
        result = await analysis_service.analyze(symbol, interval)
        return result.to_dict()
        
    except TradingAnalysisError:
        # Re-raise to be caught by middleware
        raise
    except Exception as exc:
        logger.exception(f"Unexpected error analyzing {symbol}")
        raise TradingAnalysisError(
            message=f"Analysis failed: {str(exc)}",
            error_code="ANALYSIS_ERROR",
            details={"symbol": symbol, "interval": interval},
        )


@router.websocket("/ws/live")
async def websocket_live(
    websocket: WebSocket,
    symbol: str = Query("AAPL"),
    interval: str = Query("1d"),
    refresh_seconds: int = Query(60, ge=10, le=3600),
    analysis_service: AnalysisServiceInterface = Depends(get_analysis_service),
):
    """
    WebSocket endpoint for live updates.
    
    Pushes fresh analysis every `refresh_seconds`.
    
    Args:
        websocket: WebSocket connection
        symbol: Symbol to monitor
        interval: Timeframe interval
        refresh_seconds: Update interval
        analysis_service: Injected analysis service
    """
    settings = get_settings()
    
    if not settings.enable_websocket:
        await websocket.close(code=1000, reason="WebSocket disabled")
        return
    
    await websocket.accept()
    logger.info(f"WS connected: {symbol} {interval}")
    
    try:
        while True:
            try:
                result = await analysis_service.analyze(symbol, interval)
                
                # Send minimal payload for WebSocket
                payload = {
                    "symbol": result.symbol,
                    "interval": result.interval,
                    "current_price": result.current_price,
                    "trend": result.patterns.trend.value,
                    "rsi": result.indicators.rsi,
                    "macd_signal": result.signals.macd_signal,
                    "recommendation": result.signals.recommendation.value,
                    "confidence": result.signals.confidence.value,
                    "score": result.signals.score,
                    "summary": result.signals.summary,
                    "patterns": result.patterns.patterns,
                    "support": result.patterns.support,
                    "resistance": result.patterns.resistance,
                    "timestamp": result.timestamp.isoformat(),
                }
                
                await websocket.send_json(payload)
                
            except TradingAnalysisError as exc:
                await websocket.send_json({
                    "error": exc.message,
                    "code": exc.error_code,
                })
            except Exception as exc:
                logger.exception(f"WS error for {symbol}")
                await websocket.send_json({
                    "error": "Analysis failed",
                    "code": "INTERNAL_ERROR",
                })
            
            await asyncio.sleep(refresh_seconds)
            
    except WebSocketDisconnect:
        logger.info(f"WS disconnected: {symbol}")
    except Exception as exc:
        logger.exception(f"WS error: {symbol}")
        await websocket.close(code=1011, reason=str(exc))
