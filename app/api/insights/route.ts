import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getMockData } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const restaurantId = searchParams.get("restaurantId");

    const data = getMockData();
    let filtered = [...data.insightReports];

    if (restaurantId) {
      filtered = filtered.filter((ir) => ir.restaurantId === restaurantId);
    }

    const result = filtered.map((ir) => {
      const restaurant = data.restaurants.find((r) => r.id === ir.restaurantId);
      return {
        ...ir,
        restaurant: restaurant ? { id: restaurant.id, name: restaurant.name } : { id: ir.restaurantId, name: "Unknown" },
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/insights error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
