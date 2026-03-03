import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { uploads, restaurants } from "@/lib/mock-data";

const createSchema = z.object({
  restaurantId: z.string().min(1),
  source: z.enum(["POS_EXPORT", "PAPER"]),
  fileKey: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const restaurantId = searchParams.get("restaurantId");

    let filtered = [...uploads];
    if (status) filtered = filtered.filter((u) => u.status === status);
    if (restaurantId) filtered = filtered.filter((u) => u.restaurantId === restaurantId);

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("GET /api/uploads error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const restaurant = restaurants.find((r) => r.id === parsed.data.restaurantId);
    const newUpload = {
      id: `upl-${String(uploads.length + 1).padStart(3, "0")}`,
      ...parsed.data,
      status: "RECEIVED" as const,
      receivedAt: new Date().toISOString(),
      processedAt: null,
      errorMessage: null,
      restaurant: {
        id: parsed.data.restaurantId,
        name: restaurant?.name ?? "Unknown",
      },
    };

    uploads.push(newUpload);
    return NextResponse.json(newUpload, { status: 201 });
  } catch (error) {
    console.error("POST /api/uploads error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
