"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { Select } from "@/components/select";
import { Input } from "@/components/input";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";

interface FoodCourt {
  id: string;
  name: string;
}

interface Restaurant {
  id: string;
  name: string;
  shopNumber: string;
  customerNo: string;
  foodCourtId?: string;
  status: "ONBOARDED" | "PENDING" | "INACTIVE";
  createdAt: string;
  _count: { menuItems: number; uploads: number; insightReports: number };
}

interface RestaurantDetail extends Restaurant {
  foodCourtName: string;
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
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [status, setStatus] = useState("");
  const [foodCourtId, setFoodCourtId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Layout protects this route; we assume logged-in user is admin for this mock
  const isAdmin = true;

  const { data: foodCourts = [] } = useQuery({
    queryKey: ["food-courts"],
    queryFn: () => apiFetch<FoodCourt[]>("/api/food-courts"),
  });

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (foodCourtId) params.set("foodCourtId", foodCourtId);
  if (search) params.set("q", search);

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ["restaurants", status, foodCourtId, search],
    queryFn: () =>
      apiFetch<Restaurant[]>(`/api/restaurants?${params.toString()}`),
  });

  const { data: detail } = useQuery({
    queryKey: ["restaurant-detail", selectedId],
    queryFn: () =>
      apiFetch<RestaurantDetail>(`/api/restaurants/${selectedId}`),
    enabled: !!selectedId,
  });

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const response = await fetch("/api/restaurants/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          csvText: text,
        }),
      });

      if (!response.ok) {
        throw new Error("Import failed");
      }

      const result = await response.json();
      alert(`Successfully imported ${result.count} restaurants for ${result.foodCourt.name}`);
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["food-courts"] });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    } catch (error) {
      console.error("Import error:", error);
      alert("Failed to import CSV. Please check the format.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleStatusChange = async (newStatus: "ONBOARDED" | "PENDING" | "INACTIVE") => {
    if (!selectedId) return;

    // Optimistically update the list
    queryClient.setQueryData(["restaurants", status, foodCourtId, search], (old: Restaurant[] | undefined) => {
      if (!old) return old;
      return old.map(r => r.id === selectedId ? { ...r, status: newStatus } : r);
    });
    
    // Also update detail
    queryClient.setQueryData(["restaurant-detail", selectedId], (old: RestaurantDetail | undefined) => {
      if (!old) return old;
      return { ...old, status: newStatus };
    });

    try {
      const response = await fetch(`/api/restaurants/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Update failed");
      }

      // Final refresh to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-detail", selectedId] });
    } catch (error) {
      console.error("Status update error:", error);
      alert("Failed to update status.");
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-detail", selectedId] });
    }
  };

  const columns: ColumnDef<Restaurant, unknown>[] = [
    { accessorKey: "shopNumber", header: "Shop No." },
    { accessorKey: "name", header: t.common.name },
    { accessorKey: "customerNo", header: "Customer No." },
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
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">
          {t.restaurants.title}
        </h2>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv"
              onChange={handleFileChange}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleImportClick}
              isLoading={isImporting}
              className="flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import CSV
            </Button>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          label={t.common.search}
          placeholder={t.restaurants.searchPlaceholder}
          className="w-72"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          label="Food Court"
          placeholder="All Food Courts"
          value={foodCourtId}
          onChange={(e) => setFoodCourtId(e.target.value)}
          options={foodCourts.map((fc) => ({
            value: fc.id,
            label: fc.name,
          }))}
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
              <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
                {t.restaurants.info}
              </p>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="text-slate-500">Food Court:</span> {detail.foodCourtName}
                </p>
                <p className="text-sm">
                  <span className="text-slate-500">Shop No.:</span> {detail.shopNumber}
                </p>
                <p className="text-sm">
                  <span className="text-slate-500">Customer No.:</span> {detail.customerNo}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-sm text-slate-500">{t.common.status}:</span>{" "}
                  {isAdmin ? (
                    <div className="w-32">
                      <Select
                        value={detail.status}
                        onChange={(e) => handleStatusChange(e.target.value as any)}
                        className={`font-semibold ${
                          detail.status === "ONBOARDED"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : detail.status === "PENDING"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : "bg-red-100 text-red-800 border-red-200"
                        }`}
                        options={[
                          { value: "ONBOARDED", label: "ONBOARDED" },
                          { value: "PENDING", label: "PENDING" },
                          { value: "INACTIVE", label: "INACTIVE" },
                        ]}
                      />
                    </div>
                  ) : (
                    <Badge variant={statusVariant[detail.status]}>
                      {detail.status}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
                {t.restaurants.quickLinks}
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href={`/uploads?restaurantId=${detail.id}`}
                  className="text-sm text-brand-teal hover:underline flex items-center gap-1"
                >
                  {t.restaurants.viewUploads.replace(
                    "{count}",
                    String(detail.uploads.length)
                  )}
                </Link>
                <Link
                  href="/mapping/menu"
                  className="text-sm text-brand-teal hover:underline flex items-center gap-1"
                >
                  {t.restaurants.viewMappings.replace(
                    "{count}",
                    String(detail.menuMappings.length)
                  )}
                </Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
                {t.restaurants.recentMenuItems}
              </p>
              <ul className="space-y-1">
                {detail.menuItems.length > 0 ? (
                  detail.menuItems.slice(0, 5).map((mi) => (
                    <li key={mi.id} className="text-sm text-slate-700">
                      {mi.name}{" "}
                      <span className="text-slate-400">({mi.category})</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-slate-400">No menu items yet</li>
                )}
                {detail.menuItems.length > 5 && (
                  <li className="text-xs text-slate-400 pt-1">
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
