"""Unit tests for Outbound SMTP Queue Service."""

import unittest
from app.services.smtp_queue import OutboundSMTPQueueService


class TestOutboundSMTPQueueService(unittest.TestCase):
    def test_smtp_configured_check(self):
        """Verify SMTP configured check returns boolean without throwing exceptions."""
        is_ready = OutboundSMTPQueueService.is_smtp_configured()
        self.assertIsInstance(is_ready, bool)

    def test_enqueue_and_process_rfi_dispatch_demo_mode(self):
        """Enqueuing and processing RFI dispatch in demo mode must record dispatch intent without throwing error."""
        item = OutboundSMTPQueueService.enqueue_rfi_dispatch(
            bid_id="BID-TEST-001",
            recipient_email="compliance@vendor.com",
            subject="OFFICIAL RFI NOTICE: BID-TEST-001",
            rfi_body="Please clarify OSHA certification and power draw.",
            officer_identity="TEST_OFFICER",
        )

        self.assertEqual(item["status"], "QUEUED")
        processed = OutboundSMTPQueueService.process_outbox_queue()
        self.assertTrue(len(processed) >= 1)
        dispatch_item = next((p for p in processed if p["bid_id"] == "BID-TEST-001"), None)
        self.assertIsNotNone(dispatch_item)
        self.assertIn(dispatch_item["status"], ("DISPATCHED", "DEMO_RECORDED"))


if __name__ == "__main__":
    unittest.main()
