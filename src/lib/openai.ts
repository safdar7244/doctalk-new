import OpenAI from "openai";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const CHAT_MODEL = "gpt-4-turbo-preview";

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0].embedding;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function createChatCompletionStream(messages: ChatMessage[]) {
  const openai = getOpenAI();
  return openai.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 1000,
  });
}

export function createChatCompletion(messages: ChatMessage[]) {
  const openai = getOpenAI();
  return openai.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    stream: false,
    temperature: 0.7,
    max_tokens: 1000,
  });
}
