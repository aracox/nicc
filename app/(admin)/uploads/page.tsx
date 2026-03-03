"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { Select } from "@/components/select";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";

interface Upload {
  id: string;
  restaurantId: string;
  source: string;
  status: "RECEIVED" | "PROCESSING" | "COMPLETED" | "FAILED";
  fileKey: string;
  receivedAt: string;
  processedAt: string | null;
  errorMessage: string | null;
  restaurant: { id: string; name: string };
}

const statusVariant: Record<string, "info" | "warning" | "success" | "danger"> = {
  RECEIVED: "info",
  PROCESSING: "warning",
  COMPLETED: "success",
  FAILED: "danger",
};

function UploadsContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const initialRestaurantId = searchParams.get("restaurantId") ?? "";
  const [statusFilter, setStatusFilter] = useState("");
  const [restaurantId] = useState(initialRestaurantId);

  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);
  if (restaurantId) params.set("restaurantId", restaurantId);

  const { data: uploads = [], isLoading } = useQuery({
    queryKey: ["uploads", statusFilter, restaurantId],
    queryFn: () => apiFetch<Upload[]>(`/api/uploads?${params.toString()}`),
  });

  const columns: ColumnDef<Upload, unknown>[] = [
    {
      accessorKey: "restaurant.name",
      header: t.uploads.restaurant,
      cell: ({ row }) => row.original.restaurant.name,
    },
    {
      accessorKey: "source",
      header: t.uploads.source,
      cell: ({ getValue }) => {
        const val = getValue<string>();
        return val === "POS_EXPORT" ? t.uploads.posExport : t.uploads.paper;
      },
    },
    {
      accessorKey: "status",
      header: t.common.status,
      cell: ({ getValue }) => {
        const val = getValue<string>();
        return <Badge variant={statusVariant[val] ?? "default"}>{val}</Badge>;
      },
    },
    { accessorKey: "fileKey", header: t.uploads.fileKey },
    {
      accessorKey: "receivedAt",
      header: t.uploads.received,
      cell: ({ getValue }) => new Date(getValue<string>()).toLocaleString(),
    },
    {
      accessorKey: "processedAt",
      header: t.uploads.processed,
      cell: ({ getValue }) => {
        const val = getValue<string | null>();
        return val ? new Date(val).toLocaleString() : "-";
      },
    },
    {
      accessorKey: "errorMessage",
      header: t.common.error,
      cell: ({ getValue }) => {
        const val = getValue<string | null>();
        if (!val) return "-";
        return <span className="text-red-600 text-xs">{val}</span>;
      },
    },
  ];

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-slate-900">
        {t.uploads.title}
      </h2>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select
          label={t.common.status}
          placeholder={t.restaurants.allStatuses}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "RECEIVED", label: t.uploads.statusReceived },
            { value: "PROCESSING", label: t.uploads.statusProcessing },
            { value: "COMPLETED", label: t.uploads.statusCompleted },
            { value: "FAILED", label: t.uploads.statusFailed },
          ]}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">{t.common.loading}</p>
      ) : (
        <DataTable columns={columns} data={uploads} />
      )}
    </div>
  );
}

export default function UploadsPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-slate-500">Loading...</p>}
    >
      <UploadsContent />
    </Suspense>
  );
}
