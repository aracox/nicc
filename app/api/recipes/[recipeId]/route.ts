import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMockData, saveMockData } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const session = await getSession();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipeId } = await params;
    
    if (!recipeId) {
      return NextResponse.json({ error: "Missing recipe ID" }, { status: 400 });
    }

    const data = getMockData();

    // Find the dish index
    const dishIndex = data.standardDishes.findIndex(s => s.id === recipeId);
    
    if (dishIndex === -1) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Remove the standard dish
    data.standardDishes.splice(dishIndex, 1);

    // Remove associated menu mappings safely to avoid broken DB references
    data.menuMappings = data.menuMappings.filter(
      mapping => mapping.standardDishId !== recipeId
    );

    saveMockData(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/recipes/[recipeId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
