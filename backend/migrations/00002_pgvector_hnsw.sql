-- Migration 00002: pgvector Extension and HNSW Cosine Index
-- Enables vector similarity search over document chunk embeddings

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id VARCHAR(128) NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW Vector Index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_document_embeddings_hnsw
ON document_embeddings USING hnsw (embedding vector_cosine_ops);
