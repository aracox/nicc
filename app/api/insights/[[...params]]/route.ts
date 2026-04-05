import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getMockData, saveMockData } from "@/lib/mock-data";

// ── Types for insights/report ──────────────────────────────────────────
type Confidence = "HIGH" | "MEDIUM" | "LOW";
type Priority = "HIGH" | "MEDIUM" | "LOW";

interface InsightRecommendation {
  priority: Priority;
  action: string;
  reason: string;
  expectedImpact: string;
  confidence: Confidence;
}

function isCodeLike(value: string) {
  return /^[A-Z]\d{5,}$/i.test(value) || /^[VP]\d{5,}$/i.test(value);
}

function parseDateKey(raw: string) {
  const v = (raw || "").trim();
  const parts = v.split("/");
  if (parts.length !== 3) return null;
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  const y = Number(parts[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(y)) return null;
  let mm = a;
  let dd = b;
  if (a > 12) { dd = a; mm = b; }
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || y < 1900) return null;
  return `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

function toDayIndex(key: string) { return Math.floor(Date.parse(`${key}T00:00:00Z`) / 86400000); }
function toDateKey(dayIndex: number) { return new Date(dayIndex * 86400000).toISOString().slice(0, 10); }
function safePct(current: number, previous: number) { if (previous === 0) return current === 0 ? 0 : 100; return ((current - previous) / previous) * 100; }
function confidenceFromScore(score: number): Confidence { if (score >= 95) return "HIGH"; if (score >= 85) return "MEDIUM"; return "LOW"; }
function formatPct(value: number) { return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`; }

// ── Handlers ──────────────────────────────────────────────────────────

async function handleGetInsights(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const restaurantId = searchParams.get("restaurantId");
  const data = getMockData();
  let filtered = [...data.insightReports];
  if (restaurantId) filtered = filtered.filter((ir) => ir.restaurantId === restaurantId);
  const result = filtered.map((ir) => {
    const restaurant = data.restaurants.find((r) => r.id === ir.restaurantId);
    return { ...ir, restaurant: restaurant ? { id: restaurant.id, name: restaurant.name } : { id: ir.restaurantId, name: "Unknown" } };
  });
  return NextResponse.json(result);
}

async function handlePublishInsight(id: string) {
  const data = getMockData();
  const idx = data.insightReports.findIndex((r) => r.id === id);
  if (idx === -1) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  data.insightReports[idx].status = "PUBLISHED";
  saveMockData(data);
  return NextResponse.json(data.insightReports[idx]);
}

async function handleGetReport(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const requestedStart = searchParams.get("startDate") || "";
  const requestedEnd = searchParams.get("endDate") || "";
  const shopNumberFilter = (searchParams.get("shopNumber") || "").trim();
  const comparePrevious = (searchParams.get("compare") || "true") !== "false";

  const data = getMockData();

  const menuNameByCode = new Map<string, string>();
  for (const menu of data.menuItems) {
    const code = menu.itemCode?.trim();
    const name = menu.name?.trim();
    if (code && name && !menuNameByCode.has(code)) menuNameByCode.set(code, name);
  }

  const shopNameByNumber = new Map<string, string>();
  for (const shop of data.restaurants) {
    if (shop.shopNumber && shop.name) shopNameByNumber.set(shop.shopNumber, shop.name);
  }

  type TxRow = { dateKey: string; dayIndex: number; hour: number; shopNumber: string; shopName: string; itemLabel: string; revenue: number; qty: number; criticalMissing: number };
  const prepared: TxRow[] = [];
  let maxDayIndex = -Infinity;

  for (const tx of data.sellTransactions) {
    const dateKey = parseDateKey(tx.date || "");
    if (!dateKey) continue;
    const dayIndex = toDayIndex(dateKey);
    if (!Number.isFinite(dayIndex)) continue;
    if (dayIndex > maxDayIndex) maxDayIndex = dayIndex;
    const hourRaw = Number((tx.time || "").split(":")[0]);
    const hour = Number.isFinite(hourRaw) ? Math.max(0, Math.min(23, hourRaw)) : 0;
    const shopNumber = (tx.shopNumber || "").trim();
    const shopName = (tx.shopName || "").trim() || shopNameByNumber.get(shopNumber) || shopNumber || "Unknown Shop";
    const rawItemName = (tx.itemName || "").trim();
    const code = (tx.itemCode || "").trim();
    const itemLabel = rawItemName && !isCodeLike(rawItemName) ? rawItemName : code && !isCodeLike(code) ? code : code ? (menuNameByCode.get(code) ?? "Unknown Item") : "Unknown Item";
    const revenue = Number(tx.total || 0);
    const qty = Number(tx.quantity || 0);
    let criticalMissing = 0;
    if (!shopNumber) criticalMissing += 1;
    if (!tx.itemCode) criticalMissing += 1;
    if (!tx.itemName) criticalMissing += 1;
    if (!tx.total && tx.total !== 0) criticalMissing += 1;
    if (!tx.date) criticalMissing += 1;
    if (!tx.time) criticalMissing += 1;
    prepared.push({ dateKey, dayIndex, hour, shopNumber, shopName, itemLabel, revenue, qty, criticalMissing });
  }

  const emptyResponse = {
    filters: { startDate: "", endDate: "", shopNumber: shopNumberFilter, compare: comparePrevious },
    summary: { revenue: 0, orders: 0, itemsSold: 0, aov: 0, revenueDeltaPct: 0, ordersDeltaPct: 0, itemsDeltaPct: 0, aovDeltaPct: 0, confidence: "LOW" as Confidence },
    executive: { highlights: [] as string[] },
    charts: { dailyRevenue: [] as { date: string; current: number; previous: number }[], ordersByHour: [] as { hour: string; orders: number }[], weekdayPerformance: [] as { day: string; revenue: number }[], topMenus: [] as { label: string; qty: number; revenue: number }[], menuMix: [] as { label: string; value: number }[], risingMenus: [] as { label: string; delta: number }[], decliningMenus: [] as { label: string; delta: number }[], shopComparison: [] as { shopNumber: string; shopName: string; revenue: number; orders: number; aov: number; dataQuality: number }[] },
    dataQuality: { score: 0, missingCritical: 0, missingByField: [] as { field: string; missing: number }[], confidence: "LOW" as Confidence },
    recommendations: [] as InsightRecommendation[],
  };

  if (!Number.isFinite(maxDayIndex)) return NextResponse.json(emptyResponse);

  let endDay = maxDayIndex;
  let startDay = maxDayIndex - 29;
  if (requestedStart) { const idx = toDayIndex(requestedStart); if (Number.isFinite(idx)) startDay = idx; }
  if (requestedEnd) { const idx = toDayIndex(requestedEnd); if (Number.isFinite(idx)) endDay = idx; }
  if (startDay > endDay) { const t = startDay; startDay = endDay; endDay = t; }

  const days = endDay - startDay + 1;
  const prevEnd = startDay - 1;
  const prevStart = prevEnd - (days - 1);

  const currentRows = prepared.filter((row) => { if (shopNumberFilter && row.shopNumber !== shopNumberFilter) return false; return row.dayIndex >= startDay && row.dayIndex <= endDay; });
  const previousRows = prepared.filter((row) => { if (shopNumberFilter && row.shopNumber !== shopNumberFilter) return false; if (!comparePrevious) return false; return row.dayIndex >= prevStart && row.dayIndex <= prevEnd; });

  const summaryCurrent = currentRows.reduce((acc, row) => { acc.revenue += row.revenue; acc.orders += 1; acc.items += row.qty; return acc; }, { revenue: 0, orders: 0, items: 0 });
  const summaryPrevious = previousRows.reduce((acc, row) => { acc.revenue += row.revenue; acc.orders += 1; acc.items += row.qty; return acc; }, { revenue: 0, orders: 0, items: 0 });
  const currentAov = summaryCurrent.orders ? summaryCurrent.revenue / summaryCurrent.orders : 0;
  const previousAov = summaryPrevious.orders ? summaryPrevious.revenue / summaryPrevious.orders : 0;
  const revenueDeltaPct = safePct(summaryCurrent.revenue, summaryPrevious.revenue);
  const ordersDeltaPct = safePct(summaryCurrent.orders, summaryPrevious.orders);
  const itemsDeltaPct = safePct(summaryCurrent.items, summaryPrevious.items);
  const aovDeltaPct = safePct(currentAov, previousAov);

  const currentByDate = new Map<string, number>();
  for (const row of currentRows) currentByDate.set(row.dateKey, (currentByDate.get(row.dateKey) || 0) + row.revenue);
  const previousByDate = new Map<string, number>();
  for (const row of previousRows) previousByDate.set(row.dateKey, (previousByDate.get(row.dateKey) || 0) + row.revenue);

  const dailyRevenue: { date: string; current: number; previous: number }[] = [];
  for (let i = 0; i < days; i += 1) {
    const currentKey = toDateKey(startDay + i);
    const previousKey = toDateKey(prevStart + i);
    dailyRevenue.push({ date: currentKey, current: currentByDate.get(currentKey) || 0, previous: previousByDate.get(previousKey) || 0 });
  }

  const ordersByHourMap = new Array<number>(24).fill(0);
  for (const row of currentRows) ordersByHourMap[row.hour] += 1;
  const ordersByHour = ordersByHourMap.map((orders, i) => ({ hour: `${String(i).padStart(2, "0")}:00`, orders }));

  const weekdayRevenueMap = new Map<number, number>();
  for (const row of currentRows) { const w = new Date(`${row.dateKey}T00:00:00Z`).getUTCDay(); weekdayRevenueMap.set(w, (weekdayRevenueMap.get(w) || 0) + row.revenue); }
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdayPerformance = weekdayNames.map((day, idx) => ({ day, revenue: weekdayRevenueMap.get(idx) || 0 }));

  const menuCurrentMap = new Map<string, { qty: number; revenue: number }>();
  for (const row of currentRows) { const prev = menuCurrentMap.get(row.itemLabel) || { qty: 0, revenue: 0 }; prev.qty += row.qty; prev.revenue += row.revenue; menuCurrentMap.set(row.itemLabel, prev); }
  const menuPreviousMap = new Map<string, { qty: number; revenue: number }>();
  for (const row of previousRows) { const prev = menuPreviousMap.get(row.itemLabel) || { qty: 0, revenue: 0 }; prev.qty += row.qty; prev.revenue += row.revenue; menuPreviousMap.set(row.itemLabel, prev); }

  const topMenus = Array.from(menuCurrentMap.entries()).map(([label, v]) => ({ label, qty: v.qty, revenue: v.revenue })).filter((m) => m.label !== "Unknown Item").sort((a, b) => b.qty - a.qty).slice(0, 5);
  const menuMix = topMenus.map((m) => ({ label: m.label, value: m.revenue }));
  const growthCandidates = Array.from(menuCurrentMap.entries()).map(([label, current]) => { const previous = menuPreviousMap.get(label) || { qty: 0, revenue: 0 }; return { label, delta: current.qty - previous.qty }; }).filter((m) => m.label !== "Unknown Item").sort((a, b) => b.delta - a.delta);
  const rising = growthCandidates.slice(0, 3);
  const declining = [...growthCandidates].reverse().slice(0, 3);

  const shopMap = new Map<string, { shopName: string; revenue: number; orders: number; missing: number }>();
  for (const row of currentRows) { const key = row.shopNumber || row.shopName; const prev = shopMap.get(key) || { shopName: row.shopName, revenue: 0, orders: 0, missing: 0 }; prev.revenue += row.revenue; prev.orders += 1; prev.missing += row.criticalMissing; shopMap.set(key, prev); }
  const shopComparison = Array.from(shopMap.entries()).map(([shopNumber, v]) => { const fields = v.orders * 6; const quality = fields > 0 ? Math.max(0, 100 - (v.missing / fields) * 100) : 100; return { shopNumber, shopName: v.shopName, revenue: v.revenue, orders: v.orders, aov: v.orders ? v.revenue / v.orders : 0, dataQuality: Math.round(quality) }; }).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  const missingByFieldCounts = { shopNumber: 0, itemCode: 0, itemName: 0, total: 0, date: 0, time: 0 };
  for (const tx of data.sellTransactions) {
    const dateKey = parseDateKey(tx.date || "");
    if (!dateKey) continue;
    const day = toDayIndex(dateKey);
    if (day < startDay || day > endDay) continue;
    if (shopNumberFilter && (tx.shopNumber || "").trim() !== shopNumberFilter) continue;
    if (!(tx.shopNumber || "").trim()) missingByFieldCounts.shopNumber += 1;
    if (!(tx.itemCode || "").trim()) missingByFieldCounts.itemCode += 1;
    if (!(tx.itemName || "").trim()) missingByFieldCounts.itemName += 1;
    if (!tx.total && tx.total !== 0) missingByFieldCounts.total += 1;
    if (!(tx.date || "").trim()) missingByFieldCounts.date += 1;
    if (!(tx.time || "").trim()) missingByFieldCounts.time += 1;
  }

  const missingCritical = Object.values(missingByFieldCounts).reduce((a, b) => a + b, 0);
  const qualityDenominator = Math.max(currentRows.length * 6, 1);
  const score = Math.max(0, 100 - (missingCritical / qualityDenominator) * 100);
  const confidence = confidenceFromScore(score);

  const recommendations: InsightRecommendation[] = [];
  const peakOrders = Math.max(...ordersByHour.map((h) => h.orders), 0);
  const peakShare = summaryCurrent.orders > 0 ? peakOrders / summaryCurrent.orders : 0;
  if (peakShare >= 0.25) recommendations.push({ priority: "HIGH", action: "Adjust staffing around peak hour windows.", reason: `Peak hour contributes ${(peakShare * 100).toFixed(1)}% of total orders.`, expectedImpact: "Faster service and improved throughput during rush periods.", confidence });
  const topMenu = topMenus[0];
  const topMenuShare = topMenu && summaryCurrent.items > 0 ? topMenu.qty / summaryCurrent.items : 0;
  if (topMenu && topMenuShare >= 0.3) recommendations.push({ priority: "MEDIUM", action: `Optimize supply and prep for "${topMenu.label}" while promoting alternatives.`, reason: `Top item drives ${(topMenuShare * 100).toFixed(1)}% of sold quantity.`, expectedImpact: "Reduce stock-out risk and improve menu mix resilience.", confidence });
  if (score < 90) recommendations.push({ priority: "HIGH", action: "Improve data capture completeness for item and time fields.", reason: `Data quality score is ${score.toFixed(1)} with ${missingCritical.toLocaleString()} missing critical values.`, expectedImpact: "Higher trust in insights and better recommendation quality.", confidence: confidenceFromScore(score) });
  if (revenueDeltaPct < -8) recommendations.push({ priority: "HIGH", action: "Launch short-term campaign on best-performing hours and top items.", reason: `Revenue is down ${Math.abs(revenueDeltaPct).toFixed(1)}% vs previous period.`, expectedImpact: "Recover period-over-period revenue decline.", confidence });
  if (recommendations.length === 0) recommendations.push({ priority: "LOW", action: "Maintain current operating plan and monitor week-over-week changes.", reason: "Current trends are stable with no major risk signals.", expectedImpact: "Sustain performance while tracking emerging anomalies.", confidence });

  const highlights = [
    `Revenue ${formatPct(revenueDeltaPct)} vs previous period.`,
    `Orders ${formatPct(ordersDeltaPct)} and AOV ${formatPct(aovDeltaPct)}.`,
    topMenus[0] ? `Top menu is ${topMenus[0].label} (${topMenus[0].qty.toLocaleString()} items).` : "No menu trend available for selected range.",
  ];

  return NextResponse.json({
    filters: { startDate: toDateKey(startDay), endDate: toDateKey(endDay), shopNumber: shopNumberFilter, compare: comparePrevious },
    summary: { revenue: summaryCurrent.revenue, orders: summaryCurrent.orders, itemsSold: summaryCurrent.items, aov: currentAov, revenueDeltaPct, ordersDeltaPct, itemsDeltaPct, aovDeltaPct, confidence },
    executive: { highlights },
    charts: { dailyRevenue, ordersByHour, weekdayPerformance, topMenus, menuMix, risingMenus: rising, decliningMenus: declining, shopComparison },
    dataQuality: { score: Math.round(score), missingCritical, missingByField: [{ field: "shopNumber", missing: missingByFieldCounts.shopNumber }, { field: "itemCode", missing: missingByFieldCounts.itemCode }, { field: "itemName", missing: missingByFieldCounts.itemName }, { field: "total", missing: missingByFieldCounts.total }, { field: "date", missing: missingByFieldCounts.date }, { field: "time", missing: missingByFieldCounts.time }], confidence },
    recommendations,
  });
}

// ── Route exports ─────────────────────────────────────────────────────

/**
 * GET /api/insights              → list insight reports
 * GET /api/insights/report       → generate analytics report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments.length === 0) return await handleGetInsights(request);
    if (segments[0] === "report") return await handleGetReport(request);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("GET /api/insights error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/insights/[id]/publish → publish a report
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    // segments = [id, "publish"]
    if (segments.length === 2 && segments[1] === "publish") {
      return await handlePublishInsight(segments[0]);
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("POST /api/insights error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
