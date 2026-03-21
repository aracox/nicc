import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { getMockData, saveMockData } from "@/lib/mock-data";

const createSchema = z.object({
  name: z.string().min(1),
  shopNumber: z.string().min(1),
  customerNo: z.string().min(1),
  foodCourtId: z.string().optional(),
  status: z.enum(["ONBOARDED", "PENDING", "INACTIVE"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const foodCourtId = searchParams.get("foodCourtId");
    const q = searchParams.get("q");

    const data = getMockData();
    let filtered = [...data.restaurants];

    if (status) filtered = filtered.filter((r) => r.status === status);
    if (foodCourtId) filtered = filtered.filter((r) => r.foodCourtId === foodCourtId);
    if (q) {
      const lower = q.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.shopNumber?.toLowerCase().includes(lower) ||
          r.customerNo?.toLowerCase().includes(lower)
      );
    }

    const result = filtered.map((r) => ({
      ...r,
      _count: {
        menuItems: data.menuItems.filter((mi) => mi.restaurantId === r.id).length,
        uploads: data.uploads.filter((u) => u.restaurantId === r.id).length,
        insightReports: data.insightReports.filter((ir) => ir.restaurantId === r.id).length,
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

    const data = getMockData();
    const newRestaurant = {
      id: `rest-${String(data.restaurants.length + 1).padStart(3, "0")}`,
      ...parsed.data,
      status: parsed.data.status ?? ("PENDING" as const),
      createdAt: new Date().toISOString(),
    };

    data.restaurants.push(newRestaurant as any);
    saveMockData(data);

    return NextResponse.json(newRestaurant, { status: 201 });
  } catch (error) {
    console.error("POST /api/restaurants error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
