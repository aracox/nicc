import { NextRequest, NextResponse } from "next/server";
import { insightReports } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const restaurantId = searchParams.get("restaurantId");
    const status = searchParams.get("status");

    let filtered = [...insightReports];
    if (restaurantId) filtered = filtered.filter((r) => r.restaurantId === restaurantId);
    if (status) filtered = filtered.filter((r) => r.status === status);

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("GET /api/insights error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
