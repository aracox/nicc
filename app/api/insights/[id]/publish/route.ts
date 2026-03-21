import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getMockData, saveMockData } from "@/lib/mock-data";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = getMockData();
    const idx = data.insightReports.findIndex((r) => r.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    data.insightReports[idx].status = "PUBLISHED";
    saveMockData(data);

    return NextResponse.json(data.insightReports[idx]);
  } catch (error) {
    console.error("POST /api/insights/[id]/publish error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
