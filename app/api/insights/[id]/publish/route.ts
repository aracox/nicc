import { NextRequest, NextResponse } from "next/server";
import { insightReports } from "@/lib/mock-data";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const report = insightReports.find((r) => r.id === id);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.status === "PUBLISHED") {
      return NextResponse.json({ error: "Report is already published" }, { status: 400 });
    }

    report.status = "PUBLISHED";
    return NextResponse.json(report);
  } catch (error) {
    console.error("PATCH /api/insights/[id]/publish error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
