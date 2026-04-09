import { getMockData, saveMockData, type MockNotification } from "@/lib/mock-data";

export type NotiType = "insight" | "info";
export type NotiStatus = "DRAFT" | "PENDING_REVIEW" | "SENT" | "REJECTED";
export type NotiSource = "MANUAL" | "AUTO";

export interface ChartItem {
  label: string;
  value: number;
}

export interface ChartData {
  chartType: "bar" | "pie";
  items: ChartItem[];
}

export type ManagedNotification = MockNotification;

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createNotification(
  payload: Omit<ManagedNotification, "id" | "createdAt" | "status"> & { status?: NotiStatus },
): ManagedNotification {
  const n: ManagedNotification = {
    ...payload,
    id: newId(),
    status: payload.status ?? "DRAFT",
    createdAt: new Date().toISOString(),
  };
  const data = getMockData();
  data.notifications.unshift(n);
  saveMockData(data);
  return n;
}

export function listNotifications(opts?: {
  status?: NotiStatus;
  source?: NotiSource;
  shopNumber?: string;
}): ManagedNotification[] {
  return getMockData().notifications.filter((n) => {
    if (opts?.status && n.status !== opts.status) return false;
    if (opts?.source && n.source !== opts.source) return false;
    if (opts?.shopNumber && n.shopNumber !== opts.shopNumber) return false;
    return true;
  });
}

export function getNotification(id: string): ManagedNotification | undefined {
  return getMockData().notifications.find((n) => n.id === id);
}

export function updateNotification(
  id: string,
  patch: Partial<Pick<ManagedNotification, "status" | "sentAt" | "rejectedAt" | "rejectionNote">>,
): ManagedNotification | null {
  const data = getMockData();
  const idx = data.notifications.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  data.notifications[idx] = { ...data.notifications[idx], ...patch };
  saveMockData(data);
  return data.notifications[idx];
}
