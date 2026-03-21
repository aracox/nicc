import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getMockData } from "@/lib/mock-data";

export async function GET(_request: NextRequest) {
  try {
    const data = getMockData();
    return NextResponse.json(data.foodCourts);
  } catch (error) {
    console.error("GET /api/food-courts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
