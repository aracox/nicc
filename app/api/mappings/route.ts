import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMockData, saveMockData, MockMapping } from "@/lib/mock-data";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { menuName, standardDishId } = await request.json();

    if (!menuName || !standardDishId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const data = getMockData();

    // Verify dish
    const standardDish = data.standardDishes.find(d => d.id === standardDishId);
    if (!standardDish) {
      return NextResponse.json({ error: "Standard dish not found" }, { status: 404 });
    }

    // Find all menu items sharing this name that are NOT already mapped
    const unmappedItems = data.menuItems.filter(m => 
      m.name === menuName && !data.menuMappings.some(mapping => mapping.menuItemId === m.id)
    );

    if (unmappedItems.length === 0) {
      return NextResponse.json({ error: "No unmapped items found with that name" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newMappings: MockMapping[] = unmappedItems.map(menuItem => ({
      id: randomUUID(),
      restaurantId: menuItem.restaurantId,
      menuItemId: menuItem.id,
      standardDishId: standardDish.id,
      portionMultiplier: 1,
      createdAt: now,
      menuItem: {
        id: menuItem.id,
        restaurantId: menuItem.restaurantId,
        name: menuItem.name,
        category: menuItem.category,
        createdAt: menuItem.createdAt
      },
      standardDish: {
        id: standardDish.id,
        name: standardDish.name,
        cuisineType: standardDish.cuisineType || "Thai",
        createdAt: standardDish.createdAt || now
      }
    }));

    data.menuMappings.push(...newMappings);
    saveMockData(data);

    return NextResponse.json({ success: true, count: newMappings.length }, { status: 201 });
  } catch (error) {
    console.error(`POST /api/mappings error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
