"""Unit tests for MCP Planner™ API service connector."""

import unittest
from app.services.mcp_planner import MCPPlannerService


class TestMCPPlannerService(unittest.TestCase):
    def test_mcp_configured_check(self):
        """Verify MCP Planner config check returns boolean value without error."""
        ready = MCPPlannerService.is_mcp_configured()
        self.assertIsInstance(ready, bool)

    def test_analyze_schedule_exposure_fallback(self):
        """When unconfigured, analyze_schedule_exposure returns deterministic fallback."""
        analysis = MCPPlannerService.analyze_schedule_exposure(promised_delivery_weeks=14, maximum_delivery_weeks=12)
        self.assertEqual(analysis["delay_days"], 14)
        self.assertIn("exposure_source", analysis)
        self.assertIsNotNone(analysis["cpm_critical_path_impact"])


if __name__ == "__main__":
    unittest.main()
