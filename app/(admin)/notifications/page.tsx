"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Select } from "@/components/select";
import { Badge } from "@/components/badge";
import { useI18n } from "@/lib/i18n";
import restaurantsData from "@/lib/data/restaurants.json";

type NotiType = "insight" | "alert" | "info";
type NotiStatus = "DRAFT" | "PENDING_REVIEW" | "SENT" | "REJECTED";
type NotiSource = "MANUAL" | "AUTO";

interface ManagedNotification {
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

const SHOPS = (restaurantsData as { shopNumber: string; name: string }[]).map((r) => ({
  value: r.shopNumber,
  label: `${r.shopNumber} — ${r.name}`,
}));

const TYPE_OPTIONS = [
  { value: "insight", label: "Insight" },
  { value: "alert", label: "Alert" },
  { value: "info", label: "Info" },
];

const statusBadge: Record<NotiStatus, { variant: "success" | "warning" | "danger" | "default"; label: string }> = {
  SENT: { variant: "success", label: "Sent" },
  PENDING_REVIEW: { variant: "warning", label: "Pending Review" },
  REJECTED: { variant: "danger", label: "Rejected" },
  DRAFT: { variant: "default", label: "Draft" },
};

const typeIcon: Record<NotiType, string> = {
  insight: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  alert: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
  info: "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    day: "2-digit", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ── Manual send form ──────────────────────────────────────────────── */
function ManualForm({ onSent }: { onSent: () => void }) {
  const [shopNumber, setShopNumber] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NotiType>("info");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSend() {
    if (!shopNumber || !title || !body) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setSuccess("");
    setSending(true);
    try {
      await apiFetch("/api/notifications", {
        method: "POST",
        body: JSON.stringify({ shopNumber, title, body, type, source: "MANUAL" }),
      });
      setSuccess("Notification sent successfully.");
      setTitle("");
      setBody("");
      setShopNumber("");
      setType("info");
      onSent();
    } catch (e) {
      setError(String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold text-slate-700 uppercase tracking-wide">
        Send Manual Notification
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Shop"
          options={SHOPS}
          placeholder="Select shop..."
          value={shopNumber}
          onChange={(e) => setShopNumber(e.target.value)}
        />
        <Select
          label="Type"
          options={TYPE_OPTIONS}
          value={type}
          onChange={(e) => setType(e.target.value as NotiType)}
        />
        <div className="sm:col-span-2">
          <Input
            label="Title"
            placeholder="e.g. ยอดขายสัปดาห์นี้พร้อมแล้ว"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-sm font-medium text-slate-700">Message</label>
          <textarea
            rows={3}
            placeholder="Notification message body..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cpx-blue focus:outline-none focus:ring-1 focus:ring-cpx-blue resize-none"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}
      {success && (
        <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</p>
      )}

      <div className="mt-4 flex justify-end">
        <Button onClick={handleSend} isLoading={sending} disabled={sending}>
          <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
          Send Now
        </Button>
      </div>
    </div>
  );
}

/* ── Notifications table ──────────────────────────────────────────── */
function NotiTable({
  notifications,
  onApprove,
  onReject,
  showActions,
}: {
  notifications: ManagedNotification[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  showActions?: boolean;
}) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-14 text-slate-400">
        <svg className="mb-3 h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <p className="text-sm">No notifications</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-cpx-blue-light text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-4 py-3 text-left">Shop</th>
            <th className="px-4 py-3 text-left">Title / Message</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Time</th>
            {showActions && <th className="px-4 py-3 text-left">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {notifications.map((n) => {
            const sb = statusBadge[n.status];
            return (
              <tr key={n.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{n.shopName}</div>
                  <div className="text-xs text-slate-400">{n.shopNumber}</div>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <div className="font-medium text-slate-800 truncate">{n.title}</div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">{n.body}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={typeIcon[n.type]} />
                    </svg>
                    <span className="capitalize text-slate-600">{n.type}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={sb.variant}>{sb.label}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                  {formatTime(n.sentAt ?? n.createdAt)}
                </td>
                {showActions && n.status === "PENDING_REVIEW" && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => onApprove?.(n.id)}>
                        Approve & Send
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => onReject?.(n.id)}>
                        Reject
                      </Button>
                    </div>
                  </td>
                )}
                {showActions && n.status !== "PENDING_REVIEW" && (
                  <td className="px-4 py-3 text-xs text-slate-400">—</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */
export default function NotificationsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"manual" | "auto">("manual");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: all = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<ManagedNotification[]>("/api/notifications"),
    refetchInterval: 15000,
  });

  const manual = all.filter((n) => n.source === "MANUAL");
  const pending = all.filter((n) => n.source === "AUTO" && n.status === "PENDING_REVIEW");
  const autoHistory = all.filter((n) => n.source === "AUTO" && n.status !== "PENDING_REVIEW");

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  async function handleApprove(id: string) {
    setActionLoading(id);
    try {
      await apiFetch(`/api/notifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "approve" }),
      });
      invalidate();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    setActionLoading(id);
    try {
      await apiFetch(`/api/notifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "reject" }),
      });
      invalidate();
    } finally {
      setActionLoading(null);
    }
  }

  const tabs = [
    { key: "manual" as const, label: "Manual", count: manual.length },
    { key: "auto" as const, label: "Auto-generated", count: pending.length, badge: pending.length > 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Notification Management</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Send manual notifications or review auto-generated ones before delivery to shops.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-cpx-blue-light px-3 py-1.5 text-xs font-medium text-cpx-blue">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
          </svg>
          Portal: localhost:3001
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
                tab === tb.key
                  ? "border-cpx-blue text-cpx-blue"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tb.label}
              {tb.badge && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-white">
                  {tb.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cpx-blue border-t-transparent" />
        </div>
      ) : tab === "manual" ? (
        <div className="space-y-6">
          <ManualForm onSent={invalidate} />

          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-600 uppercase tracking-wide">
              Sent Manual Notifications ({manual.length})
            </h2>
            <NotiTable notifications={manual} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending review */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                Pending Review
              </h2>
              {pending.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {pending.length} awaiting approval
                </span>
              )}
            </div>
            <NotiTable
              notifications={pending}
              showActions
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </div>

          {/* History */}
          {autoHistory.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-600 uppercase tracking-wide">
                Review History ({autoHistory.length})
              </h2>
              <NotiTable notifications={autoHistory} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
