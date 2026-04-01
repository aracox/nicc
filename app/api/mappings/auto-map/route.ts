import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMockData, saveMockData, MockMapping } from "@/lib/mock-data";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = getMockData();
    let newMappingCount = 0;

    // Distinct unmapped menu names
    const mappedMenuIds = new Set(data.menuMappings.map(m => m.menuItemId));
    const unmappedItems = data.menuItems.filter(m => !mappedMenuIds.has(m.id));
    
    // Group by exact name to process once per distinct name
    const distinctUnmappedNames = new Set(unmappedItems.map(m => m.name));

    for (const menuName of Array.from(distinctUnmappedNames)) {
      const cleanMenuName = menuName.trim().toLowerCase();
      
      const exactMatchDish = data.standardDishes.find(
        (dish) => dish.name.trim().toLowerCase() === cleanMenuName
      );

      if (exactMatchDish) {
         // Auto-map all unmapped items that share this name
         const matchingItems = unmappedItems.filter(m => m.name === menuName);
         for (const item of matchingItems) {
           const newMapping: MockMapping = {
             id: randomUUID(),
             restaurantId: item.restaurantId,
             menuItemId: item.id,
             standardDishId: exactMatchDish.id,
             portionMultiplier: 1,
             createdAt: new Date().toISOString(),
             menuItem: {
               id: item.id,
               restaurantId: item.restaurantId,
               name: item.name,
               category: item.category,
               createdAt: item.createdAt
             },
             standardDish: {
               id: exactMatchDish.id,
               name: exactMatchDish.name,
               cuisineType: "Thai",
               createdAt: new Date().toISOString()
             }
           };
           data.menuMappings.push(newMapping);
           mappedMenuIds.add(item.id); // mark as mapped for the loop
           newMappingCount++;
         }
      }
    }

    if (newMappingCount > 0) {
      saveMockData(data);
    }

    return NextResponse.json({ success: true, count: newMappingCount });
  } catch (error) {
    console.error("POST /api/mappings/auto-map error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
