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

    // 1. Create Food Court
    const fcId = `fc-${String(data.foodCourts.length + 1).padStart(3, "0")}`;
    data.foodCourts.push({
      id: fcId,
      name: foodCourtName,
      createdAt: new Date().toISOString(),
    });

    // 2. Parse Restaurants
    let insertedCount = 0;
    const seenShopNumbers = new Set<string>();

    rows.forEach((line, idx) => {
      // Robust CSV split ignoring commas inside quotes
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (parts.length < 3) return;

      const shopNumber = parts[0].trim().replace(/^"|"$/g, "");
      const shopName = parts[1].trim().replace(/^"|"$/g, "");
      const customerNo = parts[2].trim().replace(/^"|"$/g, "");
      const actFlag = parts[3]?.trim().replace(/^"|"$/g, "") || "Y";

      if (actFlag.toUpperCase() === "N") {
        return; // Skip if Act Flag is 'N'
      }

      if (seenShopNumbers.has(shopNumber)) {
        return; // Skip duplicate shop numbers
      }
      seenShopNumbers.add(shopNumber);

      data.restaurants.push({
        id: `rest-${fcId}-${String(idx + 1).padStart(3, "0")}`,
        foodCourtId: fcId,
        name: shopName,
        shopNumber,
        customerNo,
        actFlag: actFlag.toUpperCase(),
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
