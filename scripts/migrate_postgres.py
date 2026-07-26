"""Apply ordered PostgreSQL migrations once and verify their checksums."""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import os
from pathlib import Path

import asyncpg


MIGRATIONS = Path(__file__).resolve().parent / "migrations"


def database_url(explicit_url: str | None = None) -> str:
    url = explicit_url or os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("SUPABASE_DATABASE_URL is required")
    return url.replace("postgres://", "postgresql://", 1) if url.startswith("postgres://") else url


async def apply_migrations(explicit_url: str | None = None) -> list[str]:
    connection = await asyncpg.connect(database_url(explicit_url))
    applied_now: list[str] = []
    try:
        await connection.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                checksum CHAR(64) NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        await connection.execute("SELECT pg_advisory_lock(hashtext('po-lice-migrations'))")
        for path in sorted(MIGRATIONS.glob("*.sql")):
            sql = path.read_text(encoding="utf-8")
            checksum = hashlib.sha256(sql.encode("utf-8")).hexdigest()
            existing = await connection.fetchrow(
                "SELECT checksum FROM schema_migrations WHERE version = $1",
                path.stem,
            )
            if existing:
                if existing["checksum"] != checksum:
                    raise RuntimeError(f"Applied migration changed: {path.name}")
                continue
            async with connection.transaction():
                await connection.execute(sql)
                await connection.execute(
                    "INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)",
                    path.stem,
                    checksum,
                )
            applied_now.append(path.name)
    finally:
        try:
            await connection.execute("SELECT pg_advisory_unlock(hashtext('po-lice-migrations'))")
        finally:
            await connection.close()
    return applied_now


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database-url")
    args = parser.parse_args()
    applied = await apply_migrations(args.database_url)
    print("Database is current." if not applied else f"Applied: {', '.join(applied)}")


if __name__ == "__main__":
    asyncio.run(main())
