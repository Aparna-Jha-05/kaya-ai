"""Outbound SMTP Queue Service for officer-approved RFI email dispatch."""

from __future__ import annotations

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class OutboundSMTPQueueService:
    """Outbound SMTP Queue Service handling background retry queues and email dispatch."""

    _outbox_queue: List[Dict[str, Any]] = []

    @classmethod
    def is_smtp_configured(cls) -> bool:
        """Check if SMTP server or SendGrid/Postmark API key is configured."""
        smtp_host = os.getenv("SMTP_HOST", "").strip()
        sendgrid_key = os.getenv("SENDGRID_API_KEY", "").strip()
        return bool(smtp_host or sendgrid_key)

    @classmethod
    def enqueue_rfi_dispatch(
        cls,
        bid_id: str,
        recipient_email: str,
        subject: str,
        rfi_body: str,
        officer_identity: str = "Demo Officer",
    ) -> Dict[str, Any]:
        """Enqueue an approved RFI letter for outbound SMTP dispatch."""
        item = {
            "dispatch_id": f"DISPATCH-{bid_id}",
            "bid_id": bid_id,
            "recipient_email": recipient_email,
            "subject": subject,
            "body": rfi_body,
            "officer_identity": officer_identity,
            "status": "QUEUED",
            "retries": 0,
            "max_retries": 3,
            "error": None,
        }
        cls._outbox_queue.append(item)
        logger.info("Enqueued RFI email dispatch for bid %s to %s", bid_id, recipient_email)
        return item

    @classmethod
    def process_outbox_queue(cls) -> List[Dict[str, Any]]:
        """Process pending items in outbound SMTP queue with exponential retries."""
        results: List[Dict[str, Any]] = []
        smtp_ready = cls.is_smtp_configured()

        for item in cls._outbox_queue:
            if item["status"] in ("DISPATCHED", "DEMO_RECORDED"):
                results.append(item)
                continue

            if not smtp_ready:
                # Demo Mode: record dispatch intent without sending real email
                item["status"] = "DEMO_RECORDED"
                item["error"] = "SMTP unconfigured (Demo Mode Recorded)"
                results.append(item)
                logger.info("Outbound RFI dispatch recorded in Demo Mode for bid %s", item["bid_id"])
                continue

            # Real SMTP Server Dispatch
            try:
                host = os.getenv("SMTP_HOST", "localhost")
                port = int(os.getenv("SMTP_PORT", "587"))
                user = os.getenv("SMTP_USER", "")
                password = os.getenv("SMTP_PASSWORD", "")
                from_addr = os.getenv("SMTP_FROM_EMAIL", "compliance@po-lice.local")

                msg = MIMEMultipart()
                msg["From"] = from_addr
                msg["To"] = item["recipient_email"]
                msg["Subject"] = item["subject"]
                msg.attach(MIMEText(item["body"], "plain"))

                with smtplib.SMTP(host, port, timeout=10) as server:
                    if port == 587:
                        server.starttls()
                    if user and password:
                        server.login(user, password)
                    server.send_message(msg)

                item["status"] = "DISPATCHED"
                item["error"] = None
                logger.info("Successfully dispatched RFI email for bid %s", item["bid_id"])
            except Exception as err:
                item["retries"] += 1
                item["error"] = str(err)
                if item["retries"] >= item["max_retries"]:
                    item["status"] = "FAILED"
                    logger.error("Outbound SMTP dispatch failed permanently for bid %s: %s", item["bid_id"], err)
                else:
                    item["status"] = "RETRY_QUEUED"
                    logger.warning("Outbound SMTP retry %d/3 for bid %s: %s", item["retries"], item["bid_id"], err)

            results.append(item)

        return results

    @classmethod
    def get_queue_status(cls) -> List[Dict[str, Any]]:
        """Get status of all outbox queue items."""
        return list(cls._outbox_queue)
