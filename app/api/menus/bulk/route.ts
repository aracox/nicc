import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMockData, saveMockData } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.toLowerCase();
    const foodCourtId = searchParams.get("foodCourtId");
    const shopId = searchParams.get("shopId");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    const data = getMockData();

    // Determine which menu items to delete by recreating the filter logic
    let menusToDelete = data.menuItems.filter(item => {
      if (q && !item.name.toLowerCase().includes(q)) return false;
      if (minPrice && (item.price === undefined || item.price < parseFloat(minPrice))) return false;
      if (maxPrice && (item.price === undefined || item.price > parseFloat(maxPrice))) return false;

      // Filter by shop
      if (shopId) {
        if (item.restaurantId !== shopId) return false;
      } else if (foodCourtId) {
        // If foodCourtId is provided but no specific shop, filter by shops in that food court
        const restaurantMatches = data.restaurants.find(
          r => r.id === item.restaurantId && r.foodCourtId === foodCourtId
        );
        if (!restaurantMatches) return false;
      }

      return true; // Item matches all active display filters and should be deleted
    });

    const idsToDelete = new Set(menusToDelete.map(m => m.id));

    if (idsToDelete.size === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Perform deletions
    data.menuItems = data.menuItems.filter(item => !idsToDelete.has(item.id));
    
    // Cascade delete mappings
    data.menuMappings = data.menuMappings.filter(
      mapping => !idsToDelete.has(mapping.menuItemId)
    );

    saveMockData(data);

    return NextResponse.json({ success: true, count: idsToDelete.size });
  } catch (error) {
    console.error("DELETE /api/menus/bulk error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
