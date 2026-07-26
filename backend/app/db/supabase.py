"""
Async PostgreSQL Service Layer for Supabase
Provides connection pooling, health readiness checks, and parameterized query execution.
"""

import os
import logging
import asyncio
from typing import AsyncGenerator, Any, Optional
import asyncpg
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)

class DatabaseSettings(BaseSettings):
    supabase_database_url: str = os.getenv("SUPABASE_DATABASE_URL", os.getenv("DATABASE_URL", ""))
    demo_mode: bool = os.getenv("DEMO_MODE", "true").lower() == "true"
    db_pool_min_size: int = 2
    db_pool_max_size: int = 10
    db_request_timeout_seconds: float = 10.0

    class Config:
        env_prefix = ""

settings = DatabaseSettings()

_pool: Optional[asyncpg.Pool] = None

async def get_db_pool() -> Optional[asyncpg.Pool]:
    global _pool
    if _pool is not None:
        return _pool

    url = settings.supabase_database_url
    if not url:
        if not settings.demo_mode:
            logger.error("SUPABASE_DATABASE_URL is missing and DEMO_MODE is False!")
        return None

    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    try:
        _pool = await asyncpg.create_pool(
            dsn=url,
            min_size=settings.db_pool_min_size,
            max_size=settings.db_pool_max_size,
            command_timeout=settings.db_request_timeout_seconds,
        )
        logger.info("✓ Async PostgreSQL pool initialized successfully.")
        return _pool
    except Exception as exc:
        logger.warning("Could not connect to PostgreSQL database: %s", exc)
        if not settings.demo_mode:
            raise RuntimeError("Database connection failed and DEMO_MODE is False.") from exc
        return None

async def close_db_pool():
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("PostgreSQL pool closed.")

async def check_db_readiness() -> dict[str, Any]:
    """Check database health status."""
    pool = await get_db_pool()
    if pool is None:
        return {
            "status": "degraded" if settings.demo_mode else "unhealthy",
            "demo_mode": settings.demo_mode,
            "connected": False
        }
    try:
        async with pool.acquire() as conn:
            val = await conn.fetchval("SELECT 1")
            return {
                "status": "healthy",
                "demo_mode": settings.demo_mode,
                "connected": val == 1
            }
    except Exception:
        return {
            "status": "unhealthy",
            "demo_mode": settings.demo_mode,
            "connected": False,
        }

async def execute_query(query: str, *args) -> Any:
    """Execute a parameterized query safely outside long transactions."""
    pool = await get_db_pool()
    if pool is None:
        return None
    async with pool.acquire() as conn:
        return await conn.fetch(query, *args)

async def execute_val(query: str, *args) -> Any:
    """Fetch a single value parameterised query safely."""
    pool = await get_db_pool()
    if pool is None:
        return None
    async with pool.acquire() as conn:
        return await conn.fetchval(query, *args)
