import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getMockData } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q");
    const foodCourtId = searchParams.get("foodCourtId");
    const shopId = searchParams.get("shopId");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const category = searchParams.get("category");

    const data = getMockData();
    let filtered = [...data.menuItems];

    if (category) {
      filtered = filtered.filter((m) => m.category === category);
    }

    if (q) {
      const lower = q.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(lower) ||
          m.category?.toLowerCase().includes(lower)
      );
    }

    if (foodCourtId) {
      filtered = filtered.filter((m) => {
        const rest = data.restaurants.find((r) => r.id === m.restaurantId);
        return rest?.foodCourtId === foodCourtId;
      });
    }

    if (shopId) {
      filtered = filtered.filter((m) => m.restaurantId === shopId);
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        filtered = filtered.filter((m) => m.price !== undefined && m.price >= min);
      }
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        filtered = filtered.filter((m) => m.price !== undefined && m.price <= max);
      }
    }

    // Join with restaurant info for the grid
    const result = filtered.map((m) => {
      const rest = data.restaurants.find((r) => r.id === m.restaurantId);
      return {
        ...m,
        shopNumber: rest?.shopNumber || "-",
        restaurantName: rest?.name || "-",
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/menus error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
