"""Assertion-based migration and seed verification for a disposable PostgreSQL DB."""

from __future__ import annotations

import asyncio
import os

import asyncpg

from migrate_postgres import apply_migrations, database_url
from seed_supabase import seed_database


async def verify() -> None:
    url = database_url(os.getenv("TEST_DATABASE_URL"))
    first_apply = await apply_migrations(url)
    second_apply = await apply_migrations(url)
    assert first_apply, "An empty database must apply migrations"
    assert second_apply == [], "A second migration run must be a no-op"

    await seed_database(url)
    await seed_database(url)

    connection = await asyncpg.connect(url)
    try:
        counts = {
            table: await connection.fetchval(f"SELECT COUNT(*) FROM {table}")
            for table in ("projects", "site_constraints", "bids", "vendor_docs", "audit_logs")
        }
        assert counts == {
            "projects": 1,
            "site_constraints": 1,
            "bids": 3,
            "vendor_docs": 2,
            "audit_logs": 1,
        }
        assert await connection.fetchval("SELECT COUNT(*) FROM schema_migrations") == 2
        for table in ("projects", "site_constraints", "bids", "vendor_docs", "audit_logs"):
            assert await connection.fetchval(
                f"SELECT bool_and(is_synthetic) FROM {table}"
            ), f"{table} contains an unlabeled demo row"

        project_columns = await connection.fetch(
            """
            SELECT table_name, is_nullable
            FROM information_schema.columns
            WHERE column_name = 'project_id'
              AND table_name = ANY($1::text[])
            """,
            ["extracted_facts", "patrol_results", "rfis"],
        )
        assert {row["table_name"] for row in project_columns} == {
            "extracted_facts",
            "patrol_results",
            "rfis",
        }
        assert all(row["is_nullable"] == "NO" for row in project_columns)

        constraints = {
            row["conname"]
            for row in await connection.fetch(
                "SELECT conname FROM pg_constraint WHERE conname LIKE 'fk_%_project_%'"
            )
        }
        assert {
            "fk_extracted_facts_project_bid",
            "fk_patrol_results_project_bid",
            "fk_patrol_results_project_constraint",
            "fk_rfis_project_bid",
        } <= constraints

        vector_type = await connection.fetchval(
            """
            SELECT format_type(attribute.atttypid, attribute.atttypmod)
            FROM pg_attribute AS attribute
            JOIN pg_class AS relation ON relation.oid = attribute.attrelid
            WHERE relation.relname = 'vendor_docs'
              AND attribute.attname = 'embedding'
            """
        )
        assert vector_type == "vector(1536)"

        indexes = {
            row["indexname"]
            for row in await connection.fetch(
                "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'"
            )
        }
        assert {
            "unq_bids_project_idempotency",
            "unq_audit_project_idempotency",
            "unq_patrol_assessment_version",
            "unq_patrol_latest",
        } <= indexes

        for operation in ("UPDATE audit_logs SET action = 'ALTERED'", "DELETE FROM audit_logs"):
            try:
                await connection.execute(operation)
            except asyncpg.PostgresError as exc:
                assert exc.sqlstate == "55000"
            else:
                raise AssertionError("audit_logs mutation was not rejected")
    finally:
        await connection.close()

    print("PostgreSQL migrations, idempotent seed, and append-only audit checks passed.")


if __name__ == "__main__":
    asyncio.run(verify())
