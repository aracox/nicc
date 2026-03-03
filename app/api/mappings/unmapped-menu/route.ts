import { NextResponse } from "next/server";
import { unmappedMenuItems } from "@/lib/mock-data";

export async function GET() {
  try {
    return NextResponse.json(unmappedMenuItems);
  } catch (error) {
    console.error("GET /api/mappings/unmapped-menu error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
