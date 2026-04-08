import { NextRequest, NextResponse } from "next/server";
import {
  createNotification,
  listNotifications,
  type NotiStatus,
  type NotiSource,
  type NotiType,
} from "@/lib/notification-store";
import restaurantsData from "@/lib/data/restaurants.json";

const PORTAL_WEBHOOK = process.env.PORTAL_WEBHOOK_URL ?? "http://localhost:3001/api/webhook/notifications";

const VALID_TYPES: NotiType[] = ["insight", "info"];

function shopName(shopNumber: string): string {
  const r = (restaurantsData as { shopNumber: string; name: string }[])
    .find((s) => s.shopNumber === shopNumber);
  return r?.name ?? shopNumber;
}

/** GET /api/notifications?status=&source=&shopNumber= */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const status = (searchParams.get("status") ?? "") as NotiStatus | "";
  const source = (searchParams.get("source") ?? "") as NotiSource | "";
  const shopNumber = searchParams.get("shopNumber") ?? "";

  const list = listNotifications({
    status: status || undefined,
    source: source || undefined,
    shopNumber: shopNumber || undefined,
  });

  return NextResponse.json(list);
}

/**
 * POST /api/notifications
 * Body: { shopNumber, title, body, type, source? }
 * source defaults to "MANUAL".
 * Manual notifications are sent immediately; auto notifications saved as PENDING_REVIEW.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { shopNumber, title, body: msgBody, type, source = "MANUAL" } = body;

  if (!shopNumber || !title || !msgBody) {
    return NextResponse.json(
      { error: "Missing required fields: shopNumber, title, body" },
      { status: 400 },
    );
  }

  const notiType: NotiType = VALID_TYPES.includes(type as NotiType)
    ? (type as NotiType)
    : "info";

  const isManual = source === "MANUAL";

  const notification = createNotification({
    shopNumber,
    shopName: shopName(shopNumber),
    title,
    body: msgBody,
    type: notiType,
    source: isManual ? "MANUAL" : "AUTO",
    status: isManual ? "SENT" : "PENDING_REVIEW",
    ...(isManual ? { sentAt: new Date().toISOString() } : {}),
  });

  // Manual: forward to portal immediately
  if (isManual) {
    try {
      const res = await fetch(PORTAL_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopNumber, title, body: msgBody, type: notiType }),
      });
      if (!res.ok) {
        console.error("Portal webhook failed:", res.status);
      }
    } catch (err) {
      console.error("Portal webhook error:", err);
    }
  }

  return NextResponse.json(notification, { status: 201 });
}
