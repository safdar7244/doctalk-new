import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-api";
import { getDocumentsByUserId, getDocumentCount } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = await request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Get documents and total count
    const [documents, totalCount] = await Promise.all([
      getDocumentsByUserId(user.sub, limit, offset),
      getDocumentCount(user.sub),
    ]);

    return NextResponse.json({
      documents,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + documents.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
