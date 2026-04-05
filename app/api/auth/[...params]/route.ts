import { NextRequest, NextResponse } from "next/server";
import { login, logout } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Consolidated auth routes:
 *   POST /api/auth/login   → login
 *   POST /api/auth/logout  → logout
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ params: string[] }> }
) {
  const segments = (await params).params ?? [];
  const action = segments[0];

  try {
    if (action === "login") {
      const { username, password } = await request.json();
      if (username === "test" && password === "admin") {
        await login();
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (action === "logout") {
      await logout();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
