"""Async database session and connection management."""

import logging
import time
from typing import AsyncGenerator, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

logger = logging.getLogger(__name__)


class DatabaseNotConfiguredError(Exception):
    """Raised when database operations are requested but DATABASE_URL is not set."""
    pass


_engine: Optional[AsyncEngine] = None
_session_factory: Optional[async_sessionmaker[AsyncSession]] = None


def get_engine() -> AsyncEngine:
    """Retrieve or lazily initialize the AsyncEngine."""
    global _engine, _session_factory
    if _engine is None:
        db_url = settings.async_database_url
        if not db_url:
            raise DatabaseNotConfiguredError(
                "DATABASE_URL is not configured. Please set DATABASE_URL in backend/.env"
            )

        logger.info("Initializing async database engine with URL: %s", settings.masked_database_url)

        # Build connect args. For Supabase connections, SSL is required.
        connect_args = {}
        if "supabase" in db_url or "sslmode=require" in db_url:
            connect_args["sslmode"] = "require"

        _engine = create_async_engine(
            db_url,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_timeout=settings.DB_POOL_TIMEOUT,
            pool_pre_ping=True,
            echo=False,
            connect_args=connect_args,
        )
        _session_factory = async_sessionmaker(
            bind=_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _engine


def async_session_factory() -> async_sessionmaker[AsyncSession]:
    """Retrieve the sessionmaker instance."""
    get_engine()
    assert _session_factory is not None
    return _session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding an async SQLAlchemy session.
    Automatically commits on success or rolls back on exception.
    """
    sessionmaker_inst = async_session_factory()
    async with sessionmaker_inst() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def check_db_connection() -> dict:
    """
    Health check helper to verify database connectivity.
    Returns a status dictionary with latency in milliseconds.
    """
    if not settings.database_url_str:
        return {"status": "unconfigured", "error": "DATABASE_URL not set"}

    try:
        engine = get_engine()
        start = time.perf_counter()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return {"status": "connected", "latency_ms": latency_ms}
    except Exception as e:
        logger.error("Database health check failed: %s", type(e).__name__)
        return {"status": "error", "error": type(e).__name__}
