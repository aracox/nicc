import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getMockData } from "@/lib/mock-data";

export async function GET(_request: NextRequest) {
  try {
    const data = getMockData();
    const mappedIds = new Set(data.menuMappings.map(m => m.menuItemId));
    
    // Find unmapped items
    const unmappedItems = data.menuItems.filter(item => !mappedIds.has(item.id));

    // Group by name
    const grouped = new Map();
    for (const item of unmappedItems) {
      if (!grouped.has(item.name)) {
        grouped.set(item.name, {
          id: item.name,
          name: item.name,
          category: item.category,
          restaurantCount: 1,
          createdAt: item.createdAt,
        });
      } else {
        const existing = grouped.get(item.name);
        existing.restaurantCount += 1;
        if (new Date(item.createdAt) < new Date(existing.createdAt)) {
          existing.createdAt = item.createdAt;
        }
      }
    }

    const unmapped = Array.from(grouped.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(unmapped);
  } catch (error) {
    console.error("GET /api/mappings/unmapped-menu error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
