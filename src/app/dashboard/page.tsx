"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  LogOut,
  Loader2,
  Plus,
  MessageSquare,
  Clock,
  Search,
  MoreHorizontal,
  FolderOpen,
  Moon,
  Sun,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/auth-provider";
import { DocumentUpload } from "@/components/document-upload";
import type { Document, DocumentStatus } from "@/lib/db";

const statusConfig: Record<DocumentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    color: "text-gray-500 bg-gray-100 dark:bg-gray-800",
    icon: <Clock className="h-3 w-3" />,
  },
  processing: {
    label: "Processing",
    color: "text-amber-600 bg-amber-100 dark:bg-amber-500/20",
    icon: <RefreshCw className="h-3 w-3 animate-spin" />,
  },
  ready: {
    label: "Ready",
    color: "text-green-600 bg-green-100 dark:bg-green-500/20",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  failed: {
    label: "Failed",
    color: "text-red-600 bg-red-100 dark:bg-red-500/20",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export default function DashboardPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, isLoading, isAuthenticated, refreshUser, signOut } = useAuth();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Re-check auth on mount (in case we just logged in)
  useEffect(() => {
    const checkAuth = async () => {
      await refreshUser();
      setHasCheckedAuth(true);
    };
    checkAuth();
  }, [refreshUser]);

  // Redirect if not authenticated after checking
  useEffect(() => {
    if (hasCheckedAuth && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [hasCheckedAuth, isLoading, isAuthenticated, router]);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDocuments();
    }
  }, [isAuthenticated, fetchDocuments]);

  // Poll for processing documents
  useEffect(() => {
    const hasProcessingDocs = documents.some(
      (doc) => doc.status === "processing" || doc.status === "pending"
    );

    if (!hasProcessingDocs) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const handleUploadComplete = useCallback(() => {
    // Refresh documents list after upload
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDeleteDocument = async (docId: string) => {
    if (deletingId) return;

    setDeletingId(docId);
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const showLoading = isLoading || !hasCheckedAuth;

  if (showLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  const firstName = user?.email?.split("@")[0] || "there";
  const readyDocs = documents.filter((d) => d.status === "ready");

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-50/50 via-white to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-950" />
        <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-gradient-to-r from-violet-400/10 to-indigo-400/10 blur-3xl dark:from-violet-600/5 dark:to-indigo-600/5" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-blue-400/10 to-cyan-400/10 blur-3xl dark:from-blue-600/5 dark:to-cyan-600/5" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl dark:border-gray-800/50 dark:bg-gray-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-xl font-bold text-transparent">
              DocTalk
            </span>
          </Link>

          {/* Search bar */}
          <div className="mx-8 hidden max-w-md flex-1 md:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
              aria-label="Toggle theme"
            >
              {mounted && (
                <>
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  )}
                </>
              )}
            </button>

            {/* User menu */}
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {firstName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.email}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-violet-500/25">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={signOut}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Welcome section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {firstName}!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Upload documents and start chatting with your content
          </p>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            {
              icon: Plus,
              title: "New Chat",
              description: "Start a conversation",
              color: "from-violet-600 to-indigo-600",
              shadow: "shadow-violet-500/25",
              count: null,
            },
            {
              icon: FileText,
              title: "Documents",
              description: `${documents.length} total`,
              color: "from-pink-600 to-rose-600",
              shadow: "shadow-pink-500/25",
              count: documents.length,
            },
            {
              icon: FolderOpen,
              title: "Ready",
              description: `${readyDocs.length} processed`,
              color: "from-blue-600 to-cyan-600",
              shadow: "shadow-blue-500/25",
              count: readyDocs.length,
            },
            {
              icon: Clock,
              title: "Recent",
              description: "Continue where you left",
              color: "from-amber-600 to-orange-600",
              shadow: "shadow-amber-500/25",
              count: null,
            },
          ].map((action) => (
            <button
              key={action.title}
              className="group relative overflow-hidden rounded-2xl border border-gray-200/50 bg-white p-5 text-left transition-all hover:border-gray-300 hover:shadow-lg dark:border-gray-800/50 dark:bg-gray-900/50 dark:hover:border-gray-700"
            >
              <div
                className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} shadow-lg ${action.shadow} transition-transform group-hover:scale-110`}
              >
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {action.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {action.description}
              </p>
            </button>
          ))}
        </motion.div>

        {/* Upload area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <DocumentUpload onUploadComplete={handleUploadComplete} />
        </motion.div>

        {/* Documents section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Your Documents
            </h2>
            <button
              onClick={fetchDocuments}
              className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {isLoadingDocs ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : documents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => {
                const status = statusConfig[doc.status];
                return (
                  <div
                    key={doc.id}
                    className="group relative overflow-hidden rounded-xl border border-gray-200/50 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-lg dark:border-gray-800/50 dark:bg-gray-900/50 dark:hover:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-500/20 dark:to-indigo-500/20">
                          <FileText className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-medium text-gray-900 dark:text-white">
                            {doc.filename}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatFileSize(doc.file_size)} - {formatDate(doc.created_at)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        disabled={deletingId === doc.id}
                        className="rounded-lg p-2 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}
                      >
                        {status.icon}
                        {status.label}
                      </div>

                      {doc.status === "ready" && (
                        <Link
                          href={`/chat/${doc.id}`}
                          className="flex items-center gap-1 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-600 transition-colors hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:hover:bg-violet-500/20"
                        >
                          <MessageSquare className="h-3 w-3" />
                          Chat
                        </Link>
                      )}

                      {doc.status === "failed" && doc.error_message && (
                        <span
                          className="max-w-[150px] truncate text-xs text-red-500"
                          title={doc.error_message}
                        >
                          {doc.error_message}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-gray-200/50 bg-white/50 dark:border-gray-800/50 dark:bg-gray-900/30">
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gray-500/5 via-transparent to-gray-500/5" />
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                  <FolderOpen className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  No documents yet
                </h3>
                <p className="mt-2 max-w-sm text-gray-500 dark:text-gray-400">
                  Upload your first document to start chatting with your content
                  using AI
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
