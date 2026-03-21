import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { getMockData, saveMockData } from "@/lib/mock-data";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  shopNumber: z.string().min(1).optional(),
  customerNo: z.string().min(1).optional(),
  foodCourtId: z.string().optional(),
  status: z.enum(["ONBOARDED", "PENDING", "INACTIVE"]).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = getMockData();
    const restaurant = data.restaurants.find((r) => r.id === id);

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const foodCourt = data.foodCourts.find((fc) => fc.id === restaurant.foodCourtId);

    const rMenuItems = data.menuItems.filter((mi) => mi.restaurantId === id);
    const rUploads = data.uploads
      .filter((u) => u.restaurantId === id)
      .map(({ restaurant: _r, ...rest }) => rest);
    const rMappings = data.menuMappings.filter((m) => m.restaurantId === id);
    const rReports = data.insightReports
      .filter((ir) => ir.restaurantId === id)
      .map(({ restaurant: _r, ...rest }) => rest);

    return NextResponse.json({
      ...restaurant,
      foodCourtName: foodCourt?.name || "Unknown",
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
    const session = await (await import("@/lib/auth")).getSession();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = getMockData();
    const idx = data.restaurants.findIndex((r) => r.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Update in memory and save
    data.restaurants[idx] = { ...data.restaurants[idx], ...parsed.data };
    saveMockData(data);

    return NextResponse.json(data.restaurants[idx]);
  } catch (error) {
    console.error("PATCH /api/restaurants/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
