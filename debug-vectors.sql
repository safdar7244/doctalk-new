-- Debug script for vector similarity issues

-- 1. Check if chunks exist for the document
SELECT
    d.id,
    d.filename,
    d.status,
    COUNT(dc.id) as chunk_count
FROM documents d
LEFT JOIN document_chunks dc ON dc.document_id = d.id
WHERE d.status = 'ready'
GROUP BY d.id, d.filename, d.status;

-- 2. Check if embeddings are NULL
SELECT
    COUNT(*) as total_chunks,
    COUNT(embedding) as chunks_with_embeddings,
    COUNT(*) - COUNT(embedding) as null_embeddings
FROM document_chunks;

-- 3. Check table schema (see vector dimensions)
\d+ document_chunks;

-- 4. Test similarity with a sample chunk (any score)
SELECT
    id,
    chunk_index,
    LEFT(content, 100) as content_preview,
    1 - (embedding <=> (SELECT embedding FROM document_chunks LIMIT 1)) as similarity
FROM document_chunks
LIMIT 5;

-- 5. Get actual similarity scores for a specific document
-- Replace 'YOUR_DOCUMENT_ID' with actual document ID
SELECT
    id,
    chunk_index,
    LEFT(content, 100) as content_preview
FROM document_chunks
WHERE document_id = 'YOUR_DOCUMENT_ID'
LIMIT 3;
