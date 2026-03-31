import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMockData, saveMockData, MockStandardDish, MockIngredient } from "@/lib/mock-data";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jsonText } = body;

    if (!jsonText) {
      return NextResponse.json({ error: "No JSON data provided" }, { status: 400 });
    }

    const parsedData = JSON.parse(jsonText);
    if (!Array.isArray(parsedData)) {
      return NextResponse.json({ error: "Invalid JSON format: Expected an array" }, { status: 400 });
    }

    const data = getMockData();

    let count = 0;
    for (const item of parsedData) {
      if (!item.name || !item.ingredients) continue;
      if (item.name.includes("วิธีทำ")) continue;

      const parsedName = item.name.replace(/\s*\(.*?\)/g, "").replace(/[\u{1F300}-\u{1F9FF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/gu, "").replace(/["“”]/g, "").trim();

      // Check if a standard dish with the exact same name already exists
      const existingDish = data.standardDishes.find(d => d.name === parsedName);
      if (existingDish) {
        continue; // Skip this duplicate
      }

      const newDishId = randomUUID();
      const newDish: MockStandardDish = {
        id: newDishId,
        name: parsedName,
        cuisineType: item.category ? item.category.trim() : "Thai",
        createdAt: new Date().toISOString(),
        _count: { ingredients: item.ingredients.length },
        ingredients: [],
      };

      for (const ing of item.ingredients) {
        if (!ing.name) continue;
        
        let ingredientName = ing.name.trim();
        let qty = 1;
        let unit = ing.unit ? ing.unit.trim() : "unit";
        const rawQty = ing.quantity;

        if (rawQty && !isNaN(parseFloat(rawQty))) {
          qty = parseFloat(rawQty);
        } else {
          // Extract from the name string e.g. "หมูบด 200กรัม" -> "หมูบด", 200, "กรัม"
          const match = ingredientName.match(/^(.*?)\s*(\d+(?:\.\d+)?|\d+\/\d+)\s*(.*?)$/);
          if (match && match[1].trim().length > 0) {
            ingredientName = match[1].trim();
            const numStr = match[2];
            if (numStr.includes('/')) {
              const [num, den] = numStr.split('/');
              qty = parseFloat(num) / parseFloat(den);
            } else {
              qty = parseFloat(numStr);
            }
            unit = match[3] ? match[3].trim() : "unit";
            if (unit === "") unit = "unit"; // Default to unit if completely empty
          }
        }

        const newIngredient: MockIngredient = {
          id: randomUUID(),
          standardDishId: newDishId,
          ingredientName: ingredientName,
          qty: qty,
          unit: unit,
          createdAt: new Date().toISOString(),
        };
        newDish.ingredients.push(newIngredient);
      }

      data.standardDishes.push(newDish);
      count++;
    }

    saveMockData(data);

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("GET /api/recipes/import-json error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
