import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { getMockData, saveMockData } from "@/lib/mock-data";

const createSchema = z.object({
  restaurantId: z.string().min(1),
  source: z.enum(["POS_EXPORT", "PAPER"]),
  fileKey: z.string().min(1),
});

const updateSchema = z.object({
  status: z.enum(["RECEIVED", "PROCESSING", "COMPLETED", "FAILED"]).optional(),
  errorMessage: z.string().optional(),
  processedAt: z.string().datetime().optional(),
});

// ── Handlers ──────────────────────────────────────────────────────────

async function handleGetUploads(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const restaurantId = searchParams.get("restaurantId");
  const data = getMockData();
  let filtered = [...data.uploads];
  if (restaurantId) filtered = filtered.filter((u) => u.restaurantId === restaurantId);
  const result = filtered.map((u) => {
    const restaurant = data.restaurants.find((r) => r.id === u.restaurantId);
    return { ...u, restaurant: restaurant ? { id: restaurant.id, name: restaurant.name } : { id: u.restaurantId, name: "Unknown" } };
  });
  return NextResponse.json(result);
}

async function handleCreateUpload(request: NextRequest) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  const data = getMockData();
  const restaurant = data.restaurants.find((r) => r.id === parsed.data.restaurantId);
  const newUpload = { id: `upl-${String(data.uploads.length + 1).padStart(3, "0")}`, ...parsed.data, status: "RECEIVED" as const, receivedAt: new Date().toISOString(), processedAt: null, errorMessage: null, restaurant: { id: parsed.data.restaurantId, name: restaurant?.name ?? "Unknown" } };
  data.uploads.push(newUpload);
  saveMockData(data);
  return NextResponse.json(newUpload, { status: 201 });
}

async function handlePatchUpload(request: NextRequest, id: string) {
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  const data = getMockData();
  const idx = data.uploads.findIndex((u) => u.id === id);
  if (idx === -1) return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  if (parsed.data.status) (data.uploads[idx] as any).status = parsed.data.status;
  if (parsed.data.errorMessage !== undefined) (data.uploads[idx] as any).errorMessage = parsed.data.errorMessage;
  if (parsed.data.processedAt) (data.uploads[idx] as any).processedAt = parsed.data.processedAt;
  saveMockData(data);
  return NextResponse.json(data.uploads[idx]);
}

// ── Route exports ─────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments.length === 0) return await handleGetUploads(request);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("GET /api/uploads error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments.length === 0) return await handleCreateUpload(request);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("POST /api/uploads error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ params?: string[] }> }
) {
  const segments = (await params).params ?? [];
  try {
    if (segments.length === 1) return await handlePatchUpload(request, segments[0]);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("PATCH /api/uploads error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
