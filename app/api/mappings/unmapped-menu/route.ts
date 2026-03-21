import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getMockData } from "@/lib/mock-data";

export async function GET(_request: NextRequest) {
  try {
    const data = getMockData();
    // In our mock store, unmapped items are just non-existent mappings
    // For now returning empty array as placeholder
    return NextResponse.json([]);
  } catch (error) {
    console.error("GET /api/mappings/unmapped-menu error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
