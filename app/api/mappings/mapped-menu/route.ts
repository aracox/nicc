import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getMockData } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
  try {
    const data = getMockData();
    
    // Group mapped items
    const grouped = new Map();
    for (const mapping of data.menuMappings) {
      const key = mapping.menuItem.name + "|" + mapping.standardDishId;
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          menuName: mapping.menuItem.name,
          standardDishId: mapping.standardDishId,
          standardDishName: mapping.standardDish.name,
          restaurantCount: 1,
          mappedAt: mapping.createdAt,
        });
      } else {
        const existing = grouped.get(key);
        existing.restaurantCount += 1;
        if (new Date(mapping.createdAt) > new Date(existing.mappedAt)) {
          existing.mappedAt = mapping.createdAt;
        }
      }
    }

    const mappedItems = Array.from(grouped.values())
      .sort((a, b) => new Date(b.mappedAt).getTime() - new Date(a.mappedAt).getTime());

    return NextResponse.json(mappedItems);
  } catch (error) {
    console.error("GET /api/mappings/mapped-menu error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
