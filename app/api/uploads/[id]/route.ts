import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { uploads } from "@/lib/mock-data";

const updateSchema = z.object({
  status: z.enum(["RECEIVED", "PROCESSING", "COMPLETED", "FAILED"]).optional(),
  errorMessage: z.string().optional(),
  processedAt: z.string().datetime().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const idx = uploads.findIndex((u) => u.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    if (parsed.data.status) uploads[idx].status = parsed.data.status;
    if (parsed.data.errorMessage !== undefined) uploads[idx].errorMessage = parsed.data.errorMessage;
    if (parsed.data.processedAt) uploads[idx].processedAt = parsed.data.processedAt;

    return NextResponse.json(uploads[idx]);
  } catch (error) {
    console.error("PATCH /api/uploads/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
