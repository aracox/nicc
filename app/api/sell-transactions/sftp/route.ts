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
    const numToGenerate = Math.floor(Math.random() * 6) + 3;
    
    for (let i = 0; i < numToGenerate; i++) {
        const id = `SFTP-${Math.floor(Math.random() * 1000000).toString().padStart(6, "0")}`;
        const shop = MOCK_SHOPS[Math.floor(Math.random() * MOCK_SHOPS.length)];
        const amount = Math.floor(Math.random() * 500) + 50; 
        const method = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
        
        const now = new Date();
        // Give it a slightly older dateTime to look like a past transaction just pulled
        const txDate = new Date(now.getTime() - Math.floor(Math.random() * 86400000)); 

        const newTx: MockSellTransaction = {
            id: uuidv4(),
            transactionId: id,
            shopNumber: shop,
            totalAmount: amount,
            paymentMethod: method,
            status: "Completed",
            dateTime: txDate.toISOString().replace("T", " ").substring(0, 19), // YYYY-MM-DD HH:MM:SS
            createdAt: now.toISOString()
        };
        
        mockData.sellTransactions.push(newTx);
    }

    saveMockData(mockData);

    return NextResponse.json({ success: true, count: numToGenerate });
  } catch (error) {
    console.error("sFTP Pull Error:", error);
    return NextResponse.json({ error: "Failed to pull from sFTP" }, { status: 500 });
  }
}
