import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getMockData } from "@/lib/mock-data";

function isCodeLike(value: string) {
  return /^[A-Z]\d{5,}$/i.test(value) || /^[VP]\d{5,}$/i.test(value);
}

export async function GET() {
  try {
    const data = getMockData();

    const onboardedCount = data.restaurants.filter(
      (r) => r.status === "ONBOARDED",
    ).length;
    const totalTransactions = data.sellTransactions.length;
    const totalRevenue = data.sellTransactions.reduce(
      (acc, curr) => acc + (curr.total || 0),
      0,
    );
    const totalItemsSold = data.sellTransactions.reduce(
      (acc, curr) => acc + (curr.quantity || 0),
      0,
    );

    const shopRevMap: Record<string, number> = {};
    const shopTxnMap: Record<string, number> = {};
    const itemQtyByKeyMap: Record<string, number> = {};
    const itemLabelByKeyMap: Record<string, string> = {};
    const dailyRevenueMap: Record<string, number> = {};
    const hourlyTxnMap: Record<string, number> = {};
    const menuNameByCode = new Map<string, string>();

    for (const menu of data.menuItems) {
      const code = menu.itemCode?.trim();
      const name = menu.name?.trim();
      if (code && name && !menuNameByCode.has(code)) {
        menuNameByCode.set(code, name);
      }
    }

    data.sellTransactions.forEach((tx) => {
      const shopName = tx.shopName || tx.shopNumber || "Unknown";
      const rawItemName = (tx.itemName || "").trim();
      const code = (tx.itemCode || "").trim();
      const resolvedItemName =
        rawItemName && !isCodeLike(rawItemName)
          ? rawItemName
          : code && !isCodeLike(code)
            ? code
          : code
            ? (menuNameByCode.get(code) ?? "Unknown Item")
            : "Unknown Item";
      const itemKey = code || resolvedItemName;

      shopRevMap[shopName] = (shopRevMap[shopName] || 0) + (tx.total || 0);
      shopTxnMap[shopName] = (shopTxnMap[shopName] || 0) + 1;
      itemQtyByKeyMap[itemKey] = (itemQtyByKeyMap[itemKey] || 0) + (tx.quantity || 0);
      itemLabelByKeyMap[itemKey] = resolvedItemName;

      const date = tx.date || tx.dateTime?.slice(0, 10);
      if (date) {
        dailyRevenueMap[date] = (dailyRevenueMap[date] || 0) + (tx.total || 0);
      }

      const hour = tx.time?.split(":")[0];
      if (hour && /^\d{1,2}$/.test(hour)) {
        const h = hour.padStart(2, "0");
        hourlyTxnMap[h] = (hourlyTxnMap[h] || 0) + 1;
      }
    });

    const topShopsByRevenue = Object.entries(shopRevMap)
      .map(([label, value]) => ({
        label: label.length > 15 ? `${label.slice(0, 15)}...` : label,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topSellingItems = Object.entries(itemQtyByKeyMap)
      .map(([key, value]) => ({
        label: itemLabelByKeyMap[key] ?? "Unknown Item",
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .map(({ label, value }) => ({
        label: label.length > 15 ? `${label.slice(0, 15)}...` : label,
        value,
      }))
      .slice(0, 5);

    const topShopsByTxn = Object.entries(shopTxnMap)
      .map(([label, value]) => ({
        label: label.length > 15 ? `${label.slice(0, 15)}...` : label,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const dailyRevenueTrend = Object.entries(dailyRevenueMap)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-14)
      .map(([date, value]) => ({
        label: date,
        value,
      }));

    const transactionsByHour = Object.entries(hourlyTxnMap)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([hour, value]) => ({
        label: `${hour}:00`,
        value,
      }));

    return NextResponse.json({
      kpis: {
        restaurantsOnboarded: onboardedCount,
        totalRestaurants: data.restaurants.length,
        totalRevenue,
        totalTransactions,
        totalItemsSold,
      },
      charts: {
        revenueByShop: topShopsByRevenue,
        topSellingItems,
        transactionsByShop: topShopsByTxn,
        dailyRevenueTrend,
        transactionsByHour,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
