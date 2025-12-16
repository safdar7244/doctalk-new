"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface FileUpload {
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  documentId?: string;
}

interface DocumentUploadProps {
  onUploadComplete?: (documentId: string, filename: string) => void;
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<FileUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
      }
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }

    return null;
  };

  const getContentType = (file: File): string => {
    if (file.type) return file.type;

    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    const typeMap: Record<string, string> = {
      ".pdf": "application/pdf",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".txt": "text/plain",
      ".md": "text/markdown",
    };
    return typeMap[extension] || "application/octet-stream";
  };

  const uploadFile = async (file: File, index: number) => {
    try {
      // Update status to uploading
      setUploads((prev) =>
        prev.map((u, i) =>
          i === index ? { ...u, status: "uploading" as UploadStatus, progress: 10 } : u
        )
      );

      // Get presigned URL
      const contentType = getContentType(file);
      const presignedResponse = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType,
          fileSize: file.size,
        }),
      });

      if (!presignedResponse.ok) {
        const error = await presignedResponse.json();
        throw new Error(error.error || "Failed to get upload URL");
      }

      const { uploadUrl, documentId } = await presignedResponse.json();

      // Update progress
      setUploads((prev) =>
        prev.map((u, i) =>
          i === index ? { ...u, progress: 30 } : u
        )
      );

      // Upload to S3 using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      // Update progress
      setUploads((prev) =>
        prev.map((u, i) =>
          i === index ? { ...u, progress: 80 } : u
        )
      );

      // Mark document as processing (Lambda will pick it up via S3 event)
      await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "processing" }),
      });

      // Update status to success
      setUploads((prev) =>
        prev.map((u, i) =>
          i === index
            ? { ...u, status: "success" as UploadStatus, progress: 100, documentId }
            : u
        )
      );

      // Callback
      onUploadComplete?.(documentId, file.name);
    } catch (error) {
      setUploads((prev) =>
        prev.map((u, i) =>
          i === index
            ? {
                ...u,
                status: "error" as UploadStatus,
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : u
        )
      );
    }
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newUploads: FileUpload[] = [];

    fileArray.forEach((file) => {
      const validationError = validateFile(file);
      if (validationError) {
        newUploads.push({
          file,
          status: "error",
          progress: 0,
          error: validationError,
        });
      } else {
        newUploads.push({
          file,
          status: "idle",
          progress: 0,
        });
      }
    });

    setUploads((prev) => [...prev, ...newUploads]);

    // Start uploading valid files
    const startIndex = uploads.length;
    newUploads.forEach((upload, i) => {
      if (upload.status !== "error") {
        uploadFile(upload.file, startIndex + i);
      }
    });
  }, [uploads.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [handleFiles]
  );

  const removeUpload = (index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCompleted = () => {
    setUploads((prev) => prev.filter((u) => u.status !== "success"));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all ${
          isDragging
            ? "border-violet-500 bg-violet-50/50 dark:border-violet-400 dark:bg-violet-500/10"
            : "border-gray-300 bg-white/50 hover:border-violet-400 hover:bg-violet-50/30 dark:border-gray-700 dark:bg-gray-900/30 dark:hover:border-violet-500 dark:hover:bg-violet-500/5"
        }`}
      >
        {/* Decorative gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5" />

        <div className="p-12 text-center">
          <div
            className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl transition-colors ${
              isDragging
                ? "bg-violet-200 dark:bg-violet-500/30"
                : "bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-500/20 dark:to-indigo-500/20"
            }`}
          >
            <Upload
              className={`h-10 w-10 transition-colors ${
                isDragging
                  ? "text-violet-700 dark:text-violet-300"
                  : "text-violet-600 dark:text-violet-400"
              }`}
            />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isDragging ? "Drop your files here" : "Drop your documents here"}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-gray-500 dark:text-gray-400">
            Drag and drop your PDF, Word, or text files, or click to browse from
            your computer
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-violet-500/30"
            >
              <Upload className="h-4 w-4" />
              Choose files
            </button>
            <span className="text-sm text-gray-400 dark:text-gray-500">
              or drag & drop
            </span>
          </div>
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            Supports PDF, DOCX, TXT, MD - Max 10MB per file
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS.join(",")}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload list */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Uploads ({uploads.length})
              </h4>
              {uploads.some((u) => u.status === "success") && (
                <button
                  onClick={clearCompleted}
                  className="text-xs text-violet-600 hover:text-violet-500 dark:text-violet-400"
                >
                  Clear completed
                </button>
              )}
            </div>

            <div className="space-y-2">
              {uploads.map((upload, index) => (
                <motion.div
                  key={`${upload.file.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
                >
                  {/* File icon */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </div>

                  {/* File info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {upload.file.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {upload.status === "uploading" && (
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${upload.progress}%` }}
                          />
                        </div>
                      )}
                      {upload.status === "error" && (
                        <p className="text-xs text-red-500">{upload.error}</p>
                      )}
                    </div>
                  </div>

                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    {upload.status === "uploading" && (
                      <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                    )}
                    {upload.status === "success" && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {upload.status === "error" && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    {upload.status === "idle" && (
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    )}
                  </div>

                  {/* Remove button */}
                  {(upload.status === "success" || upload.status === "error") && (
                    <button
                      onClick={() => removeUpload(index)}
                      className="flex-shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
