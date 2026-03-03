import { NextResponse } from "next/server";
import { restaurants, menuItems, uploads, insightReports } from "@/lib/mock-data";

export async function GET() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const onboardedCount = restaurants.filter((r) => r.status === "ONBOARDED").length;
    const uploadsToday = uploads.filter((u) => new Date(u.receivedAt) >= todayStart).length;
    const failedUploads = uploads.filter((u) => u.status === "FAILED").length;
    const publishedReports = insightReports.filter((r) => r.status === "PUBLISHED").length;
    const draftReports = insightReports.filter((r) => r.status === "DRAFT").length;

    const menuItemsByRestaurant = restaurants.map((r) => ({
      label: r.name.length > 12 ? r.name.slice(0, 12) + "..." : r.name,
      value: menuItems.filter((mi) => mi.restaurantId === r.id).length,
    }));

    const uploadsByStatus = [
      { label: "Received", value: uploads.filter((u) => u.status === "RECEIVED").length },
      { label: "Processing", value: uploads.filter((u) => u.status === "PROCESSING").length },
      { label: "Completed", value: uploads.filter((u) => u.status === "COMPLETED").length },
      { label: "Failed", value: uploads.filter((u) => u.status === "FAILED").length },
    ];

    return NextResponse.json({
      kpis: {
        restaurantsOnboarded: onboardedCount,
        totalRestaurants: restaurants.length,
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
