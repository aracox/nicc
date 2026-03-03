"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { Select } from "@/components/select";
import { Input } from "@/components/input";
import { Card } from "@/components/card";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";

interface Restaurant {
  id: string;
  name: string;
  foodType: string;
  province: string;
  district: string;
  status: "ONBOARDED" | "PENDING" | "INACTIVE";
  createdAt: string;
  _count: { menuItems: number; uploads: number; insightReports: number };
}

interface RestaurantDetail extends Restaurant {
  menuItems: { id: string; name: string; category: string }[];
  uploads: { id: string; source: string; status: string; fileKey: string; receivedAt: string }[];
  menuMappings: { id: string; menuItem: { name: string }; standardDish: { name: string }; portionMultiplier: number }[];
}

const statusVariant: Record<string, "success" | "warning" | "danger"> = {
  ONBOARDED: "success",
  PENDING: "warning",
  INACTIVE: "danger",
};

export default function RestaurantsPage() {
  const { t } = useI18n();
  const [province, setProvince] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (province) params.set("province", province);
  if (status) params.set("status", status);
  if (search) params.set("q", search);

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ["restaurants", province, status, search],
    queryFn: () =>
      apiFetch<Restaurant[]>(`/api/restaurants?${params.toString()}`),
  });

  const { data: detail } = useQuery({
    queryKey: ["restaurant-detail", selectedId],
    queryFn: () =>
      apiFetch<RestaurantDetail>(`/api/restaurants/${selectedId}`),
    enabled: !!selectedId,
  });

  const columns: ColumnDef<Restaurant, unknown>[] = [
    { accessorKey: "name", header: t.common.name },
    { accessorKey: "foodType", header: t.restaurants.foodType },
    { accessorKey: "province", header: t.restaurants.province },
    { accessorKey: "district", header: t.restaurants.district },
    {
      accessorKey: "status",
      header: t.common.status,
      cell: ({ getValue }) => {
        const val = getValue<string>();
        return <Badge variant={statusVariant[val] ?? "default"}>{val}</Badge>;
      },
    },
    {
      accessorKey: "_count.menuItems",
      header: t.restaurants.menuItems,
      cell: ({ row }) => row.original._count.menuItems,
    },
    {
      accessorKey: "_count.uploads",
      header: t.uploads.title,
      cell: ({ row }) => row.original._count.uploads,
    },
  ];

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-slate-900">
        {t.restaurants.title}
      </h2>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          label={t.common.search}
          placeholder={t.restaurants.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          label={t.restaurants.province}
          placeholder={t.restaurants.allProvinces}
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          options={[
            { value: "Bangkok", label: "Bangkok" },
            { value: "Chiang Mai", label: "Chiang Mai" },
            { value: "Phuket", label: "Phuket" },
          ]}
        />
        <Select
          label={t.common.status}
          placeholder={t.restaurants.allStatuses}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "ONBOARDED", label: t.restaurants.statusOnboarded },
            { value: "PENDING", label: t.restaurants.statusPending },
            { value: "INACTIVE", label: t.restaurants.statusInactive },
          ]}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">{t.common.loading}</p>
      ) : (
        <DataTable
          columns={columns}
          data={restaurants}
          onRowClick={(row) =>
            setSelectedId(row.id === selectedId ? null : row.id)
          }
        />
      )}

      {selectedId && detail && (
        <Card className="mt-6">
          <h3 className="mb-3 text-lg font-semibold text-slate-900">
            {detail.name}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                {t.restaurants.info}
              </p>
              <p className="text-sm">
                {t.restaurants.foodType}: {detail.foodType}
              </p>
              <p className="text-sm">
                {t.restaurants.province}: {detail.province}
              </p>
              <p className="text-sm">
                {t.restaurants.district}: {detail.district}
              </p>
              <p className="text-sm">
                {t.common.status}:{" "}
                <Badge variant={statusVariant[detail.status]}>
                  {detail.status}
                </Badge>
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                {t.restaurants.quickLinks}
              </p>
              <div className="mt-1 flex flex-col gap-1">
                <Link
                  href={`/uploads?restaurantId=${detail.id}`}
                  className="text-sm text-cpx-blue hover:underline"
                >
                  {t.restaurants.viewUploads.replace(
                    "{count}",
                    String(detail.uploads.length)
                  )}
                </Link>
                <Link
                  href="/mapping/menu"
                  className="text-sm text-cpx-blue hover:underline"
                >
                  {t.restaurants.viewMappings.replace(
                    "{count}",
                    String(detail.menuMappings.length)
                  )}
                </Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                {t.restaurants.recentMenuItems}
              </p>
              <ul className="mt-1 space-y-0.5">
                {detail.menuItems.slice(0, 5).map((mi) => (
                  <li key={mi.id} className="text-sm text-slate-700">
                    {mi.name}{" "}
                    <span className="text-slate-400">({mi.category})</span>
                  </li>
                ))}
                {detail.menuItems.length > 5 && (
                  <li className="text-xs text-slate-400">
                    {t.restaurants.more.replace(
                      "{count}",
                      String(detail.menuItems.length - 5)
                    )}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
