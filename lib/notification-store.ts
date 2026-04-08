/**
 * In-memory notification store for nicc.
 * Resets on server restart — fine for dev/testing.
 */

export type NotiType = "insight" | "alert" | "info";
export type NotiStatus = "DRAFT" | "PENDING_REVIEW" | "SENT" | "REJECTED";
export type NotiSource = "MANUAL" | "AUTO";

export interface ManagedNotification {
  id: string;
  shopNumber: string;
  shopName: string;
  title: string;
  body: string;
  type: NotiType;
  source: NotiSource;
  status: NotiStatus;
  createdAt: string;
  sentAt?: string;
  rejectedAt?: string;
  rejectionNote?: string;
}

const store: ManagedNotification[] = [];

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createNotification(
  payload: Omit<ManagedNotification, "id" | "createdAt" | "status">
    & { status?: NotiStatus },
): ManagedNotification {
  const n: ManagedNotification = {
    ...payload,
    id: newId(),
    status: payload.status ?? "DRAFT",
    createdAt: new Date().toISOString(),
  };
  store.unshift(n);
  return n;
}

export function listNotifications(opts?: {
  status?: NotiStatus;
  source?: NotiSource;
  shopNumber?: string;
}): ManagedNotification[] {
  return store.filter((n) => {
    if (opts?.status && n.status !== opts.status) return false;
    if (opts?.source && n.source !== opts.source) return false;
    if (opts?.shopNumber && n.shopNumber !== opts.shopNumber) return false;
    return true;
  });
}

export function getNotification(id: string): ManagedNotification | undefined {
  return store.find((n) => n.id === id);
}

export function updateNotification(
  id: string,
  patch: Partial<Pick<ManagedNotification, "status" | "sentAt" | "rejectedAt" | "rejectionNote">>,
): ManagedNotification | null {
  const idx = store.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  store[idx] = { ...store[idx], ...patch };
  return store[idx];
}
