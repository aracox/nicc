import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMockData, saveMockData } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = getMockData();

    const initialMenuCount = data.menuItems.length;

    // Delete menu item
    data.menuItems = data.menuItems.filter((item) => item.id !== id);

    if (data.menuItems.length === initialMenuCount) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    // Cascade delete mappings
    data.menuMappings = data.menuMappings.filter(
      (mapping) => mapping.menuItemId !== id
    );

    saveMockData(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/menus/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = getMockData();

    const item = data.menuItems.find((m) => m.id === id);
    if (!item) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    if (body.category) {
      item.category = body.category;
    }
    
    // Can expand to name and price if needed later
    if (body.name) item.name = body.name;
    if (body.price !== undefined) item.price = body.price;

    saveMockData(data);
    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("PATCH /api/menus/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

