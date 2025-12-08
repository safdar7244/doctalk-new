"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Upload, LogOut, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, refreshUser, signOut } = useAuth();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

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

  const showLoading = isLoading || !hasCheckedAuth;

  if (showLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              DocTalk
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {user?.email}
            </span>
            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome, {user?.email?.split("@")[0]}!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Upload a document to get started
          </p>
        </motion.div>

        {/* Upload area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8"
        >
          <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center transition-colors hover:border-violet-400 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-violet-500">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-500/20">
              <Upload className="h-8 w-8 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              Upload a document
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Drag and drop your PDF, Word, or text file here, or click to browse
            </p>
            <button className="mt-6 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105">
              Choose file
            </button>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
              Supported formats: PDF, DOCX, TXT (max 10MB)
            </p>
          </div>
        </motion.div>

        {/* Placeholder for documents list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Your documents
          </h2>
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-gray-500 dark:text-gray-400">
              No documents yet. Upload your first document to start chatting!
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
