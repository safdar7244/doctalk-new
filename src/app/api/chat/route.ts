import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-api";
import {
  getDocumentById,
  searchSimilarChunks,
  getOrCreateChat,
  createMessage,
  getMessagesByChatId,
} from "@/lib/db";
import { generateEmbedding, createChatCompletionStream } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 30;

// GET /api/chat?documentId=xxx - Retrieve chat history
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return Response.json({ error: "Missing documentId" }, { status: 400 });
    }

    // Verify document access
    const document = await getDocumentById(documentId, user.sub);
    if (!document) {
      return Response.json(
        { error: "Document not found or access denied" },
        { status: 404 }
      );
    }

    // Get or create chat session
    const chat = await getOrCreateChat(user.sub, documentId);

    // Get chat messages
    const messages = await getMessagesByChatId(chat.id);

    return Response.json({ messages });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return Response.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}

interface ChatRequestBody {
  documentId: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = (await request.json()) as ChatRequestBody;
    const { documentId, message } = body;

    if (!documentId || !message) {
      return new Response(
        JSON.stringify({ error: "Missing documentId or message" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify document access
    const document = await getDocumentById(documentId, user.sub);
    if (!document) {
      return new Response(
        JSON.stringify({ error: "Document not found or access denied" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if document is ready
    if (document.status !== "ready") {
      return new Response(
        JSON.stringify({
          error: `Document is not ready for chat. Current status: ${document.status}`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate embedding for the user's question
    console.log("Generating embedding for the question...",message);
    const questionEmbedding = await generateEmbedding(message);

    // Search for relevant chunks using vector similarity
    const relevantChunks = await searchSimilarChunks({
      documentId,
      embedding: questionEmbedding,
      limit: 5,
      similarityThreshold: 0.1,
    });

    console.log("Found relevant chunks:", relevantChunks.length,relevantChunks);

    if (relevantChunks.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "No relevant content found in the document. Try rephrasing your question.",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Build context from relevant chunks
    const context = relevantChunks
      .map((chunk, index) => {
        const similarity = chunk.similarity
          ? ` (relevance: ${(chunk.similarity * 100).toFixed(1)}%)`
          : "";
        return `[Chunk ${index + 1}${similarity}]\n${chunk.content}`;
      })
      .join("\n\n");

    // Build the system prompt with context
    const systemPrompt = `You are a helpful AI assistant that answers questions about documents.
You will be provided with relevant excerpts from a document titled "${document.filename}".
Use ONLY the information from these excerpts to answer the user's question.
If the excerpts don't contain enough information to answer the question, say so clearly.
Be concise, accurate, and cite specific parts of the excerpts when relevant.

DOCUMENT EXCERPTS:
${context}`;

    // Get or create chat session
    const chat = await getOrCreateChat(user.sub, documentId);

    // Load conversation history from database
    const dbMessages = await getMessagesByChatId(chat.id);
    const conversationHistory = dbMessages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Save user message to database
    await createMessage(chat.id, "user", message);

    // Build messages array for OpenAI
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory,
      { role: "user" as const, content: message },
    ];

    // Create streaming response
    const completion = await createChatCompletionStream(messages);

    // Accumulate the assistant's response to save later
    let assistantResponse = "";

    // Create a ReadableStream to pipe OpenAI's stream to the client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              assistantResponse += content;
              // Send the content as SSE (Server-Sent Events) format
              const data = `data: ${JSON.stringify({ content })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }

          // Save assistant message to database
          if (assistantResponse) {
            await createMessage(chat.id, "assistant", assistantResponse, {
              chunks: relevantChunks.map((c) => ({
                id: c.id,
                similarity: c.similarity,
              })),
            });
          }

          // Send done message
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("Error in streaming:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
