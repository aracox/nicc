import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSession } from "@/lib/auth";
import { getMockData, saveMockData, MockMenuItem } from "@/lib/mock-data";

// ── Category detection (from menus/import) ────────────────────────────
function detectCategory(name: string): string {
  const n = name.trim();
  const lower = n.toLowerCase();
  if (lower === "delivery" || lower.includes("ค่าส่ง") || lower.includes("delivery fee") || lower.includes("ค่าจัดส่ง")) return "Delivery";
  if (n.includes("น้ำ") || n.includes("ชา") || n.includes("กาแฟ") || n.includes("นม") || n.includes("เบียร์") || n.includes("โซดา") || lower.includes("เป๊ปซี่") || lower.includes("pepsi") || lower.includes("7 up") || lower.includes("เซเว่นอัพ") || lower.includes("มิรินด้า") || lower.includes("สปอนเซอร์") || lower.includes("เครื่องดื่ม") || lower.includes("อเมริกาโน่") || lower.includes("เอสเปสโซ่") || lower.includes("คาปูชิโน่") || lower.includes("มอคค่า") || lower.includes("ลาเต้") || lower.includes("สเลอร์ปี้") || lower.includes("orangina") || lower.includes("beer")) return "Drink";
  if (n.startsWith("เพิ่ม") || n.includes("/เพิ่ม") || n === "ข้าวเปล่า" || lower.includes("extra") || lower.includes("add on") || lower.includes("add-on") || lower.includes("topping")) return "Add-On";
  if (n.includes("ใส่กล่อง") || n.includes("กล่องกลับบ้าน") || n.includes("กล่อง")) return "Other";
  if (n.startsWith("ข้าว") || n.startsWith("ก๋วยเตี๋ยว") || n.startsWith("บะหมี่") || n.startsWith("ข้าวต้ม") || n.startsWith("โจ๊ก")) return "Main";
  if (n.includes("เปล่า") || n.includes("รวมทุกอย่าง") || n.includes("รวมพิเศษ") || n.includes("รวม")) return "Add-On";
  return "Add-On";
}

// ── Handlers ──────────────────────────────────────────────────────────

async function handleGetMenus(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q");
  const foodCourtId = searchParams.get("foodCourtId");
  const shopId = searchParams.get("shopId");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const category = searchParams.get("category");
  const data = getMockData();
  let filtered = [...data.menuItems];
  if (category) filtered = filtered.filter((m) => m.category === category);
  if (q) { const lower = q.toLowerCase(); filtered = filtered.filter((m) => m.name.toLowerCase().includes(lower) || m.category?.toLowerCase().includes(lower)); }
  if (foodCourtId) filtered = filtered.filter((m) => { const rest = data.restaurants.find((r) => r.id === m.restaurantId); return rest?.foodCourtId === foodCourtId; });
  if (shopId) filtered = filtered.filter((m) => m.restaurantId === shopId);
  if (minPrice) { const min = parseFloat(minPrice); if (!isNaN(min)) filtered = filtered.filter((m) => m.price !== undefined && m.price >= min); }
  if (maxPrice) { const max = parseFloat(maxPrice); if (!isNaN(max)) filtered = filtered.filter((m) => m.price !== undefined && m.price <= max); }
  const result = filtered.map((m) => { const rest = data.restaurants.find((r) => r.id === m.restaurantId); return { ...m, shopNumber: rest?.shopNumber || "-", restaurantName: rest?.name || "-" }; });
  return NextResponse.json(result);
}

async function handleDeleteMenuItem(request: NextRequest, id: string) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = getMockData();
  const initialMenuCount = data.menuItems.length;
  data.menuItems = data.menuItems.filter((item) => item.id !== id);
  if (data.menuItems.length === initialMenuCount) return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  data.menuMappings = data.menuMappings.filter((mapping) => mapping.menuItemId !== id);
  saveMockData(data);
  return NextResponse.json({ success: true });
}

async function handlePatchMenuItem(request: NextRequest, id: string) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const data = getMockData();
  const item = data.menuItems.find((m) => m.id === id);
  if (!item) return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  if (body.category) item.category = body.category;
  if (body.name) item.name = body.name;
  if (body.price !== undefined) item.price = body.price;
  saveMockData(data);
  return NextResponse.json({ success: true, item });
}

async function handleBulkDelete(request: NextRequest) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase();
  const foodCourtId = searchParams.get("foodCourtId");
  const shopId = searchParams.get("shopId");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const data = getMockData();
  const menusToDelete = data.menuItems.filter((item) => {
    if (q && !item.name.toLowerCase().includes(q)) return false;
    if (minPrice && (item.price === undefined || item.price < parseFloat(minPrice))) return false;
    if (maxPrice && (item.price === undefined || item.price > parseFloat(maxPrice))) return false;
    if (shopId) { if (item.restaurantId !== shopId) return false; }
    else if (foodCourtId) { const restaurantMatches = data.restaurants.find((r) => r.id === item.restaurantId && r.foodCourtId === foodCourtId); if (!restaurantMatches) return false; }
    return true;
  });
  const idsToDelete = new Set(menusToDelete.map((m) => m.id));
  if (idsToDelete.size === 0) return NextResponse.json({ success: true, count: 0 });
  data.menuItems = data.menuItems.filter((item) => !idsToDelete.has(item.id));
  data.menuMappings = data.menuMappings.filter((mapping) => !idsToDelete.has(mapping.menuItemId));
  saveMockData(data);
  return NextResponse.json({ success: true, count: idsToDelete.size });
}

async function handleImport(request: NextRequest) {
  try {
    const { getSession: gs } = await import("@/lib/auth");
    const session = await gs();
    if (session && session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  } catch { /* skip auth in dev */ }

  const { csvText } = await request.json();
  if (!csvText) return NextResponse.json({ error: "No CSV content provided" }, { status: 400 });

  const allLines: string[] = csvText.split("\n").map((line: string) => line.trim()).filter((line: string) => line.length > 0);
  if (allLines.length === 0) return NextResponse.json({ error: "CSV file is empty." }, { status: 400 });

  const HEADER_KEYWORDS = ["เลขร้านค้า", "ชื่อร้านค้า", "รายการ", "ราคา", "shop", "name", "price", "item"];
  const firstLineLower = allLines[0].toLowerCase();
  const hasHeader = HEADER_KEYWORDS.some((kw) => firstLineLower.includes(kw.toLowerCase()));
  const dataLines: string[] = hasHeader ? allLines.slice(1) : allLines;
  if (dataLines.length === 0) return NextResponse.json({ error: "No data rows found after header." }, { status: 400 });

  const data = getMockData();
  const existing = new Set<string>(data.menuItems.map((item) => `${item.restaurantId}|${item.name.trim().toLowerCase()}`));
  let importedCount = 0;
  let skippedCount = 0;
  const now = new Date().toISOString();

  for (const line of dataLines) {
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    if (parts.length < 7) continue;
    const shopNumber = parts[0].replace(/^"|"$/g, "").trim();
    const itemCode = parts[1].replace(/^"|"$/g, "").trim();
    const itemButton = parts[2].replace(/^"|"$/g, "").trim();
    const actFlag = parts[3].replace(/^"|"$/g, "").trim().toUpperCase();
    const itemName = parts[5].replace(/^"|"$/g, "").trim();
    const priceStr = parts[6].replace(/^"|"$/g, "").trim();
    const price = parseFloat(priceStr.replace(/[^0-9.-]+/g, ""));
    if (actFlag === "N") { skippedCount++; continue; }
    if (!shopNumber || !itemName) continue;
    const rest = data.restaurants.find((r) => r.shopNumber === shopNumber);
    if (!rest) { skippedCount++; continue; }
    const dedupKey = `${rest.id}|${itemName.toLowerCase()}`;
    if (existing.has(dedupKey)) { skippedCount++; continue; }
    const newItem: MockMenuItem = { id: `menu-${crypto.randomUUID()}`, restaurantId: rest.id, name: itemName, itemCode: itemCode || undefined, itemButton: itemButton || undefined, actFlag: actFlag || "Y", category: detectCategory(itemName), price: isNaN(price) ? undefined : price, createdAt: now };
    data.menuItems.push(newItem);
    existing.add(dedupKey);
    importedCount++;
  }

  saveMockData(data);
  return NextResponse.json({ success: true, count: importedCount, skipped: skippedCount }, { status: 201 });
}

// ── Route exports ─────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments.length === 0) return await handleGetMenus(request);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("GET /api/menus error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments.length === 0 || segments[0] === "import") return await handleImport(request);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("POST /api/menus error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments.length === 1) return await handlePatchMenuItem(request, segments[0]);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("PATCH /api/menus error:", error);
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
    if (segments.length === 1) return await handleDeleteMenuItem(request, segments[0]);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("DELETE /api/menus error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
