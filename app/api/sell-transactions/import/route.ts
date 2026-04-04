import { NextResponse } from "next/server";
import { getMockData, saveMockData, MockSellTransaction } from "@/lib/mock-data";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const { csvText } = await request.json();
    
    if (!csvText) {
      return NextResponse.json({ error: "Missing csvText" }, { status: 400 });
    }

    const lines = csvText.split(/\r?\n/).filter((l: string) => l.trim() !== "");
    if (lines.length < 2) {
      return NextResponse.json({ error: "No data rows found" }, { status: 400 });
    }

    // Extract headers from the first line
    const headers = lines[0].split(",").map((c: string) => c.trim().replace(/^"|"$/g, ""));

    let count = 0;
    const mockData = getMockData();

    // Loop through data rows (skip header)
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c: string) => c.trim().replace(/^"|"$/g, ""));
      if (cols.length < headers.length) continue; // Skip incomplete lines

      const record: Record<string, string> = {};
      headers.forEach((h: string, idx: number) => { 
        record[h] = cols[idx]; 
      });

      // Simple CSV split (not handling commas inside quotes)
      const sysBatch = record['SYS_BATCH']?.trim() || 'BATCH-UNKNOWN';
      const shopNumber = record['SHOP_ID']?.trim();
      const slipNo = record['SLIP_NO']?.trim();
      const shopName = record['SHOP_NAMES']?.trim();
      const itemCode = record['ITEM_CODE']?.trim();
      const itemName = record['ITEM_NAMES']?.trim();
      const pricingStr = record['PRICING']?.replace(/,/g, '') || '0';
      const quantityStr = record['QUANTITY']?.replace(/,/g, '') || '0';
      const totalStr = record['TOTALS']?.replace(/,/g, '') || '0';
      const date = record['DATE']?.trim();
      const time = record['TIME']?.trim();
      
      const pricing = parseFloat(pricingStr);
      const quantity = parseInt(quantityStr, 10);
      const total = parseFloat(totalStr);

      if (!shopNumber || !slipNo || !date || !time) {
        continue;
      }
      
      // Attempt to construct full datetime string if possible
      // Example format: 1/1/2025 10:39:50
      let fullIso = new Date().toISOString();
      try {
          const parts = date.split('/');
          if (parts.length === 3) {
             const m = parts[0].padStart(2,'0');
             const d = parts[1].padStart(2,'0');
             const y = parts[2];
             // assuming MM/DD/YYYY, could be DD/MM/YYYY. JS Date handles MM/DD/YYYY better natively.
             const dStr = `${y}-${m}-${d}T${time}`;
             const dObj = new Date(dStr);
             if(!isNaN(dObj.getTime())) fullIso = dObj.toISOString();
          }
      } catch (e) {
         // ignore
      }

      const transaction: MockSellTransaction = {
        id: uuidv4(),
        sysBatch,
        shopNumber,
        slipNo,
        shopName,
        itemCode,
        itemName,
        pricing,
        quantity,
        total,
        date,
        time,
        dateTime: fullIso,
        createdAt: new Date().toISOString(),
      };

      mockData.sellTransactions.push(transaction);
      count++;
    }

    saveMockData(mockData);

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Import CSV Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
