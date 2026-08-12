"""External Jarvis Handoff Service for webhook dispatch and external agent delegation."""

from __future__ import annotations

import hmac
import hashlib
import json
import logging
import os
import time
from typing import Any, Dict, Optional
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

logger = logging.getLogger(__name__)


class JarvisHandoffService:
    """External Jarvis Handoff Service delivering HMAC-signed webhook payloads to external AI agents."""

    @staticmethod
    def is_jarvis_available() -> bool:
        """Check if JARVIS_HANDOFF_URL is configured in environment."""
        url = os.getenv("JARVIS_HANDOFF_URL", "").strip()
        return bool(url.startswith(("http://", "https://")))

    @classmethod
    def generate_hmac_signature(cls, payload_json: str, secret: str) -> str:
        """Generate HMAC-SHA256 signature for webhook payload integrity."""
        return hmac.new(secret.encode("utf-8"), payload_json.encode("utf-8"), hashlib.sha256).hexdigest()

    @classmethod
    def dispatch_handoff(
        cls,
        bid_id: str,
        vendor_name: str,
        event_type: str,
        rfi_text: Optional[str] = None,
        protected_facts: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Dispatch a structured handoff payload to the external Jarvis agent."""
        url = os.getenv("JARVIS_HANDOFF_URL", "").strip()
        secret = os.getenv("JARVIS_SECRET", "po-lice-default-secret")
        token = os.getenv("JARVIS_BEARER_TOKEN", "")

        payload_data = {
            "source_system": "PO-LICE",
            "event_type": event_type,
            "bid_id": bid_id,
            "vendor_name": vendor_name,
            "rfi_text": rfi_text,
            "protected_facts": protected_facts or {},
            "timestamp": int(time.time()),
        }

        payload_json = json.dumps(payload_data, sort_keys=True)
        signature = cls.generate_hmac_signature(payload_json, secret)

        result_info = {
            "dispatch_id": f"JARVIS-{bid_id}-{int(time.time())}",
            "bid_id": bid_id,
            "event_type": event_type,
            "signature": signature,
            "status": "RECORDED_DEMO",
            "http_code": None,
        }

        if not cls.is_jarvis_available():
            logger.info("Jarvis Handoff recorded in Demo Mode for bid %s", bid_id)
            return result_info

        # Real Webhook Dispatch
        try:
            req = Request(
                url,
                data=payload_json.encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "X-PO-LICE-Signature": signature,
                    **({"Authorization": f"Bearer {token}"} if token else {}),
                },
                method="POST",
            )
            with urlopen(req, timeout=5) as response:
                result_info["status"] = "DISPATCHED"
                result_info["http_code"] = response.status
                logger.info("Jarvis Handoff webhook successfully delivered to %s (HTTP %d)", url, response.status)
        except (URLError, HTTPError, Exception) as err:
            result_info["status"] = "FAILED"
            result_info["error"] = str(err)
            logger.warning("Jarvis Handoff webhook delivery failed to %s: %s", url, err)

        return result_info
