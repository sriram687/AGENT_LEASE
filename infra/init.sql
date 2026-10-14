-- Enable pgvector extension for semantic deduplication
CREATE EXTENSION IF NOT EXISTS vector;

-- Confirm
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
