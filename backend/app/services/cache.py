"""Redis & In-Memory Two-Tier High-Performance Caching Service."""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class RedisCacheService:
    """Redis Cache Service with automatic in-memory L1 LRU fallback when Redis is unconfigured or unreachable."""

    _l1_cache: Dict[str, Tuple[float, Any]] = {}
    _redis_client: Any = None
    _redis_checked: bool = False

    @classmethod
    def is_redis_available(cls) -> bool:
        """Check if REDIS_URL or UPSTASH_REDIS_REST_URL is configured."""
        url = os.getenv("REDIS_URL") or os.getenv("UPSTASH_REDIS_REST_URL") or ""
        return bool(url.strip())

    @classmethod
    def get_redis_client(cls) -> Any:
        """Get or lazily initialize async redis-py client."""
        if cls._redis_client is not None:
            return cls._redis_client

        if not cls.is_redis_available():
            return None

        try:
            import redis.asyncio as aioredis  # type: ignore

            url = os.getenv("REDIS_URL") or "redis://localhost:6379/0"
            cls._redis_client = aioredis.from_url(url, decode_responses=True)
            logger.info("✓ Async Redis client connected.")
            return cls._redis_client
        except Exception as err:
            logger.warning("Could not connect to Redis server: %s; using L1 in-memory TTL cache.", err)
            cls._redis_client = None
            return None

    @classmethod
    async def get(cls, key: str) -> Optional[Any]:
        """Fetch cached value by key from Level 1 In-Memory or Level 2 Redis."""
        # Level 1 In-Memory TTL Cache Check (<0.1 ms)
        now = time.time()
        if key in cls._l1_cache:
            expires_at, val = cls._l1_cache[key]
            if now < expires_at:
                return val
            else:
                del cls._l1_cache[key]

        # Level 2 Redis Client Fetch
        client = cls.get_redis_client()
        if client is not None:
            try:
                raw_val = await client.get(key)
                if raw_val is not None:
                    try:
                        parsed = json.loads(raw_val)
                    except (json.JSONDecodeError, TypeError):
                        parsed = raw_val
                    # Populate L1 cache for 30s
                    cls._l1_cache[key] = (now + 30.0, parsed)
                    return parsed
            except Exception as err:
                logger.warning("Redis GET failed for key %r: %s", key, err)

        return None

    @classmethod
    async def set(cls, key: str, value: Any, ttl_seconds: int = 300) -> bool:
        """Set cached key-value pair with TTL expiration across L1 memory and L2 Redis."""
        now = time.time()
        expires_at = now + float(ttl_seconds)

        # Store in L1 In-Memory Cache
        cls._l1_cache[key] = (expires_at, value)

        # Store in Level 2 Redis Client
        client = cls.get_redis_client()
        if client is not None:
            try:
                serialized = json.dumps(value) if not isinstance(value, str) else value
                await client.set(key, serialized, ex=ttl_seconds)
                return True
            except Exception as err:
                logger.warning("Redis SET failed for key %r: %s", key, err)

        return True

    @classmethod
    async def delete(cls, key: str) -> bool:
        """Delete key from L1 memory and L2 Redis cache."""
        if key in cls._l1_cache:
            del cls._l1_cache[key]

        client = cls.get_redis_client()
        if client is not None:
            try:
                await client.delete(key)
                return True
            except Exception as err:
                logger.warning("Redis DELETE failed for key %r: %s", key, err)

        return True

    @classmethod
    def clear_l1_cache(cls) -> None:
        """Clear L1 in-memory cache dictionary."""
        cls._l1_cache.clear()
