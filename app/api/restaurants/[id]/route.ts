import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import {
  restaurants,
  menuItems,
  uploads,
  menuMappings,
  insightReports,
} from "@/lib/mock-data";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  foodType: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  status: z.enum(["ONBOARDED", "PENDING", "INACTIVE"]).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const restaurant = restaurants.find((r) => r.id === id);

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const rMenuItems = menuItems.filter((mi) => mi.restaurantId === id);
    const rUploads = uploads
      .filter((u) => u.restaurantId === id)
      .map(({ restaurant: _r, ...rest }) => rest);
    const rMappings = menuMappings.filter((m) => m.restaurantId === id);
    const rReports = insightReports
      .filter((ir) => ir.restaurantId === id)
      .map(({ restaurant: _r, ...rest }) => rest);

    return NextResponse.json({
      ...restaurant,
      menuItems: rMenuItems,
      uploads: rUploads,
      menuMappings: rMappings,
      insightReports: rReports,
    });
  } catch (error) {
    console.error("GET /api/restaurants/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const idx = restaurants.findIndex((r) => r.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    Object.assign(restaurants[idx], parsed.data);
    return NextResponse.json(restaurants[idx]);
  } catch (error) {
    console.error("PATCH /api/restaurants/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
