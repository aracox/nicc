import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getMockData } from "@/lib/mock-data";

export async function GET() {
  try {
    const data = getMockData();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const onboardedCount = data.restaurants.filter((r) => r.status === "ONBOARDED").length;
    const uploadsToday = data.uploads.filter((u) => new Date(u.receivedAt) >= todayStart).length;
    const failedUploads = data.uploads.filter((u) => u.status === "FAILED").length;
    const publishedReports = data.insightReports.filter((r) => r.status === "PUBLISHED").length;
    const draftReports = data.insightReports.filter((r) => r.status === "DRAFT").length;

    const menuItemsByRestaurant = data.restaurants.slice(0, 5).map((r) => ({
      label: r.name.length > 12 ? r.name.slice(0, 12) + "..." : r.name,
      value: data.menuItems.filter((mi) => mi.restaurantId === r.id).length || Math.floor(Math.random() * 20), // Mock some values if empty
    }));

    const uploadsByStatus = [
      { label: "Received", value: data.uploads.filter((u) => u.status === "RECEIVED").length || 10 },
      { label: "Processing", value: data.uploads.filter((u) => u.status === "PROCESSING").length || 5 },
      { label: "Completed", value: data.uploads.filter((u) => u.status === "COMPLETED").length || 45 },
      { label: "Failed", value: data.uploads.filter((u) => u.status === "FAILED").length || 2 },
    ];

    return NextResponse.json({
      kpis: {
        restaurantsOnboarded: onboardedCount,
        totalRestaurants: data.restaurants.length,
        uploadsToday,
        failedUploads,
        publishedReports,
        draftReports,
      },
      charts: {
        menuItemsByRestaurant,
        uploadsByStatus,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
