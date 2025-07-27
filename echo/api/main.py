"""
Echo API Main Application

FastAPI application with modular router structure.
"""

import logging
import os
from datetime import datetime, date, time, timedelta

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Echo API", 
    description="API for Echo daily planning system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.error(f"Global exception handler caught: {exc}", exc_info=True)
    
    # Don't expose internal errors in production
    if os.getenv("ECHO_ENVIRONMENT") == "development":
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "error": str(exc)}
        )
    else:
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with proper logging."""
    logger.warning(f"HTTP {exc.status_code}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


# Import and include routers
from echo.api.routers import health, config, today, analytics, projects, sessions, scaffolds

app.include_router(health.router, tags=["health"])
app.include_router(config.router, tags=["config"])
app.include_router(today.router, tags=["today"])
app.include_router(analytics.router, tags=["analytics"])
app.include_router(projects.router, tags=["projects"])
app.include_router(sessions.router, tags=["sessions"])
app.include_router(scaffolds.router, tags=["scaffolds"])


if __name__ == "__main__":
    import uvicorn
    # Configure timeouts for Claude API calls which can take 15-30+ seconds
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        timeout_keep_alive=120,  # Keep connections alive for 2 minutes
        timeout_graceful_shutdown=30,  # Graceful shutdown timeout
        access_log=True,
        log_level="info"
    )