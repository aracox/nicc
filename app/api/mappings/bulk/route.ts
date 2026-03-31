import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMockData, saveMockData } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
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

    // Verify Standard Dish exists
    const standardDish = data.standardDishes.find((d) => d.id === standardDishId);
    if (!standardDish) {
      return NextResponse.json({ error: "Standard dish not found" }, { status: 404 });
    }

    let updatedCount = 0;
    
    // Update all mappings with the same menuName
    data.menuMappings = data.menuMappings.map((mapping) => {
      if (mapping.menuItem.name === menuName) {
        updatedCount++;
        return {
          ...mapping,
          standardDishId: standardDish.id,
          standardDish: {
            id: standardDish.id,
            name: standardDish.name,
            cuisineType: standardDish.cuisineType || "Thai",
            createdAt: standardDish.createdAt || new Date().toISOString()
          }
        };
      }
      return mapping;
    });

    if (updatedCount === 0) {
      return NextResponse.json({ error: "No mappings found with that name" }, { status: 404 });
    }

    saveMockData(data);

    return NextResponse.json({ success: true, count: updatedCount });
  } catch (error) {
    console.error(`PUT /api/mappings/bulk error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const menuName = searchParams.get("menuName");

    if (!menuName) {
      return NextResponse.json({ error: "Missing menuName parameter" }, { status: 400 });
    }

    const data = getMockData();

    const initialLength = data.menuMappings.length;
    
    // Keep mappings that do not match the menuName
    data.menuMappings = data.menuMappings.filter(
      (m) => m.menuItem.name !== menuName
    );

    const deletedCount = initialLength - data.menuMappings.length;

    saveMockData(data);

    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error(`DELETE /api/mappings/bulk error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
