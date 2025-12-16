import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;
const UPLOAD_PREFIX = "uploads/";

export type AllowedFileType = "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "text/plain" | "text/markdown";

export const ALLOWED_FILE_TYPES: AllowedFileType[] = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function getFileExtension(contentType: string): string {
  const extensions: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/markdown": "md",
  };
  return extensions[contentType] || "bin";
}

export async function generateUploadPresignedUrl(
  userId: string,
  filename: string,
  contentType: string,
  fileSize: number
): Promise<{ url: string; key: string }> {
  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(contentType as AllowedFileType)) {
    throw new Error(`File type ${contentType} is not allowed`);
  }

  // Validate file size
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Generate unique key: uploads/{userId}/{timestamp}-{filename}
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${UPLOAD_PREFIX}${userId}/${timestamp}-${sanitizedFilename}`;

  // Include ContentType in command to match the upload request
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  // Generate presigned URL for browser uploads
  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1 hour expiry
  });

  return { url, key };
}

export async function generateDownloadPresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry
}
