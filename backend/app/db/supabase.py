"""
Async PostgreSQL Service Layer for Supabase
Provides connection pooling, health readiness checks, and parameterized query execution.
"""

import logging
from typing import Any

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

try:
    import asyncpg
except ModuleNotFoundError:  # SQLite demo mode does not require the PostgreSQL driver.
    asyncpg = None

logger = logging.getLogger(__name__)

class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", extra="ignore", populate_by_name=True)

    supabase_database_url: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_DATABASE_URL", "DATABASE_URL"),
    )
    demo_mode: bool = True
    db_pool_min_size: int = Field(default=2, ge=1, le=20)
    db_pool_max_size: int = Field(default=10, ge=1, le=50)
    db_request_timeout_seconds: float = Field(default=10.0, gt=0, le=60)

    @model_validator(mode="after")
    def validate_database_mode(self) -> "DatabaseSettings":
        if self.db_pool_min_size > self.db_pool_max_size:
            raise ValueError("DB_POOL_MIN_SIZE cannot exceed DB_POOL_MAX_SIZE")
        if self.supabase_database_url and not self.supabase_database_url.startswith(
            ("postgresql://", "postgres://")
        ):
            raise ValueError("SUPABASE_DATABASE_URL must use a PostgreSQL URL")
        return self

settings = DatabaseSettings()

_pool: Any = None

async def get_db_pool() -> Any:
    global _pool
    if _pool is not None:
        return _pool

    if asyncpg is None:
        if not settings.demo_mode:
            raise RuntimeError("asyncpg is required when DEMO_MODE is false")
        return None

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
    try:
        pool = await get_db_pool()
    except RuntimeError:
        return {
            "status": "unhealthy",
            "demo_mode": settings.demo_mode,
            "connected": False,
        }
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
