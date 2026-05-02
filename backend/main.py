"""
main.py
-------
Production-grade FastAPI application entry point.
"""

import os
import sys
import traceback
from contextlib import asynccontextmanager
from typing import AsyncGenerator

# Pre-startup diagnostics
print("=" * 60, file=sys.stderr)
print("STARTUP DIAGNOSTICS", file=sys.stderr)
print(f"Python version: {sys.version}", file=sys.stderr)
print(f"Working directory: {os.getcwd()}", file=sys.stderr)
print(f"PORT env var: {os.getenv('PORT', 'NOT SET')}", file=sys.stderr)
print(f"Files in cwd: {os.listdir('.')[:10]}", file=sys.stderr)
print("=" * 60, file=sys.stderr)

try:
    print("Importing FastAPI...", file=sys.stderr)
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse
    print("✅ FastAPI imported", file=sys.stderr)
    
    print("Importing config...", file=sys.stderr)
    from config import get_settings
    print("✅ Config imported", file=sys.stderr)
    
    print("Importing logging...", file=sys.stderr)
    from logging_config import setup_logging
    print("✅ Logging imported", file=sys.stderr)
    
    print("Importing api...", file=sys.stderr)
    from api import router, setup_middleware
    print("✅ API imported", file=sys.stderr)
    
except Exception as e:
    print(f"❌ CRITICAL IMPORT ERROR: {e}", file=sys.stderr)
    print(traceback.format_exc(), file=sys.stderr)
    # Create minimal error app
    from fastapi import FastAPI
    app = FastAPI()
    
    @app.get("/")
    @app.get("/health")
    async def error_endpoint():
        return {"status": "error", "message": str(e), "trace": traceback.format_exc().split("\n")[-5:]}
    
    @app.get("/{path:path}")
    async def catch_all(path: str):
        return {"status": "error", "message": f"Import error: {e}"}
else:
    # Normal startup
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        """Application lifespan manager."""
        try:
            settings = get_settings()
            logger = setup_logging()
            logger.info(
                f"🚀 {settings.name} v{settings.version} starting up",
                extra={"environment": settings.environment, "port": os.getenv('PORT')},
            )
            print(f"✅ Lifespan startup complete", file=sys.stderr)
        except Exception as e:
            print(f"❌ Lifespan error: {e}", file=sys.stderr)
        yield
        try:
            logger.info("🛑 Application shutting down")
        except:
            pass

    def create_app() -> FastAPI:
        """Application factory."""
        try:
            settings = get_settings()
            print(f"Creating app with settings...", file=sys.stderr)
            
            app = FastAPI(
                title=settings.name,
                description=settings.description,
                version=settings.version,
                lifespan=lifespan,
                docs_url="/docs" if not settings.is_production else None,
                redoc_url="/redoc" if not settings.is_production else None,
            )
            
            # Add CORS directly for reliability
            from fastapi.middleware.cors import CORSMiddleware
            app.add_middleware(
                CORSMiddleware,
                allow_origins=["*"],  # Allow all for debugging
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )
            print("✅ CORS middleware added", file=sys.stderr)
            
            # Setup other middleware
            setup_middleware(app)
            
            # Include routers
            app.include_router(router, prefix="")
            print("✅ Routers included", file=sys.stderr)
            
            return app
            
        except Exception as e:
            print(f"❌ Error creating app: {e}", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            raise

    # Create the application instance
    try:
        app = create_app()
        print("✅ App created successfully", file=sys.stderr)
    except Exception as e:
        print(f"❌ Failed to create app: {e}", file=sys.stderr)
        # Fallback error app
        app = FastAPI()
        @app.get("/")
        async def error_root():
            return {"status": "error", "message": f"Failed to create app: {str(e)}"}

# Run directly with `python main.py`
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"Starting uvicorn on port {port}...", file=sys.stderr)
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        workers=1,
    )
