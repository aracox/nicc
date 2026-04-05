import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSession } from "@/lib/auth";
import { getMockData, saveMockData, MockMapping } from "@/lib/mock-data";
import { randomUUID } from "crypto";

// ── Handlers ──────────────────────────────────────────────────────────

/** POST /api/mappings → create mapping for a menu name */
async function handleCreateMapping(request: NextRequest) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { menuName, standardDishId } = await request.json();
  if (!menuName || !standardDishId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const data = getMockData();
  const standardDish = data.standardDishes.find((d) => d.id === standardDishId);
  if (!standardDish) return NextResponse.json({ error: "Standard dish not found" }, { status: 404 });

  const unmappedItems = data.menuItems.filter(
    (m) => m.name === menuName && !data.menuMappings.some((mapping) => mapping.menuItemId === m.id)
  );
  if (unmappedItems.length === 0) return NextResponse.json({ error: "No unmapped items found with that name" }, { status: 400 });

  const now = new Date().toISOString();
  const newMappings: MockMapping[] = unmappedItems.map((menuItem) => ({
    id: randomUUID(),
    restaurantId: menuItem.restaurantId,
    menuItemId: menuItem.id,
    standardDishId: standardDish.id,
    portionMultiplier: 1,
    createdAt: now,
    menuItem: { id: menuItem.id, restaurantId: menuItem.restaurantId, name: menuItem.name, category: menuItem.category, createdAt: menuItem.createdAt },
    standardDish: { id: standardDish.id, name: standardDish.name, cuisineType: standardDish.cuisineType || "Thai", createdAt: standardDish.createdAt || now },
  }));

  data.menuMappings.push(...newMappings);
  saveMockData(data);
  return NextResponse.json({ success: true, count: newMappings.length }, { status: 201 });
}

/** POST /api/mappings/auto-map → auto-map unmapped items by exact name */
async function handleAutoMap(request: NextRequest) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = getMockData();
  let newMappingCount = 0;
  const mappedMenuIds = new Set(data.menuMappings.map((m) => m.menuItemId));
  const unmappedItems = data.menuItems.filter((m) => !mappedMenuIds.has(m.id));
  const distinctUnmappedNames = new Set(unmappedItems.map((m) => m.name));

  for (const menuName of Array.from(distinctUnmappedNames)) {
    const cleanMenuName = menuName.trim().toLowerCase();
    const exactMatchDish = data.standardDishes.find((dish) => dish.name.trim().toLowerCase() === cleanMenuName);
    if (exactMatchDish) {
      const matchingItems = unmappedItems.filter((m) => m.name === menuName);
      for (const item of matchingItems) {
        const newMapping: MockMapping = {
          id: randomUUID(), restaurantId: item.restaurantId, menuItemId: item.id, standardDishId: exactMatchDish.id, portionMultiplier: 1, createdAt: new Date().toISOString(),
          menuItem: { id: item.id, restaurantId: item.restaurantId, name: item.name, category: item.category, createdAt: item.createdAt },
          standardDish: { id: exactMatchDish.id, name: exactMatchDish.name, cuisineType: "Thai", createdAt: new Date().toISOString() },
        };
        data.menuMappings.push(newMapping);
        mappedMenuIds.add(item.id);
        newMappingCount++;
      }
    }
  }

  if (newMappingCount > 0) saveMockData(data);
  return NextResponse.json({ success: true, count: newMappingCount });
}

/** GET /api/mappings/mapped-menu → list grouped mapped items */
async function handleGetMappedMenu() {
  const data = getMockData();
  const grouped = new Map();
  for (const mapping of data.menuMappings) {
    const key = mapping.menuItem.name + "|" + mapping.standardDishId;
    if (!grouped.has(key)) {
      grouped.set(key, { id: key, menuName: mapping.menuItem.name, standardDishId: mapping.standardDishId, standardDishName: mapping.standardDish.name, restaurantCount: 1, mappedAt: mapping.createdAt });
    } else {
      const existing = grouped.get(key);
      existing.restaurantCount += 1;
      if (new Date(mapping.createdAt) > new Date(existing.mappedAt)) existing.mappedAt = mapping.createdAt;
    }
  }
  return NextResponse.json(Array.from(grouped.values()).sort((a, b) => new Date(b.mappedAt).getTime() - new Date(a.mappedAt).getTime()));
}

/** GET /api/mappings/unmapped-menu → list grouped unmapped items */
async function handleGetUnmappedMenu() {
  const data = getMockData();
  const mappedIds = new Set(data.menuMappings.map((m) => m.menuItemId));
  const unmappedItems = data.menuItems.filter((item) => !mappedIds.has(item.id));
  const grouped = new Map();
  for (const item of unmappedItems) {
    if (!grouped.has(item.name)) {
      grouped.set(item.name, { id: item.name, name: item.name, category: item.category, restaurantCount: 1, createdAt: item.createdAt });
    } else {
      const existing = grouped.get(item.name);
      existing.restaurantCount += 1;
      if (new Date(item.createdAt) < new Date(existing.createdAt)) existing.createdAt = item.createdAt;
    }
  }
  return NextResponse.json(Array.from(grouped.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
}

/** PUT /api/mappings/bulk → bulk-update mappings by menu name */
async function handleBulkUpdate(request: NextRequest) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { menuName, standardDishId } = await request.json();
  if (!menuName || !standardDishId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const data = getMockData();
  const standardDish = data.standardDishes.find((d) => d.id === standardDishId);
  if (!standardDish) return NextResponse.json({ error: "Standard dish not found" }, { status: 404 });

  let updatedCount = 0;
  data.menuMappings = data.menuMappings.map((mapping) => {
    if (mapping.menuItem.name === menuName) {
      updatedCount++;
      return { ...mapping, standardDishId: standardDish.id, standardDish: { id: standardDish.id, name: standardDish.name, cuisineType: standardDish.cuisineType || "Thai", createdAt: standardDish.createdAt || new Date().toISOString() } };
    }
    return mapping;
  });

  if (updatedCount === 0) return NextResponse.json({ error: "No mappings found with that name" }, { status: 404 });
  saveMockData(data);
  return NextResponse.json({ success: true, count: updatedCount });
}

/** DELETE /api/mappings/bulk → bulk-delete mappings by menu name */
async function handleBulkDelete(request: NextRequest) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const menuName = searchParams.get("menuName");
  if (!menuName) return NextResponse.json({ error: "Missing menuName parameter" }, { status: 400 });

  const data = getMockData();
  const initialLength = data.menuMappings.length;
  data.menuMappings = data.menuMappings.filter((m) => m.menuItem.name !== menuName);
  saveMockData(data);
  return NextResponse.json({ success: true, deletedCount: initialLength - data.menuMappings.length });
}

// ── Route exports ─────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments[0] === "mapped-menu") return await handleGetMappedMenu();
    if (segments[0] === "unmapped-menu") return await handleGetUnmappedMenu();
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("GET /api/mappings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments.length === 0) return await handleCreateMapping(request);
    if (segments[0] === "auto-map") return await handleAutoMap(request);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("POST /api/mappings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments[0] === "bulk") return await handleBulkUpdate(request);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("PUT /api/mappings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments[0] === "bulk") return await handleBulkDelete(request);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("DELETE /api/mappings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
