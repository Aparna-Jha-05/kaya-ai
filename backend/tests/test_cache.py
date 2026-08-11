"""Unit tests for Redis & In-Memory Caching Service."""

import asyncio
import unittest
from app.services.cache import RedisCacheService


class TestRedisCacheService(unittest.TestCase):
    def setUp(self):
        RedisCacheService.clear_l1_cache()

    def test_redis_availability_check(self):
        """Verify redis availability check returns boolean without throwing exceptions."""
        is_ready = RedisCacheService.is_redis_available()
        self.assertIsInstance(is_ready, bool)

    def test_l1_in_memory_cache_set_and_get(self):
        """Async set and get must work synchronously in L1 in-memory cache mode."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(RedisCacheService.set("test_key", {"status": "PASS"}, ttl_seconds=60))
            val = loop.run_until_complete(RedisCacheService.get("test_key"))
            self.assertEqual(val, {"status": "PASS"})

            loop.run_until_complete(RedisCacheService.delete("test_key"))
            val_after_del = loop.run_until_complete(RedisCacheService.get("test_key"))
            self.assertIsNone(val_after_del)
        finally:
            loop.close()


if __name__ == "__main__":
    unittest.main()
