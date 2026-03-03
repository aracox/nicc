import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { restaurants, menuItems, uploads, insightReports } from "@/lib/mock-data";

const createSchema = z.object({
  name: z.string().min(1),
  foodType: z.string().min(1),
  province: z.string().min(1),
  district: z.string().min(1),
  status: z.enum(["ONBOARDED", "PENDING", "INACTIVE"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const province = searchParams.get("province");
    const status = searchParams.get("status");
    const q = searchParams.get("q");

    let filtered = [...restaurants];

    if (province) filtered = filtered.filter((r) => r.province === province);
    if (status) filtered = filtered.filter((r) => r.status === status);
    if (q) {
      const lower = q.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.foodType.toLowerCase().includes(lower)
      );
    }

    const result = filtered.map((r) => ({
      ...r,
      _count: {
        menuItems: menuItems.filter((mi) => mi.restaurantId === r.id).length,
        uploads: uploads.filter((u) => u.restaurantId === r.id).length,
        insightReports: insightReports.filter((ir) => ir.restaurantId === r.id).length,
      },
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/restaurants error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const newRestaurant = {
      id: `rest-${String(restaurants.length + 1).padStart(3, "0")}`,
      ...parsed.data,
      status: parsed.data.status ?? ("PENDING" as const),
      createdAt: new Date().toISOString(),
    };

    restaurants.push(newRestaurant);
    return NextResponse.json(newRestaurant, { status: 201 });
  } catch (error) {
    console.error("POST /api/restaurants error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
