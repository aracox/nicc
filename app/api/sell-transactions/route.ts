import { NextResponse } from "next/server";
import { getMockData } from "@/lib/mock-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.toLowerCase() || "";
  
  const mockData = getMockData();
  let transactions = mockData.sellTransactions || [];

  if (query) {
    transactions = transactions.filter(
      (tx) =>
        (tx.shopNumber && tx.shopNumber.toLowerCase().includes(query)) ||
        (tx.shopName && tx.shopName.toLowerCase().includes(query)) ||
        (tx.sysBatch && tx.sysBatch.toLowerCase().includes(query)) ||
        (tx.slipNo && tx.slipNo.toLowerCase().includes(query)) ||
        (tx.itemCode && tx.itemCode.toLowerCase().includes(query)) ||
        (tx.itemName && tx.itemName.toLowerCase().includes(query))
    );
  }

  // Sort strictly by newest first using createdAt
  transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(transactions);
}
