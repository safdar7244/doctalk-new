import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-api";
import { getUserStats } from "@/lib/db";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getUserStats(user.sub);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to fetch user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
