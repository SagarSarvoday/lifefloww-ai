"""FastAPI application entry point for LifeFlow AI Backend."""

import logging
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.database import DatabaseNotConfiguredError
from app.routes.activities import router as activities_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("lifeflow-backend")

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for LifeFlow AI - Personal AI Activity Organizer",
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return clean JSON error response for request validation failures."""
    errors = exc.errors()
    error_messages = []
    for err in errors:
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "Validation error")
        error_messages.append(f"{loc}: {msg}")

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "; ".join(error_messages),
            "data": None,
        },
    )


@app.exception_handler(DatabaseNotConfiguredError)
async def db_not_configured_handler(request: Request, exc: DatabaseNotConfiguredError):
    """Return 503 Service Unavailable when database is not configured."""
    return JSONResponse(
        status_code=503,
        content={
            "detail": str(exc),
            "success": False,
            "data": None,
        },
    )


# Include API v1 router
app.include_router(activities_router, prefix="/api/v1")


@app.get("/", tags=["root"])
async def root():
    """Root redirect / welcoming endpoint."""
    return {
        "message": "Welcome to LifeFlow AI API",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
