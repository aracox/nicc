import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { standardDishes } from "@/lib/mock-data";

const ingredientSchema = z.object({
  ingredientName: z.string().min(1),
  qty: z.number().positive(),
  unit: z.string().min(1),
});

const createSchema = z.object({
  name: z.string().min(1),
  cuisineType: z.string().min(1),
  ingredients: z.array(ingredientSchema).min(1),
});

export async function GET() {
  try {
    return NextResponse.json(standardDishes);
  } catch (error) {
    console.error("GET /api/recipes error:", error);
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

    const dishId = `dish-${String(standardDishes.length + 1).padStart(3, "0")}`;
    const ings = parsed.data.ingredients.map((ing, j) => ({
      id: `ing-${standardDishes.length + 1}-${j + 1}`,
      standardDishId: dishId,
      ingredientName: ing.ingredientName,
      qty: ing.qty,
      unit: ing.unit,
      createdAt: new Date().toISOString(),
    }));

    const newDish = {
      id: dishId,
      name: parsed.data.name,
      cuisineType: parsed.data.cuisineType,
      createdAt: new Date().toISOString(),
      _count: { ingredients: ings.length },
      ingredients: ings,
    };

    standardDishes.push(newDish);
    return NextResponse.json(newDish, { status: 201 });
  } catch (error) {
    console.error("POST /api/recipes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
