"""
Database CRUD operations for DocTalk Lambda document processor.

Handles all database interactions including document status updates
and chunk storage.
"""
import psycopg2
from psycopg2.extras import execute_batch, Json
from typing import List, Optional, Dict, Any

from database.client import get_db_connection
from utils.logger import get_logger
from utils.exceptions import DatabaseError

logger = get_logger(__name__)


def get_document_by_s3_key(s3_key: str) -> Optional[Dict[str, Any]]:
    """
    Query document by S3 key to get document metadata.

    Args:
        s3_key: S3 object key (e.g., 'uploads/user123/timestamp-file.pdf')

    Returns:
        Dictionary with document data or None if not found

    Raises:
        DatabaseError: If query fails
    """
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, user_id, filename, file_type, file_size, status
                FROM documents
                WHERE s3_key = %s
            """, (s3_key,))

            row = cur.fetchone()
            if row:
                return {
                    'id': row[0],
                    'user_id': row[1],
                    'filename': row[2],
                    'file_type': row[3],
                    'file_size': row[4],
                    'status': row[5]
                }

            logger.warning(f"Document not found for s3_key: {s3_key}")
            return None

    except psycopg2.Error as e:
        error_msg = f"Failed to query document by s3_key: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise DatabaseError(error_msg)


def update_document_status(
    document_id: str,
    status: str,
    error_message: Optional[str] = None,
    page_count: Optional[int] = None,
    chunk_count: Optional[int] = None
) -> bool:
    """
    Update document status and metadata.

    Args:
        document_id: Document UUID
        status: New status ('pending', 'processing', 'ready', 'failed')
        error_message: Error message if status is 'failed'
        page_count: Number of pages processed
        chunk_count: Number of chunks created

    Returns:
        True if update successful

    Raises:
        DatabaseError: If update fails
    """
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE documents
                SET status = %s,
                    error_message = %s,
                    page_count = %s,
                    chunk_count = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (status, error_message, page_count, chunk_count, document_id))

            rows_updated = cur.rowcount

        conn.commit()

        if rows_updated > 0:
            logger.info(
                f"Updated document status to '{status}'",
                extra={
                    'document_id': document_id,
                    'status': status,
                    'page_count': page_count,
                    'chunk_count': chunk_count
                }
            )
            return True
        else:
            logger.warning(f"No document found with id: {document_id}")
            return False

    except psycopg2.Error as e:
        conn.rollback()
        error_msg = f"Failed to update document status: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise DatabaseError(error_msg)


def bulk_insert_chunks(document_id: str, chunks: List[Dict[str, Any]]) -> int:
    """
    Bulk insert document chunks with embeddings.

    Uses execute_batch for high performance bulk insertion.

    Args:
        document_id: Document UUID
        chunks: List of chunk dictionaries with keys:
                - content: Text content
                - embedding: Vector embedding (list of floats)
                - chunk_index: Index of chunk in document
                - page_number: Page number
                - metadata: Additional metadata (dict)

    Returns:
        Number of chunks inserted

    Raises:
        DatabaseError: If insertion fails
    """
    if not chunks:
        logger.warning("No chunks to insert")
        return 0

    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            # Prepare data tuples
            data = []
            for chunk in chunks:
                # Convert embedding list to PostgreSQL array format
                embedding = chunk.get('embedding')
                if embedding:
                    embedding_str = '[' + ','.join(map(str, embedding)) + ']'
                else:
                    embedding_str = None

                data.append((
                    document_id,
                    chunk['content'],
                    embedding_str,
                    chunk['chunk_index'],
                    chunk['page_number'],
                    Json(chunk.get('metadata', {}))
                ))

            # Bulk insert using execute_batch for performance
            execute_batch(cur, """
                INSERT INTO document_chunks
                (document_id, content, embedding, chunk_index, page_number, metadata)
                VALUES (%s, %s, %s::vector, %s, %s, %s)
            """, data, page_size=100)

        conn.commit()

        logger.info(
            f"Inserted {len(chunks)} chunks",
            extra={'document_id': document_id, 'chunk_count': len(chunks)}
        )

        return len(chunks)

    except psycopg2.Error as e:
        conn.rollback()
        error_msg = f"Failed to insert chunks: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise DatabaseError(error_msg)


def delete_document_chunks(document_id: str) -> int:
    """
    Delete all chunks for a document.

    This is useful for reprocessing documents.

    Args:
        document_id: Document UUID

    Returns:
        Number of chunks deleted

    Raises:
        DatabaseError: If deletion fails
    """
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM document_chunks
                WHERE document_id = %s
            """, (document_id,))

            rows_deleted = cur.rowcount

        conn.commit()

        logger.info(
            f"Deleted {rows_deleted} chunks",
            extra={'document_id': document_id}
        )

        return rows_deleted

    except psycopg2.Error as e:
        conn.rollback()
        error_msg = f"Failed to delete chunks: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise DatabaseError(error_msg)


def get_document_chunk_count(document_id: str) -> int:
    """
    Get count of chunks for a document.

    Args:
        document_id: Document UUID

    Returns:
        Number of chunks

    Raises:
        DatabaseError: If query fails
    """
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*)
                FROM document_chunks
                WHERE document_id = %s
            """, (document_id,))

            row = cur.fetchone()
            return row[0] if row else 0

    except psycopg2.Error as e:
        error_msg = f"Failed to get chunk count: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise DatabaseError(error_msg)
