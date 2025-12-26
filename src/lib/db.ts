import { Pool, PoolClient } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for RDS connections
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export type DocumentStatus = "pending" | "processing" | "ready" | "failed";

export interface Document {
  id: string;
  user_id: string;
  s3_key: string;
  filename: string;
  file_type: string | null;
  file_size: number | null;
  status: DocumentStatus;
  error_message: string | null;
  page_count: number | null;
  chunk_count: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDocumentParams {
  userId: string;
  s3Key: string;
  filename: string;
  fileType: string;
  fileSize: number;
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function createDocument(params: CreateDocumentParams): Promise<Document> {
  const { userId, s3Key, filename, fileType, fileSize } = params;

  const result = await pool.query<Document>(
    `INSERT INTO documents (user_id, s3_key, filename, file_type, file_size, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [userId, s3Key, filename, fileType, fileSize]
  );

  return result.rows[0];
}

export async function getDocumentById(id: string, userId: string): Promise<Document | null> {
  const result = await pool.query<Document>(
    `SELECT * FROM documents WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  return result.rows[0] || null;
}

export async function getDocumentsByUserId(
  userId: string,
  limit = 50,
  offset = 0
): Promise<Document[]> {
  const result = await pool.query<Document>(
    `SELECT * FROM documents
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return result.rows;
}

export async function updateDocumentStatus(
  id: string,
  status: DocumentStatus,
  errorMessage?: string
): Promise<Document | null> {
  const result = await pool.query<Document>(
    `UPDATE documents
     SET status = $1, error_message = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [status, errorMessage || null, id]
  );

  return result.rows[0] || null;
}

export async function deleteDocument(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM documents WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function getDocumentCount(userId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM documents WHERE user_id = $1`,
    [userId]
  );

  return parseInt(result.rows[0].count, 10);
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown> | null;
  created_at: Date;
  similarity?: number;
}

export interface SearchChunksParams {
  documentId: string;
  embedding: number[];
  limit?: number;
  similarityThreshold?: number;
}

export async function searchSimilarChunks(
  params: SearchChunksParams
): Promise<DocumentChunk[]> {
  const { documentId, embedding, limit = 5, similarityThreshold = 0.7 } = params;

  // Convert embedding array to pgvector format
  const embeddingString = `[${embedding.join(",")}]`;

  const result = await pool.query<DocumentChunk & { similarity: number }>(
    `SELECT
      id,
      document_id,
      chunk_index,
      content,
      embedding,
      metadata,
      created_at,
      1 - (embedding <=> $1::vector) as similarity
    FROM document_chunks
    WHERE document_id = $2
      AND 1 - (embedding <=> $1::vector) >= $3
    ORDER BY embedding <=> $1::vector
    LIMIT $4`,
    [embeddingString, documentId, similarityThreshold, limit]
  );

  return result.rows;
}

export async function getChunksByDocumentId(documentId: string): Promise<DocumentChunk[]> {
  const result = await pool.query<DocumentChunk>(
    `SELECT * FROM document_chunks
     WHERE document_id = $1
     ORDER BY chunk_index ASC`,
    [documentId]
  );

  return result.rows;
}

export interface Chat {
  id: string;
  user_id: string;
  document_id: string;
  title: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  sources: Record<string, unknown> | null;
  created_at: Date;
}

export async function getOrCreateChat(
  userId: string,
  documentId: string
): Promise<Chat> {
  // Try to find existing chat for this user and document
  const existingChat = await pool.query<Chat>(
    `SELECT * FROM chats
     WHERE user_id = $1 AND document_id = $2
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId, documentId]
  );

  if (existingChat.rows[0]) {
    return existingChat.rows[0];
  }

  // Create new chat if none exists
  const result = await pool.query<Chat>(
    `INSERT INTO chats (user_id, document_id, title)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, documentId, "New Chat"]
  );

  return result.rows[0];
}

export async function createMessage(
  chatId: string,
  role: string,
  content: string,
  sources?: Record<string, unknown>
): Promise<Message> {
  const result = await pool.query<Message>(
    `INSERT INTO messages (chat_id, role, content, sources)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [chatId, role, content, sources || null]
  );

  // Update chat's updated_at timestamp
  await pool.query(
    `UPDATE chats SET updated_at = NOW() WHERE id = $1`,
    [chatId]
  );

  return result.rows[0];
}

export async function getMessagesByChatId(chatId: string): Promise<Message[]> {
  const result = await pool.query<Message>(
    `SELECT * FROM messages
     WHERE chat_id = $1
     ORDER BY created_at ASC`,
    [chatId]
  );

  return result.rows;
}

export async function getChatsByUserId(userId: string, limit = 50): Promise<Chat[]> {
  const result = await pool.query<Chat>(
    `SELECT * FROM chats
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}

export async function deleteChat(chatId: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM chats WHERE id = $1 AND user_id = $2`,
    [chatId, userId]
  );

  return (result.rowCount ?? 0) > 0;
}

export interface UserStats {
  documents: {
    total: number;
    ready: number;
    processing: number;
    failed: number;
    totalStorageBytes: number;
    firstUploadDate: string | null;
  };
  chats: {
    total: number;
    totalMessages: number;
    lastActivity: string | null;
  };
  chunks: {
    total: number;
  };
}

export async function getUserStats(userId: string): Promise<UserStats> {
  // Get document statistics
  const documentsQuery = await pool.query(
    `SELECT
      COUNT(*) as total_documents,
      COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_documents,
      COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_documents,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_documents,
      COALESCE(SUM(file_size), 0) as total_storage_bytes,
      MIN(created_at) as first_document_date
    FROM documents
    WHERE user_id = $1`,
    [userId]
  );

  // Get chat statistics
  const chatsQuery = await pool.query(
    `SELECT
      COUNT(DISTINCT c.id) as total_chats,
      COUNT(m.id) as total_messages,
      MAX(m.created_at) as last_message_date
    FROM chats c
    LEFT JOIN messages m ON c.id = m.chat_id
    WHERE c.user_id = $1`,
    [userId]
  );

  // Get chunk statistics
  const chunksQuery = await pool.query(
    `SELECT
      COUNT(dc.id) as total_chunks
    FROM documents d
    LEFT JOIN document_chunks dc ON d.id = dc.document_id
    WHERE d.user_id = $1`,
    [userId]
  );

  const docStats = documentsQuery.rows[0];
  const chatStats = chatsQuery.rows[0];
  const chunkStats = chunksQuery.rows[0];

  return {
    documents: {
      total: parseInt(docStats.total_documents) || 0,
      ready: parseInt(docStats.ready_documents) || 0,
      processing: parseInt(docStats.processing_documents) || 0,
      failed: parseInt(docStats.failed_documents) || 0,
      totalStorageBytes: parseInt(docStats.total_storage_bytes) || 0,
      firstUploadDate: docStats.first_document_date,
    },
    chats: {
      total: parseInt(chatStats.total_chats) || 0,
      totalMessages: parseInt(chatStats.total_messages) || 0,
      lastActivity: chatStats.last_message_date,
    },
    chunks: {
      total: parseInt(chunkStats.total_chunks) || 0,
    },
  };
}
