"""Unit tests for External Jarvis Handoff Service."""

import unittest
from app.services.jarvis_handoff import JarvisHandoffService


class TestJarvisHandoffService(unittest.TestCase):
    def test_jarvis_available_check(self):
        """Verify jarvis availability check returns boolean without throwing exceptions."""
        is_ready = JarvisHandoffService.is_vlm_configured() if hasattr(JarvisHandoffService, 'is_vlm_configured') else JarvisHandoffService.is_jarvis_available()
        self.assertIsInstance(is_ready, bool)

    def test_hmac_signature_generation(self):
        """HMAC-SHA256 signature generation must produce 64-char hex string."""
        sig = JarvisHandoffService.generate_hmac_signature('{"test": true}', "secret_key")
        self.assertEqual(len(sig), 64)

    def test_dispatch_handoff_demo_mode(self):
        """Dispatch handoff in demo mode must return recorded result without error."""
        result = JarvisHandoffService.dispatch_handoff(
            bid_id="BID-JARVIS-001",
            vendor_name="Jarvis Vendor",
            event_type="RFI_APPROVED_DISPATCH",
            rfi_text="Sample RFI text",
            protected_facts={"bid_id": "BID-JARVIS-001"},
        )

        self.assertEqual(result["bid_id"], "BID-JARVIS-001")
        self.assertEqual(result["event_type"], "RFI_APPROVED_DISPATCH")
        self.assertIn(result["status"], ("DISPATCHED", "RECORDED_DEMO"))


if __name__ == "__main__":
    unittest.main()
