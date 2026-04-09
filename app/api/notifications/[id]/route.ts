import { NextRequest, NextResponse } from "next/server";
import { getNotification, updateNotification } from "@/lib/notification-store";

const PORTAL_WEBHOOK = process.env.PORTAL_WEBHOOK_URL ?? "http://localhost:3001/api/webhook/notifications";

/**
 * PATCH /api/notifications/[id]
 * Body: { action: "approve" | "reject", rejectionNote?: string }
 * approve → forwards to portal webhook, marks SENT
 * reject  → marks REJECTED
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const n = getNotification(id);
  if (!n) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, rejectionNote } = body;

  if (action === "approve") {
    // Forward to portal webhook
    try {
      const res = await fetch(PORTAL_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopNumber: n.shopNumber,
          title: n.title,
          body: n.body,
          type: n.type,
          ...(n.chartData ? { chartData: n.chartData } : {}),
        }),
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `Portal webhook failed: ${res.status}` },
          { status: 502 },
        );
      }
    } catch (err) {
      return NextResponse.json(
        { error: `Portal unreachable: ${String(err)}` },
        { status: 502 },
      );
    }

    const updated = updateNotification(id, {
      status: "SENT",
      sentAt: new Date().toISOString(),
    });
    return NextResponse.json(updated);
  }

  if (action === "reject") {
    const updated = updateNotification(id, {
      status: "REJECTED",
      rejectedAt: new Date().toISOString(),
      rejectionNote: rejectionNote ?? "",
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
}
