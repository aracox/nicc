import { NextResponse } from "next/server";
import { getMockData, saveMockData, MockSellTransaction } from "@/lib/mock-data";
import { v4 as uuidv4 } from "uuid";

// Simulated shops to pick from
const MOCK_SHOPS = ["803201", "803202", "803203", "804101", "805500"];
const PAYMENT_METHODS = ["PromptPay", "Credit Card", "Cash", "TrueMoney"];

export async function POST() {
  try {
    // Simulate sFTP delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const mockData = getMockData();
    
    // Generate 3-8 random transactions to simulate pulled data
    const count = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < count; i++) {
        const shopNum = Math.floor(Math.random() * 1000 + 803000).toString();
        const slipStr = Math.floor(Math.random() * 100000 + 200000).toString();
        const batchId = Math.floor(Math.random() * 1000 + 8000).toString();
        const price = Math.floor(Math.random() * 50) + 40;
        const qty = Math.floor(Math.random() * 3) + 1;
        const total = price * qty;
        
        // basic date generation
        const now = new Date();
        const dateStr = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
        const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
        const isoString = now.toISOString();

        const record: MockSellTransaction = {
          id: uuidv4(),
          sysBatch: batchId,
          shopNumber: shopNum,
          slipNo: slipStr,
          shopName: "ร้านค้าสุ่ม",
          itemCode: `V100324000${Math.floor(Math.random() * 90 + 10)}`,
          itemName: "สินค้าสุ่ม",
          pricing: price,
          quantity: qty,
          total: total,
          date: dateStr,
          time: timeStr,
          dateTime: isoString,
          createdAt: isoString,
        };
        
        mockData.sellTransactions.push(record);
    }

    saveMockData(mockData);

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("sFTP Pull Error:", error);
    return NextResponse.json({ error: "Failed to pull from sFTP" }, { status: 500 });
  }
}
