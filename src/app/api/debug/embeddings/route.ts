import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-api";
import { query } from "@/lib/db";
import { generateEmbedding } from "@/lib/openai";

export const runtime = "nodejs";

interface DebugResult {
  totalChunks: number;
  chunksWithEmbeddings: number;
  sampleChunk?: {
    id: string;
    chunkIndex: number;
    contentPreview: string;
    embeddingDimensions: number;
  };
  testQuery?: {
    question: string;
    embeddingDimensions: number;
    topResults: Array<{
      id: string;
      chunkIndex: number;
      similarity: number;
      contentPreview: string;
    }>;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get("documentId");
    const testQuestion = searchParams.get("question");

    // Get chunk statistics
    const stats = await query<{
      total_chunks: string;
      chunks_with_embeddings: string;
    }>(
      `SELECT
        COUNT(*) as total_chunks,
        COUNT(embedding) as chunks_with_embeddings
      FROM document_chunks
      WHERE document_id = $1`,
      [documentId]
    );

    const result: DebugResult = {
      totalChunks: parseInt(stats[0]?.total_chunks || "0"),
      chunksWithEmbeddings: parseInt(stats[0]?.chunks_with_embeddings || "0"),
    };

    // Get sample chunk
    const sampleChunks = await query<{
      id: string;
      chunk_index: number;
      content: string;
      embedding: string;
    }>(
      `SELECT
        id,
        chunk_index,
        content,
        embedding::text
      FROM document_chunks
      WHERE document_id = $1
      LIMIT 1`,
      [documentId]
    );

    if (sampleChunks[0]) {
      // Parse the vector string to count dimensions
      const embeddingStr = sampleChunks[0].embedding;
      const dimensions = embeddingStr ? embeddingStr.split(',').length : 0;

      result.sampleChunk = {
        id: sampleChunks[0].id,
        chunkIndex: sampleChunks[0].chunk_index,
        contentPreview: sampleChunks[0].content.substring(0, 200),
        embeddingDimensions: dimensions,
      };
    }

    // Test similarity search if question provided
    if (testQuestion && documentId) {
      const questionEmbedding = await generateEmbedding(testQuestion);
      const embeddingString = `[${questionEmbedding.join(",")}]`;

      const similarChunks = await query<{
        id: string;
        chunk_index: number;
        similarity: number;
        content: string;
      }>(
        `SELECT
          id,
          chunk_index,
          1 - (embedding <=> $1::vector) as similarity,
          content
        FROM document_chunks
        WHERE document_id = $2
        ORDER BY embedding <=> $1::vector
        LIMIT 10`,
        [embeddingString, documentId]
      );

      result.testQuery = {
        question: testQuestion,
        embeddingDimensions: questionEmbedding.length,
        topResults: similarChunks.map((chunk) => ({
          id: chunk.id,
          chunkIndex: chunk.chunk_index,
          similarity: chunk.similarity,
          contentPreview: chunk.content.substring(0, 200),
        })),
      };
    }

    return Response.json(result);
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return Response.json(
      {
        error: "Debug failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
