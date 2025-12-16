import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-api";
import { generateUploadPresignedUrl, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/lib/s3";
import { createDocument } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { filename, contentType, fileSize } = body;

    // Validate required fields
    if (!filename || !contentType || !fileSize) {
      return NextResponse.json(
        { error: "Missing required fields: filename, contentType, fileSize" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(contentType)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generate presigned URL
    const { url, key } = await generateUploadPresignedUrl(
      user.sub,
      filename,
      contentType,
      fileSize
    );

    // Create document record in database with pending status
    const document = await createDocument({
      userId: user.sub,
      s3Key: key,
      filename,
      fileType: contentType,
      fileSize,
    });

    return NextResponse.json({
      uploadUrl: url,
      documentId: document.id,
      s3Key: key,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
