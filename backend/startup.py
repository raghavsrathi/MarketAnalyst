"""
Startup script with error handling for Railway deployment.
"""
import sys
import traceback

try:
    print("Starting Trading Analysis API...")
    print(f"Python version: {sys.version}")
    
    # Try importing key modules
    print("Importing FastAPI...")
    from fastapi import FastAPI
    
    print("Importing config...")
    from config import get_settings
    
    print("Importing main app...")
    from main import app
    
    print("All imports successful!")
    
    # Get settings
    settings = get_settings()
    print(f"Settings loaded: {settings.name} v{settings.version}")
    print(f"Environment: {settings.environment}")
    print(f"Host: {settings.host}, Port: {settings.port}")
    
except Exception as e:
    print(f"CRITICAL ERROR during startup: {e}")
    print(traceback.format_exc())
    sys.exit(1)

# If we get here, startup is successful
print("✅ Startup verification passed")
