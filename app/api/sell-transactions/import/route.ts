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
    // Expecting columns: Transaction ID,Date/Time,Shop No.,Total Amount,Payment Method,Status
    // e.g. TX001,2026-04-01 10:00:00,803201,150.50,Cash,Completed

    let headersParsed = false;
    let count = 0;

    const mockData = getMockData();

    for (const line of lines) {
      if (!headersParsed) {
        // Skip header if it contains Transaction
        if (line.toLowerCase().includes("transaction") || line.toLowerCase().includes("id")) {
          headersParsed = true;
          continue;
        }
        headersParsed = true;
      }

      // Simple CSV split (not handling commas inside quotes)
      const cols = line.split(",").map((c: string) => c.trim().replace(/^"|"$/g, ""));
      if (cols.length < 5) continue; // Minimal validity

      const [transactionId, dateTime, shopNumber, totalAmountStr, paymentMethod, statusStr] = cols;
      const totalAmount = parseFloat(totalAmountStr) || 0;
      const status = statusStr || "Completed";

      const newTx: MockSellTransaction = {
        id: uuidv4(),
        transactionId,
        shopNumber,
        totalAmount,
        paymentMethod,
        status,
        dateTime,
        createdAt: new Date().toISOString(),
      };

      mockData.sellTransactions.push(newTx);
      count++;
    }

    saveMockData(mockData);

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("Import CSV Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
