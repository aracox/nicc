import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getMockData } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q");

    const data = getMockData();
    let recipes = data.standardDishes;

    if (q) {
      recipes = recipes.filter(dish => 
        dish.name.toLowerCase().includes(q.toLowerCase())
      );
    }

    return NextResponse.json(recipes);
  } catch (error) {
    console.error("GET /api/recipes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

