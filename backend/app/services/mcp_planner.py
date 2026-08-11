"""MCP Planner™ API connector for construction CPM schedule float analysis and delay exposure feedback loops."""

from __future__ import annotations

import logging
import os
from typing import Any, Dict

import requests

logger = logging.getLogger(__name__)


class MCPPlannerService:
    """Service providing CPM construction schedule float analysis via MCP Planner™ API."""

    @staticmethod
    def is_mcp_configured() -> bool:
        """Return True if MCP Planner™ URL and API Key are configured."""
        url = os.getenv("MCP_PLANNER_URL", "").strip()
        key = os.getenv("MCP_PLANNER_API_KEY", "").strip()
        return bool(url and key)

    @classmethod
    def analyze_schedule_exposure(
        cls, promised_delivery_weeks: int | None, maximum_delivery_weeks: int = 12
    ) -> Dict[str, Any]:
        """Analyze schedule delay exposure using MCP Planner™ construction CPM schedule graph.
        
        Falls back to linear float slip calculation if unconfigured or unreachable.
        """
        if promised_delivery_weeks is None:
            return {
                "delay_days": None,
                "exposure_source": "NO_DELIVERY_COMMITMENT_EXTRACTED",
                "cpm_critical_path_impact": None,
            }

        delay_days = max(0, (promised_delivery_weeks - maximum_delivery_weeks) * 7)

        if not cls.is_mcp_configured():
            logger.info("MCP Planner™ API unconfigured; using deterministic float slip math.")
            return {
                "delay_days": delay_days,
                "promised_weeks": promised_delivery_weeks,
                "max_weeks": maximum_delivery_weeks,
                "exposure_source": "LOCAL_DETERMINISTIC_PRNG_SIMULATION",
                "cpm_critical_path_impact": "LOW" if delay_days == 0 else "HIGH" if delay_days > 14 else "MODERATE",
            }

        url = os.getenv("MCP_PLANNER_URL", "").strip().rstrip("/")
        api_key = os.getenv("MCP_PLANNER_API_KEY", "").strip()

        try:
            endpoint = f"{url}/api/v1/schedule/analyze"
            headers = {
                "X-MCP-API-Key": api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
            payload = {
                "promised_delivery_weeks": promised_delivery_weeks,
                "maximum_delivery_weeks": maximum_delivery_weeks,
                "delay_days": delay_days,
            }
            response = requests.post(endpoint, json=payload, headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                logger.info("Successfully analyzed schedule exposure with MCP Planner™ API.")
                return {
                    "delay_days": data.get("delay_days", delay_days),
                    "promised_weeks": promised_delivery_weeks,
                    "max_weeks": maximum_delivery_weeks,
                    "exposure_source": "MCP_PLANNER_CPM_SCHEDULE_GRAPH",
                    "cpm_critical_path_impact": data.get("critical_path_impact", "MODERATE"),
                    "monte_carlo_p95_delay_days": data.get("p95_delay_days"),
                }
            logger.warning("MCP Planner™ API returned status %d", response.status_code)
        except Exception as err:
            logger.error("Failed to analyze schedule exposure with MCP Planner™ API: %s", err)

        return {
            "delay_days": delay_days,
            "promised_weeks": promised_delivery_weeks,
            "max_weeks": maximum_delivery_weeks,
            "exposure_source": "LOCAL_DETERMINISTIC_PRNG_SIMULATION_FALLBACK",
            "cpm_critical_path_impact": "LOW" if delay_days == 0 else "HIGH" if delay_days > 14 else "MODERATE",
        }
