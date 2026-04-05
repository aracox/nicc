import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSession } from "@/lib/auth";
import { getMockData, saveMockData, MockStandardDish, MockIngredient } from "@/lib/mock-data";
import { randomUUID } from "crypto";

// ── Handlers ──────────────────────────────────────────────────────────

async function handleGetRecipes(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q");
  const data = getMockData();
  let recipes = data.standardDishes;
  if (q) recipes = recipes.filter((dish) => dish.name.toLowerCase().includes(q.toLowerCase()));
  return NextResponse.json(recipes);
}

async function handleDeleteRecipe(id: string) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!id) return NextResponse.json({ error: "Missing recipe ID" }, { status: 400 });
  const data = getMockData();
  const dishIndex = data.standardDishes.findIndex((s) => s.id === id);
  if (dishIndex === -1) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  data.standardDishes.splice(dishIndex, 1);
  data.menuMappings = data.menuMappings.filter((mapping) => mapping.standardDishId !== id);
  saveMockData(data);
  return NextResponse.json({ success: true });
}

async function handleUpdateRecipe(request: NextRequest, id: string) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!id) return NextResponse.json({ error: "Missing recipe ID" }, { status: 400 });
  const body = await request.json();
  const { name, cuisineType, ingredients } = body as { name: string; cuisineType: string; ingredients: { ingredientName: string; qty: number; unit: string }[] };
  if (!name || !cuisineType || !Array.isArray(ingredients)) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const data = getMockData();
  const dishIndex = data.standardDishes.findIndex((s) => s.id === id);
  if (dishIndex === -1) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  const now = new Date().toISOString();
  const updatedIngredients = ingredients.map((ing, idx) => ({ id: `ing-edit-${id}-${idx}-${Date.now()}`, standardDishId: id, ingredientName: ing.ingredientName, qty: ing.qty, unit: ing.unit, createdAt: now }));
  data.standardDishes[dishIndex] = { ...data.standardDishes[dishIndex], name, cuisineType, ingredients: updatedIngredients, _count: { ingredients: updatedIngredients.length } };
  saveMockData(data);
  return NextResponse.json(data.standardDishes[dishIndex]);
}

async function handleImportJson(request: NextRequest) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { jsonText } = body;
  if (!jsonText) return NextResponse.json({ error: "No JSON data provided" }, { status: 400 });
  const parsedData = JSON.parse(jsonText);
  if (!Array.isArray(parsedData)) return NextResponse.json({ error: "Invalid JSON format: Expected an array" }, { status: 400 });
  const data = getMockData();
  let count = 0;
  for (const item of parsedData) {
    if (!item.name || !item.ingredients) continue;
    if (item.name.includes("วิธีทำ")) continue;
    const parsedName = item.name.replace(/\s*\(.*?\)/g, "").replace(/[\u{1F300}-\u{1F9FF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/gu, "").replace(/["""]/g, "").trim();
    const existingDish = data.standardDishes.find((d) => d.name === parsedName);
    if (existingDish) continue;
    const newDishId = randomUUID();
    const newDish: MockStandardDish = { id: newDishId, name: parsedName, cuisineType: "Thai", createdAt: new Date().toISOString(), _count: { ingredients: item.ingredients.length }, ingredients: [] };
    for (const ing of item.ingredients) {
      if (!ing.name) continue;
      const ingredientName = ing.name.trim();
      const qty = ing.quantity && !isNaN(parseFloat(ing.quantity)) ? parseFloat(ing.quantity) : 1;
      const unit = ing.unit ? ing.unit.trim() : "unit";
      const newIngredient: MockIngredient = { id: randomUUID(), standardDishId: newDishId, ingredientName, qty, unit, createdAt: new Date().toISOString() };
      newDish.ingredients.push(newIngredient);
    }
    data.standardDishes.push(newDish);
    count++;
  }
  saveMockData(data);
  return NextResponse.json({ success: true, count });
}

// ── Route exports ─────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments.length === 0) return await handleGetRecipes(request);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("GET /api/recipes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments[0] === "import-json") return await handleImportJson(request);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("POST /api/recipes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments.length === 1) return await handleUpdateRecipe(request, segments[0]);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("PUT /api/recipes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments.length === 1) return await handleDeleteRecipe(segments[0]);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("DELETE /api/recipes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
