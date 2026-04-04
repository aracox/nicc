import { NextRequest, NextResponse } from "next/server";
import { getMockData, saveMockData } from "@/lib/mock-data";

export async function POST(request: NextRequest) {
  try {
    const session = await (await import("@/lib/auth")).getSession();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const content = await file.text();
    const fileName = file.name;
    const foodCourtName = fileName.replace(".csv", "");

    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    const headers = lines[0].split(",");
    const rows = lines.slice(1);

    const data = getMockData();

    // 1. Create or reuse Food Court
    let fc = data.foodCourts.find((f) => f.name === foodCourtName);
    if (!fc) {
      fc = {
        id: `fc-${String(data.foodCourts.length + 1).padStart(3, "0")}`,
        name: foodCourtName,
        createdAt: new Date().toISOString(),
      };
      data.foodCourts.push(fc);
    }
    const fcId = fc.id;

    // 2. Parse Restaurants and pick one row per shop number.
    // Rule: prefer Act Flag = Y. If same flag, keep latest row in the file.
    let insertedCount = 0;
    const selectedByShop = new Map<
      string,
      { shopNumber: string; shopName: string; customerNo: string; actFlag: string }
    >();

    rows.forEach((line) => {
      // Robust CSV split ignoring commas inside quotes
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (parts.length < 3) return;

      const shopNumber = parts[0].trim().replace(/^"|"$/g, "");
      const shopName = parts[1].trim().replace(/^"|"$/g, "");
      const customerNo = parts[2].trim().replace(/^"|"$/g, "");
      const actFlag = parts[3]?.trim().replace(/^"|"$/g, "") || "Y";

      if (!shopNumber || !shopName) return;
      const normalizedActFlag = actFlag.toUpperCase();
      if (normalizedActFlag !== "Y") return;
      const candidate = {
        shopNumber,
        shopName,
        customerNo,
        actFlag: normalizedActFlag || "Y",
      };

      const prev = selectedByShop.get(shopNumber);
      if (!prev) {
        selectedByShop.set(shopNumber, candidate);
        return;
      }

      const prevScore = prev.actFlag === "Y" ? 1 : 0;
      const nextScore = candidate.actFlag === "Y" ? 1 : 0;
      if (nextScore > prevScore) {
        selectedByShop.set(shopNumber, candidate);
      } else if (nextScore === prevScore) {
        selectedByShop.set(shopNumber, candidate);
      }
    });

    // Replace restaurants in this food court to keep it in sync with latest import file
    data.restaurants = data.restaurants.filter((r) => r.foodCourtId !== fcId);

    Array.from(selectedByShop.values()).forEach((row, idx) => {
      data.restaurants.push({
        id: `rest-${fcId}-${String(idx + 1).padStart(3, "0")}`,
        foodCourtId: fcId,
        name: row.shopName,
        shopNumber: row.shopNumber,
        customerNo: row.customerNo,
        actFlag: row.actFlag,
        status: "ONBOARDED",
        createdAt: new Date().toISOString(),
      });
      insertedCount++;
    });

    // 3. Save to JSON store
    saveMockData(data);

    return NextResponse.json({ success: true, foodCourtName, count: insertedCount });
  } catch (error) {
    console.error("CSV Import error:", error);
    return NextResponse.json({ error: "Failed to import CSV" }, { status: 500 });
  }
}
