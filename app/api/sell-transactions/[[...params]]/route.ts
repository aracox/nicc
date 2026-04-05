import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getMockData, saveMockData, MockSellTransaction } from "@/lib/mock-data";
import { v4 as uuidv4 } from "uuid";

// ── Handlers ──────────────────────────────────────────────────────────

async function handleGetTransactions(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.toLowerCase() || "";
  const mockData = getMockData();
  let transactions = mockData.sellTransactions || [];
  if (query) {
    transactions = transactions.filter((tx) =>
      (tx.shopNumber && tx.shopNumber.toLowerCase().includes(query)) ||
      (tx.shopName && tx.shopName.toLowerCase().includes(query)) ||
      (tx.sysBatch && tx.sysBatch.toLowerCase().includes(query)) ||
      (tx.slipNo && tx.slipNo.toLowerCase().includes(query)) ||
      (tx.itemCode && tx.itemCode.toLowerCase().includes(query)) ||
      (tx.itemName && tx.itemName.toLowerCase().includes(query))
    );
  }
  transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json(transactions);
}

async function handleImportCsv(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const text = await file.text();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });

  const HEADER_KEYWORDS = ["sysbatch", "shopnumber", "slipno", "shopname", "itemcode", "itemname", "pricing", "quantity", "total", "date", "time"];
  const firstLineLower = lines[0].toLowerCase();
  const hasHeader = HEADER_KEYWORDS.some((kw) => firstLineLower.includes(kw));
  const dataLines = hasHeader ? lines.slice(1) : lines;
  if (dataLines.length === 0) return NextResponse.json({ error: "No data rows after header" }, { status: 400 });

  const mockData = getMockData();
  let count = 0;

  for (const line of dataLines) {
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    if (parts.length < 11) continue;
    const [sysBatch, shopNumber, slipNo, shopName, itemCode, itemName, pricingStr, quantityStr, totalStr, date, time] = parts.map((p) => p.replace(/^"|"$/g, "").trim());
    const pricing = parseFloat(pricingStr?.replace(/[^0-9.-]+/g, "") || "0");
    const quantity = parseInt(quantityStr?.replace(/[^0-9]+/g, "") || "0", 10);
    const total = parseFloat(totalStr?.replace(/[^0-9.-]+/g, "") || "0");

    let fullIso = new Date().toISOString();
    try {
      if (date && time) {
        const parts = date.split("/");
        if (parts.length === 3) {
          const m = parts[0].padStart(2, "0");
          const d = parts[1].padStart(2, "0");
          const y = parts[2];
          const dObj = new Date(`${y}-${m}-${d}T${time}`);
          if (!isNaN(dObj.getTime())) fullIso = dObj.toISOString();
        }
      }
    } catch { /* ignore */ }

    const transaction: MockSellTransaction = { id: uuidv4(), sysBatch, shopNumber, slipNo, shopName, itemCode, itemName, pricing, quantity, total, date, time, dateTime: fullIso, createdAt: new Date().toISOString() };
    mockData.sellTransactions.push(transaction);
    count++;
  }

  saveMockData(mockData);
  return NextResponse.json({ success: true, count });
}

async function handleSftpPull() {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const mockData = getMockData();
  const count = Math.floor(Math.random() * 5) + 3;
  for (let i = 0; i < count; i++) {
    const shopNum = Math.floor(Math.random() * 1000 + 803000).toString();
    const slipStr = Math.floor(Math.random() * 100000 + 200000).toString();
    const batchId = Math.floor(Math.random() * 1000 + 8000).toString();
    const price = Math.floor(Math.random() * 50) + 40;
    const qty = Math.floor(Math.random() * 3) + 1;
    const total = price * qty;
    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    const isoString = now.toISOString();
    const record: MockSellTransaction = { id: uuidv4(), sysBatch: batchId, shopNumber: shopNum, slipNo: slipStr, shopName: "ร้านค้าสุ่ม", itemCode: `V100324000${Math.floor(Math.random() * 90 + 10)}`, itemName: "สินค้าสุ่ม", pricing: price, quantity: qty, total, date: dateStr, time: timeStr, dateTime: isoString, createdAt: isoString };
    mockData.sellTransactions.push(record);
  }
  saveMockData(mockData);
  return NextResponse.json({ success: true, count });
}

// ── Route exports ─────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments.length === 0) return await handleGetTransactions(request);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("GET /api/sell-transactions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments[0] === "import") return await handleImportCsv(request);
    if (segments[0] === "sftp") return await handleSftpPull();
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("POST /api/sell-transactions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
