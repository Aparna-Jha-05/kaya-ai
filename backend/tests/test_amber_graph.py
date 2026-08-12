"""Unit tests for Amber Project Graph API service connector."""

import unittest
from app.services.amber_graph import AmberProjectGraphService


class TestAmberProjectGraphService(unittest.TestCase):
    def test_amber_configured_check(self):
        """Verify Amber config check returns boolean value without error."""
        ready = AmberProjectGraphService.is_amber_configured()
        self.assertIsInstance(ready, bool)

    def test_fetch_live_constraints_unconfigured_fallback(self):
        """When unconfigured, fetch_live_constraints returns None without raising an exception."""
        constraints = AmberProjectGraphService.fetch_live_constraints("PRJ-AMBER-01")
        # In demo mode without AMBER_API_KEY, should return None cleanly
        if not AmberProjectGraphService.is_amber_configured():
            self.assertIsNone(constraints)


if __name__ == "__main__":
    unittest.main()
