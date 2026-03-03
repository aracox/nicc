import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "Axtra B2B",
    time: new Date().toISOString(),
  });
}
