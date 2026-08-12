"""Unit tests for PostgreSQL & pgvector Service Layer."""

import unittest
from app.db.postgres_vector import PostgresVectorService, VECTOR_DIMENSION


class TestPostgresVectorService(unittest.TestCase):
    def test_postgres_configured_check(self):
        """Verify postgres configured check returns boolean without throwing exceptions."""
        is_conf = PostgresVectorService.is_postgres_configured()
        self.assertIsInstance(is_conf, bool)

    def test_vector_dimension_constant(self):
        """Verify default vector dimension is 1536."""
        self.assertEqual(VECTOR_DIMENSION, 1536)


if __name__ == "__main__":
    unittest.main()
