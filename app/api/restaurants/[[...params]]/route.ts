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

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  shopNumber: z.string().min(1).optional(),
  customerNo: z.string().min(1).optional(),
  foodCourtId: z.string().optional(),
  status: z.enum(["ONBOARDED", "PENDING", "INACTIVE"]).optional(),
});

// ── Handlers ──────────────────────────────────────────────────────────

async function handleGetRestaurants(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const foodCourtId = searchParams.get("foodCourtId");
  const q = searchParams.get("q");
  const data = getMockData();
  let filtered = [...data.restaurants];
  if (status) filtered = filtered.filter((r) => r.status === status);
  if (foodCourtId) filtered = filtered.filter((r) => r.foodCourtId === foodCourtId);
  if (q) { const lower = q.toLowerCase(); filtered = filtered.filter((r) => r.name.toLowerCase().includes(lower) || r.shopNumber?.toLowerCase().includes(lower) || r.customerNo?.toLowerCase().includes(lower)); }
  const result = filtered.map((r) => ({ ...r, _count: { menuItems: data.menuItems.filter((mi) => mi.restaurantId === r.id).length, uploads: data.uploads.filter((u) => u.restaurantId === r.id).length, insightReports: data.insightReports.filter((ir) => ir.restaurantId === r.id).length } }));
  return NextResponse.json(result);
}

async function handleGetRestaurantById(id: string) {
  const data = getMockData();
  const restaurant = data.restaurants.find((r) => r.id === id);
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  const foodCourt = data.foodCourts.find((fc) => fc.id === restaurant.foodCourtId);
  const rMenuItems = data.menuItems.filter((mi) => mi.restaurantId === id);
  const rUploads = data.uploads.filter((u) => u.restaurantId === id).map(({ restaurant: _r, ...rest }) => rest);
  const rMappings = data.menuMappings.filter((m) => m.restaurantId === id);
  const rReports = data.insightReports.filter((ir) => ir.restaurantId === id).map(({ restaurant: _r, ...rest }) => rest);
  return NextResponse.json({ ...restaurant, foodCourtName: foodCourt?.name || "Unknown", menuItems: rMenuItems, uploads: rUploads, menuMappings: rMappings, insightReports: rReports });
}

async function handleCreateRestaurant(request: NextRequest) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  const data = getMockData();
  const newRestaurant = { id: `rest-${String(data.restaurants.length + 1).padStart(3, "0")}`, ...parsed.data, status: parsed.data.status ?? ("PENDING" as const), createdAt: new Date().toISOString() };
  data.restaurants.push(newRestaurant as any);
  saveMockData(data);
  return NextResponse.json(newRestaurant, { status: 201 });
}

async function handlePatchRestaurant(request: NextRequest, id: string) {
  const session = await (await import("@/lib/auth")).getSession();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  const data = getMockData();
  const idx = data.restaurants.findIndex((r) => r.id === id);
  if (idx === -1) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  data.restaurants[idx] = { ...data.restaurants[idx], ...parsed.data };
  saveMockData(data);
  return NextResponse.json(data.restaurants[idx]);
}

async function handleImportRestaurants(request: NextRequest) {
  const session = await (await import("@/lib/auth")).getSession();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  const content = await file.text();
  const foodCourtName = file.name.replace(".csv", "");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const rows = lines.slice(1);
  const data = getMockData();

  let fc = data.foodCourts.find((f) => f.name === foodCourtName);
  if (!fc) {
    fc = { id: `fc-${String(data.foodCourts.length + 1).padStart(3, "0")}`, name: foodCourtName, createdAt: new Date().toISOString() };
    data.foodCourts.push(fc);
  }
  const fcId = fc.id;

  let insertedCount = 0;
  const selectedByShop = new Map<string, { shopNumber: string; shopName: string; customerNo: string; actFlag: string }>();
  rows.forEach((line) => {
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    if (parts.length < 3) return;
    const shopNumber = parts[0].trim().replace(/^"|"$/g, "");
    const shopName = parts[1].trim().replace(/^"|"$/g, "");
    const customerNo = parts[2].trim().replace(/^"|"$/g, "");
    const actFlag = parts[3]?.trim().replace(/^"|"$/g, "") || "Y";
    if (!shopNumber || !shopName) return;
    const normalizedActFlag = actFlag.toUpperCase();
    if (normalizedActFlag !== "Y") return;
    const candidate = { shopNumber, shopName, customerNo, actFlag: normalizedActFlag };
    const prev = selectedByShop.get(shopNumber);
    if (!prev) { selectedByShop.set(shopNumber, candidate); return; }
    const prevScore = prev.actFlag === "Y" ? 1 : 0;
    const nextScore = candidate.actFlag === "Y" ? 1 : 0;
    if (nextScore >= prevScore) selectedByShop.set(shopNumber, candidate);
  });

  data.restaurants = data.restaurants.filter((r) => r.foodCourtId !== fcId);
  Array.from(selectedByShop.values()).forEach((row, idx) => {
    data.restaurants.push({ id: `rest-${fcId}-${String(idx + 1).padStart(3, "0")}`, foodCourtId: fcId, name: row.shopName, shopNumber: row.shopNumber, customerNo: row.customerNo, actFlag: row.actFlag, status: "ONBOARDED", createdAt: new Date().toISOString() });
    insertedCount++;
  });

  saveMockData(data);
  return NextResponse.json({ success: true, foodCourtName, count: insertedCount });
}

// ── Route exports ─────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments.length === 0) return await handleGetRestaurants(request);
    if (segments.length === 1) return await handleGetRestaurantById(segments[0]);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("GET /api/restaurants error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments.length === 0) return await handleCreateRestaurant(request);
    if (segments[0] === "import") return await handleImportRestaurants(request);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("POST /api/restaurants error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments.length === 1) return await handlePatchRestaurant(request, segments[0]);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("PATCH /api/restaurants error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
