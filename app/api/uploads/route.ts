import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { getMockData, saveMockData } from "@/lib/mock-data";

const createSchema = z.object({
  restaurantId: z.string().min(1),
  source: z.enum(["POS_EXPORT", "PAPER"]),
  fileKey: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const restaurantId = searchParams.get("restaurantId");

    const data = getMockData();
    let filtered = [...data.uploads];

    if (restaurantId) {
      filtered = filtered.filter((u) => u.restaurantId === restaurantId);
    }

    const result = filtered.map((u) => {
      const restaurant = data.restaurants.find((r) => r.id === u.restaurantId);
      return {
        ...u,
        restaurant: restaurant ? { id: restaurant.id, name: restaurant.name } : { id: u.restaurantId, name: "Unknown" },
      };
    });

    return NextResponse.json(result);
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

    const data = getMockData();
    const restaurant = data.restaurants.find((r) => r.id === parsed.data.restaurantId);
    
    const newUpload = {
      id: `upl-${String(data.uploads.length + 1).padStart(3, "0")}`,
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

    data.uploads.push(newUpload);
    saveMockData(data);
    
    return NextResponse.json(newUpload, { status: 201 });
  } catch (error) {
    console.error("POST /api/uploads error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
