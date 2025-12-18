"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  AlertCircle,
  FileText,
  Bot,
  User,
  ArrowLeft,
  Sparkles,
  File,
  Calendar,
  Database,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import type { Document } from "@/lib/db";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const documentId = params.documentId as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDocument, setIsLoadingDocument] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch document details
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}`);
        if (response.ok) {
          const data = await response.json();
          console.log("Document data:", data);
          setDocument(data.document); // Extract document from response
        } else {
          setError("Document not found");
        }
      } catch (error) {
        console.error("Failed to fetch document:", error);
        setError("Failed to load document");
      } finally {
        setIsLoadingDocument(false);
      }
    };

    if (isAuthenticated && documentId) {
      fetchDocument();
    }
  }, [documentId, isAuthenticated]);

  // Fetch document viewing URL
  useEffect(() => {
    const fetchDocumentUrl = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/view`);
        if (response.ok) {
          const data = await response.json();
          setDocumentUrl(data.url);
        }
      } catch (error) {
        console.error("Failed to fetch document URL:", error);
      }
    };

    if (isAuthenticated && documentId && document) {
      fetchDocumentUrl();
    }
  }, [documentId, isAuthenticated, document]);

  // Load chat history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(`/api/chat?documentId=${documentId}`);
        if (response.ok) {
          const data = await response.json();
          const formattedMessages = data.messages?.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at),
          })) || [];
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };

    if (documentId && isAuthenticated) {
      loadHistory();
    }
  }, [documentId, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !document) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          message: userMessage.content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (!reader) throw new Error("No response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedContent += parsed.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error("Failed to parse chunk:", e);
            }
          }
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingDocument) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            {error}
          </h2>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 text-violet-600 hover:text-violet-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-violet-400/20 to-indigo-400/20 blur-3xl dark:from-violet-600/10 dark:to-indigo-600/10" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-pink-400/20 to-rose-400/20 blur-3xl dark:from-pink-600/10 dark:to-rose-600/10" />
      </div>

      {/* Document Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="relative z-10 hidden w-[45%] flex-col border-r border-gray-200/50 bg-white/80 backdrop-blur-xl dark:border-gray-800/50 dark:bg-gray-900/80 lg:flex"
      >
        {/* Sidebar Header */}
        <div className="border-b border-gray-200/50 p-6 dark:border-gray-800/50">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* Document Info */}
        <div className="flex-1 overflow-y-auto p-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            {/* Document Header */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/30">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="truncate text-lg font-bold text-gray-900 dark:text-white">
                    {document?.filename}
                  </h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    AI-Powered Document Chat
                  </p>
                </div>
              </div>

              {/* Compact Document Details */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 dark:bg-gray-800">
                  <File className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                  {document?.file_type?.toUpperCase() || "PDF"}
                </span>
                {document?.file_size && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 dark:bg-gray-800">
                    <Database className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                    {(document.file_size / 1024 / 1024).toFixed(2)} MB
                  </span>
                )}
                {document?.page_count && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 dark:bg-gray-800">
                    <FileText className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                    {document.page_count} pages
                  </span>
                )}
                {document?.created_at && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 dark:bg-gray-800">
                    <Calendar className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                    {new Date(document.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Document Preview */}
            <div className="rounded-2xl border border-gray-200/50 bg-white/50 p-3 dark:border-gray-800/50 dark:bg-gray-900/50">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Preview
                </h3>
                {documentUrl && (
                  <a
                    href={documentUrl}
                    download={document?.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-700"
                  >
                    Download
                  </a>
                )}
              </div>
              <div className="h-[calc(100vh-400px)] min-h-[900px] overflow-hidden rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                {documentUrl ? (
                  <iframe
                    src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="h-full w-full"
                    title={document?.filename}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-4">
                    <div className="text-center">
                      <Loader2 className="mx-auto mb-3 h-12 w-12 animate-spin text-violet-600" />
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Loading document...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Tips */}
            <div className="rounded-xl border border-violet-200/50 bg-gradient-to-br from-violet-50/50 to-indigo-50/50 p-3 dark:border-violet-800/30 dark:from-violet-950/30 dark:to-indigo-950/30">
              <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                <Sparkles className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Quick Tips</h3>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li>• "What is this about?"</li>
                <li>• "Summarize the main points"</li>
                <li>• "Find information about..."</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </motion.aside>

      {/* Chat Area */}
      <main className="relative z-10 flex flex-1 flex-col">
        {/* Chat Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-b border-gray-200/50 bg-white/80 px-6 py-4 backdrop-blur-xl dark:border-gray-800/50 dark:bg-gray-900/80"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  AI Assistant
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Ask me anything about {document?.filename}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="lg:hidden inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-violet-600 dark:text-gray-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        </motion.header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.length === 0 && !isLoading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/30">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
                <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  Start a Conversation
                </h3>
                <p className="max-w-md text-gray-600 dark:text-gray-400">
                  Ask me anything about your document. I'll use AI to find
                  relevant information and provide helpful answers.
                </p>
              </motion.div>
            )}

            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex gap-4 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl px-6 py-4 shadow-lg ${
                      message.role === "user"
                        ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-violet-500/20"
                        : "bg-white/90 text-gray-900 shadow-gray-900/10 backdrop-blur-xl dark:bg-gray-800/90 dark:text-white dark:shadow-gray-950/50"
                    }`}
                  >
                    {message.content ? (
                      <>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content}
                        </p>
                        <span
                          className={`mt-2 block text-xs ${
                            message.role === "user"
                              ? "text-violet-100"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-600 dark:bg-violet-400" style={{ animationDelay: "0ms" }} />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-600 dark:bg-violet-400" style={{ animationDelay: "150ms" }} />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-600 dark:bg-violet-400" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Thinking...
                        </span>
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600">
                      <User className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto flex max-w-2xl items-start gap-3 rounded-2xl bg-red-50 p-4 shadow-lg dark:bg-red-500/10"
              >
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-t border-gray-200/50 bg-white/80 px-6 py-6 backdrop-blur-xl dark:border-gray-800/50 dark:bg-gray-900/80"
        >
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-3xl gap-4"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your document..."
              disabled={isLoading}
              className="flex-1 rounded-2xl border border-gray-300 bg-white px-6 py-4 text-sm text-gray-900 placeholder-gray-500 shadow-lg transition-all focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:border-violet-500"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
          <p className="mx-auto mt-3 max-w-3xl text-center text-xs text-gray-500 dark:text-gray-400">
            AI can make mistakes. Verify important information.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
