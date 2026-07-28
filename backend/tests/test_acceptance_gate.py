import unittest
from unittest.mock import patch

from scripts.acceptance_gate import http_delete, http_get


class _Response:
    def __init__(self, status: int, body: bytes = b"{}"):
        self.status = status
        self._body = body
        self.headers = {}

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self) -> bytes:
        return self._body


class AcceptanceGateHttpTests(unittest.TestCase):
    @patch("scripts.acceptance_gate.urllib.request.urlopen")
    def test_get_allows_free_tier_cold_start(self, urlopen):
        urlopen.return_value = _Response(200)

        http_get("https://example.test/readiness")

        self.assertEqual(urlopen.call_args.kwargs["timeout"], 45)

    @patch("scripts.acceptance_gate.urllib.request.urlopen")
    def test_delete_uses_delete_method_and_accepts_no_content(self, urlopen):
        urlopen.return_value = _Response(204, b"")

        status = http_delete("https://example.test/bids/demo")

        request = urlopen.call_args.args[0]
        self.assertEqual(request.get_method(), "DELETE")
        self.assertEqual(status, 204)


if __name__ == "__main__":
    unittest.main()
