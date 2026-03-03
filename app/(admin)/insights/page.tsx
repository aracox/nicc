"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Select } from "@/components/select";
import { useI18n } from "@/lib/i18n";

interface InsightReport {
  id: string;
  restaurantId: string;
  periodStart: string;
  periodEnd: string;
  status: "DRAFT" | "PUBLISHED";
  payloadJson: Record<string, unknown>;
  createdAt: string;
  restaurant: { id: string; name: string };
}

function PublishButton({ report }: { report: InsightReport }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/insights/${report.id}/publish`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insights"] });
    },
  });

  if (report.status === "PUBLISHED") {
    return <Badge variant="success">{t.common.published}</Badge>;
  }

  return (
    <Button
      size="sm"
      variant="primary"
      onClick={(e) => {
        e.stopPropagation();
        mutation.mutate();
      }}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? t.common.publishing : t.common.publish}
    </Button>
  );
}

export default function InsightsPage() {
  const { t } = useI18n();
  const [statusFilter, setStatusFilter] = useState("");

  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["insights", statusFilter],
    queryFn: () =>
      apiFetch<InsightReport[]>(`/api/insights?${params.toString()}`),
  });

  const columns: ColumnDef<InsightReport, unknown>[] = [
    {
      accessorKey: "restaurant.name",
      header: t.uploads.restaurant,
      cell: ({ row }) => row.original.restaurant.name,
    },
    {
      accessorKey: "periodStart",
      header: t.insights.periodStart,
      cell: ({ getValue }) =>
        new Date(getValue<string>()).toLocaleDateString(),
    },
    {
      accessorKey: "periodEnd",
      header: t.insights.periodEnd,
      cell: ({ getValue }) =>
        new Date(getValue<string>()).toLocaleDateString(),
    },
    {
      accessorKey: "status",
      header: t.common.status,
      cell: ({ getValue }) => {
        const val = getValue<string>();
        return (
          <Badge variant={val === "PUBLISHED" ? "success" : "warning"}>
            {val}
          </Badge>
        );
      },
    },
    {
      id: "payload",
      header: t.insights.topDish,
      cell: ({ row }) => {
        const payload = row.original.payloadJson as Record<string, unknown>;
        return (payload.topDish as string) ?? "-";
      },
    },
    {
      id: "orders",
      header: t.insights.totalOrders,
      cell: ({ row }) => {
        const payload = row.original.payloadJson as Record<string, unknown>;
        return (payload.totalOrders as number)?.toLocaleString() ?? "-";
      },
    },
    {
      id: "actions",
      header: t.common.actions,
      cell: ({ row }) => <PublishButton report={row.original} />,
    },
  ];

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-slate-900">
        {t.insights.title}
      </h2>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select
          label={t.common.status}
          placeholder={t.restaurants.allStatuses}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "DRAFT", label: t.insights.draft },
            { value: "PUBLISHED", label: t.common.published },
          ]}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">{t.common.loading}</p>
      ) : (
        <DataTable columns={columns} data={reports} />
      )}
    </div>
  );
}
