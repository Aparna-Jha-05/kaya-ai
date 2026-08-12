"""Amber Project Graph API connector for live BIM structural and electrical constraint syncing."""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

import requests

logger = logging.getLogger(__name__)


class AmberProjectGraphService:
    """Service providing live sync with Amber Project Graph BIM constraints."""

    @staticmethod
    def is_amber_configured() -> bool:
        """Return True if Amber Project Graph URL and API Key are configured."""
        url = os.getenv("AMBER_PROJECT_GRAPH_URL", "").strip()
        key = os.getenv("AMBER_API_KEY", "").strip()
        return bool(url and key)

    @classmethod
    def fetch_live_constraints(cls, project_id: str = "PRJ-AMBER-01") -> Optional[Dict[str, Any]]:
        """Fetch live BIM structural and electrical constraints from Amber Project Graph.

        Falls back to None if unconfigured or unreachable.
        """
        if not cls.is_amber_configured():
            logger.info("Amber Project Graph unconfigured; using local versioned constraint snapshot.")
            return None

        url = os.getenv("AMBER_PROJECT_GRAPH_URL", "").strip().rstrip("/")
        api_key = os.getenv("AMBER_API_KEY", "").strip()

        try:
            endpoint = f"{url}/api/v1/projects/{project_id}/constraints"
            headers = {
                "X-Amber-API-Key": api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
            response = requests.get(endpoint, headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                logger.info("Successfully synced live constraints from Amber Project Graph for project %s", project_id)
                return {
                    "substation_limit_kw": data.get("max_substation_kw"),
                    "door_limit_m": data.get("max_door_width_m"),
                    "carbon_cap_kgco2e": data.get("max_embodied_carbon_kg"),
                    "water_evap_cap_gpm": data.get("max_water_evap_gpm"),
                    "floor_load_limit_kg_m2": data.get("max_floor_load_kg_m2"),
                    "source": f"Amber Live BIM (v{data.get('version', 1)})",
                }
            logger.warning("Amber Project Graph API returned status %d for project %s", response.status_code, project_id)
        except Exception as err:
            logger.error("Failed to fetch live constraints from Amber Project Graph: %s", err)

        return None
