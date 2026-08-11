"""PostgreSQL & pgvector Hybrid Database Service Layer for PO-LICE.

Provides HNSW vector similarity search, document chunk embeddings storage, schema migrations, and SQLite dual-sync.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional

from app.db.supabase import execute_query, execute_val, get_db_pool

logger = logging.getLogger(__name__)

# Default vector dimension for OpenAI / Nomic embeddings
VECTOR_DIMENSION: int = 1536


class PostgresVectorService:
    """PostgreSQL & pgvector Service Layer for HNSW vector similarity search and dual-db synchronization."""

    @staticmethod
    def is_postgres_configured() -> bool:
        """Check if PostgreSQL database URL is configured in environment."""
        url = os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL") or ""
        return url.startswith(("postgresql://", "postgres://"))

    @classmethod
    async def initialize_schema_and_vector_extension(cls) -> bool:
        """Initialize pgvector extension and create HNSW vector search tables."""
        if not cls.is_postgres_configured():
            logger.info("PostgreSQL is not configured; using local SQLite WAL storage mode.")
            return False

        ddl = f"""
        CREATE EXTENSION IF NOT EXISTS vector;
        
        CREATE TABLE IF NOT EXISTS document_embeddings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            bid_id VARCHAR(128) NOT NULL,
            chunk_index INT NOT NULL,
            chunk_text TEXT NOT NULL,
            embedding vector({VECTOR_DIMENSION}),
            metadata JSONB DEFAULT '{{}}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_document_embeddings_hnsw 
        ON document_embeddings USING hnsw (embedding vector_cosine_ops);
        """
        try:
            pool = await get_db_pool()
            if pool is None:
                return False
            async with pool.acquire() as conn:
                await conn.execute(ddl)
            logger.info("✓ PostgreSQL pgvector extension and HNSW vector index initialized.")
            return True
        except Exception as err:
            logger.warning("Could not initialize pgvector extension: %s", err)
            return False

    @classmethod
    async def insert_chunk_embedding(
        cls,
        bid_id: str,
        chunk_index: int,
        chunk_text: str,
        embedding: List[float],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Insert a document chunk vector embedding into PostgreSQL."""
        if not cls.is_postgres_configured() or len(embedding) != VECTOR_DIMENSION:
            return False

        meta_json = json.dumps(metadata or {})
        vec_str = f"[{','.join(str(x) for x in embedding)}]"
        query = """
        INSERT INTO document_embeddings (bid_id, chunk_index, chunk_text, embedding, metadata)
        VALUES ($1, $2, $3, $4::vector, $5::jsonb);
        """
        try:
            await execute_query(query, bid_id, chunk_index, chunk_text, vec_str, meta_json)
            return True
        except Exception as err:
            logger.error("Failed to insert vector embedding into PostgreSQL: %s", err)
            return False

    @classmethod
    async def similarity_search(
        cls,
        query_embedding: List[float],
        top_k: int = 5,
        match_threshold: float = 0.70,
    ) -> List[Dict[str, Any]]:
        """Perform HNSW cosine vector similarity search against document embeddings."""
        if not cls.is_postgres_configured() or len(query_embedding) != VECTOR_DIMENSION:
            return []

        vec_str = f"[{','.join(str(x) for x in query_embedding)}]"
        query = """
        SELECT bid_id, chunk_index, chunk_text, metadata,
               1 - (embedding <=> $1::vector) AS similarity
        FROM document_embeddings
        WHERE 1 - (embedding <=> $1::vector) >= $2
        ORDER BY embedding <=> $1::vector ASC
        LIMIT $3;
        """
        try:
            records = await execute_query(query, vec_str, match_threshold, top_k)
            if not records:
                return []
            return [
                {
                    "bid_id": r["bid_id"],
                    "chunk_index": r["chunk_index"],
                    "chunk_text": r["chunk_text"],
                    "metadata": json.loads(r["metadata"]) if isinstance(r["metadata"], str) else r["metadata"],
                    "similarity": float(r["similarity"]),
                }
                for r in records
            ]
        except Exception as err:
            logger.error("pgvector similarity search failed: %s", err)
            return []
