import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getMockData, saveMockData, MockMenuItem } from "@/lib/mock-data";

// ────────────────────────────────────────────────
// Category taxonomy (4 categories):
//
//  Main     – rice dishes or primary dishes (ข้าว..., ก๋วยเตี๋ยว..., etc.)
//  Add-On   – protein/meat portions sold without rice, combo sets
//  Other    – extras, sides, packaging that augment an order
//  Delivery – delivery / shipping fee line items
// ────────────────────────────────────────────────
function detectCategory(name: string): string {
  const n = name.trim();
  const lower = n.toLowerCase();

  // 1️⃣ Delivery fee
  if (
    lower === "delivery" ||
    lower.includes("ค่าส่ง") ||
    lower.includes("delivery fee") ||
    lower.includes("ค่าจัดส่ง")
  ) {
    return "Delivery";
  }

  // 1b️⃣ Drink (Beverages)
  if (
    n.includes("น้ำ") ||
    n.includes("ชา") ||
    n.includes("กาแฟ") ||
    n.includes("นม") ||
    n.includes("เบียร์") ||
    n.includes("โซดา") ||
    lower.includes("เป๊ปซี่") ||
    lower.includes("pepsi") ||
    lower.includes("7 up") ||
    lower.includes("เซเว่นอัพ") ||
    lower.includes("มิรินด้า") ||
    lower.includes("สปอนเซอร์") ||
    lower.includes("เครื่องดื่ม") ||
    lower.includes("อเมริกาโน่") ||
    lower.includes("เอสเปสโซ่") ||
    lower.includes("คาปูชิโน่") ||
    lower.includes("มอคค่า") ||
    lower.includes("ลาเต้") ||
    lower.includes("สเลอร์ปี้") ||
    lower.includes("orangina") ||
    lower.includes("beer")
  ) {
    return "Drink";
  }

  // 2️⃣ Add-On (food) — ingredient/topping additions ordered alongside a main dish
  if (
    n.startsWith("เพิ่ม") ||          // เพิ่มไส้, เพิ่มไข่, เพิ่มพิเศษ, …
    n.includes("/เพิ่ม") ||           // ข้าวเปล่า/เพิ่มพิเศษ
    n === "ข้าวเปล่า" ||              // plain rice sold as a side
    lower.includes("extra") ||
    lower.includes("add on") ||
    lower.includes("add-on") ||
    lower.includes("topping")
  ) {
    return "Add-On";
  }

  // 2b️⃣ Other — packaging, containers, non-food surcharges
  if (
    n.includes("ใส่กล่อง") ||
    n.includes("กล่องกลับบ้าน") ||
    n.includes("กล่อง")
  ) {
    return "Other";
  }

  // 3️⃣ Main dish — rice-based or noodle-based primary dishes
  if (
    n.startsWith("ข้าว") ||
    n.startsWith("ก๋วยเตี๋ยว") ||
    n.startsWith("บะหมี่") ||
    n.startsWith("ข้าวต้ม") ||
    n.startsWith("โจ๊ก")
  ) {
    return "Main";
  }

  // 4️⃣ Add-On — standalone protein/meat or combo sets
  if (
    n.includes("เปล่า") ||
    n.includes("รวมทุกอย่าง") ||
    n.includes("รวมพิเศษ") ||
    n.includes("รวม")
  ) {
    return "Add-On";
  }

  // 5️⃣ Default
  return "Add-On";
}

export async function POST(request: NextRequest) {
  try {
    // Auth: only block if a session exists AND the role is not ADMIN.
    // If there is no session (dev mode / no cookie), allow through.
    try {
      const { getSession } = await import("@/lib/auth");
      const session = await getSession();
      if (session && session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    } catch {
      // Cookie API unavailable outside request context — skip auth check
    }

    const { csvText } = await request.json();
    if (!csvText) {
      return NextResponse.json({ error: "No CSV content provided" }, { status: 400 });
    }

    const allLines: string[] = csvText
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);

    if (allLines.length === 0) {
      return NextResponse.json({ error: "CSV file is empty." }, { status: 400 });
    }

    // Auto-detect and skip header row
    const HEADER_KEYWORDS = ["เลขร้านค้า", "ชื่อร้านค้า", "รายการ", "ราคา", "shop", "name", "price", "item"];
    const firstLineLower = allLines[0].toLowerCase();
    const hasHeader = HEADER_KEYWORDS.some((kw) => firstLineLower.includes(kw.toLowerCase()));
    const dataLines: string[] = hasHeader ? allLines.slice(1) : allLines;

    if (dataLines.length === 0) {
      return NextResponse.json({ error: "No data rows found after header." }, { status: 400 });
    }

    const data = getMockData();

    // Build dedup set: "restaurantId|itemName" to prevent duplicate imports
    const existing = new Set<string>(
      data.menuItems.map((item) => `${item.restaurantId}|${item.name.trim().toLowerCase()}`)
    );

    let importedCount = 0;
    let skippedCount = 0;
    const now = new Date().toISOString();

    for (const line of dataLines) {
      const parts = line.split(",");
      if (parts.length < 4) continue;

      const shopNumber = parts[0].trim();

      // Handle item names that may contain commas
      const itemName = parts.length === 4
        ? parts[2].trim()
        : parts.slice(2, parts.length - 1).join(",").trim();

      const priceStr = parts[parts.length - 1].trim();
      const price = parseFloat(priceStr.replace(/[^0-9.-]+/g, ""));

      if (!shopNumber || !itemName) continue;

      // Match restaurant by shop number
      const rest = data.restaurants.find((r) => r.shopNumber === shopNumber);
      if (!rest) {
        skippedCount++;
        continue;
      }

      // Dedup check
      const dedupKey = `${rest.id}|${itemName.toLowerCase()}`;
      if (existing.has(dedupKey)) {
        skippedCount++;
        continue;
      }

      const newItem: MockMenuItem = {
        id: `menu-${crypto.randomUUID()}`,
        restaurantId: rest.id,
        name: itemName,
        category: detectCategory(itemName),
        price: isNaN(price) ? undefined : price,
        createdAt: now,
      };

      data.menuItems.push(newItem);
      existing.add(dedupKey);
      importedCount++;
    }

    saveMockData(data);
    return NextResponse.json(
      { success: true, count: importedCount, skipped: skippedCount },
      { status: 201 }
    );
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
