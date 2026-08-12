"""Unit tests for Supabase Auth & RLS Service Layer."""

import unittest
from app.auth import SupabaseAuthService


class TestSupabaseAuthService(unittest.TestCase):
    def test_auth_enabled_check(self):
        """Verify auth enabled check returns boolean without throwing exceptions."""
        is_ready = SupabaseAuthService.is_auth_enabled()
        self.assertIsInstance(is_ready, bool)

    def test_demo_mode_token_verification_fallback(self):
        """When SUPABASE_JWT_SECRET is unconfigured, token verification must return demo user payload."""
        payload = SupabaseAuthService.verify_token("demo.jwt.token")
        self.assertEqual(payload["email"], "officer-1@police.gov")
        self.assertEqual(payload["role"], "authenticated")


if __name__ == "__main__":
    unittest.main()
