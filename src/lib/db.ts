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
