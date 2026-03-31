"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/button";
import { useI18n } from "@/lib/i18n";

interface UnmappedMenuItem {
  id: string;
  name: string;
  category: string;
  restaurantCount: number;
  createdAt: string;
}

export default function MenuMappingPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"unmapped" | "mapped">("unmapped");
  const [isMapping, setIsMapping] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDishId, setEditDishId] = useState<string>("");
  const [unmappedEditingId, setUnmappedEditingId] = useState<string | null>(null);
  const [unmapSelectedDishId, setUnmapSelectedDishId] = useState<string>("");

  const { data: standardDishes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => apiFetch<any[]>("/api/recipes"),
  });

  const { data: unmappedItems = [], isLoading: isLoadingUnmapped } = useQuery({
    queryKey: ["unmapped-menu"],
    queryFn: () =>
      apiFetch<UnmappedMenuItem[]>("/api/mappings/unmapped-menu"),
  });

  const { data: mappedItems = [], isLoading: isLoadingMapped } = useQuery({
    queryKey: ["mapped-menu"],
    queryFn: () => apiFetch<any[]>("/api/mappings/mapped-menu"),
  });

  const handleCreateMapping = async (menuName: string) => {
    try {
      const response = await fetch("/api/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuName, standardDishId: unmapSelectedDishId })
      });
      if (response.ok) {
        setUnmappedEditingId(null);
        queryClient.invalidateQueries({ queryKey: ["unmapped-menu"] });
        queryClient.invalidateQueries({ queryKey: ["mapped-menu"] });
      } else {
        alert(t.mapping.createError);
      }
    } catch {
      alert(t.mapping.createError);
    }
  };

  const handleAutoMap = async () => {
    setIsMapping(true);
    try {
      const response = await fetch("/api/mappings/auto-map", { method: "POST" });
      const result = await response.json();
      if (response.ok) {
        alert(t.mapping.autoMapSuccess.replace("{count}", String(result.count)));
        queryClient.invalidateQueries({ queryKey: ["unmapped-menu"] });
        queryClient.invalidateQueries({ queryKey: ["mapped-menu"] });
      } else {
        alert(t.mapping.autoMapError);
      }
    } catch (err) {
      alert(t.mapping.autoMapError);
    } finally {
      setIsMapping(false);
    }
  };

  const columns: ColumnDef<UnmappedMenuItem, unknown>[] = [
    {
      accessorKey: "restaurantCount",
      header: t.uploads.restaurant,
      cell: ({ row }) => {
        const count = row.original.restaurantCount;
        return count > 1 ? `Multiple (${count} Shops)` : "1 Shop";
      },
    },
    { accessorKey: "name", header: t.mapping.menuItem },
    { accessorKey: "category", header: t.mapping.category },
    {
      accessorKey: "createdAt",
      header: t.common.createdAt,
      cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
    },
    {
      id: "standardDish",
      header: t.mapping.standardDish,
      cell: ({ row }) => {
        const item = row.original;
        if (unmappedEditingId === item.id) {
          return (
            <select
              value={unmapSelectedDishId}
              onChange={(e) => setUnmapSelectedDishId(e.target.value)}
              className="block w-full rounded-md border-slate-300 py-1 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value="" disabled>Select Dish...</option>
              {standardDishes.map((dish) => (
                <option key={dish.id} value={dish.id}>
                  {dish.name}
                </option>
              ))}
            </select>
          );
        }
        return <span className="text-slate-400">-</span>;
      },
    },
    {
      id: "actions",
      header: t.common.actions,
      cell: ({ row }) => {
        const item = row.original;
        if (unmappedEditingId === item.id) {
          return (
            <div className="flex items-center gap-2">
              <button disabled={!unmapSelectedDishId} onClick={() => handleCreateMapping(item.id)} className="text-blue-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed">{t.mapping.saveMapping}</button>
              <button onClick={() => setUnmappedEditingId(null)} className="text-slate-500 hover:underline">{t.common.cancel}</button>
            </div>
          );
        }
        return (
          <button
            onClick={() => {
              setUnmappedEditingId(item.id);
              setUnmapSelectedDishId("");
            }}
            className="text-blue-600 hover:underline"
          >
            {t.mapping.mapDish}
          </button>
        );
      },
    },
  ];

  const handleUnmap = async (menuName: string) => {
    try {
      const response = await fetch(`/api/mappings/bulk?menuName=${encodeURIComponent(menuName)}`, { method: "DELETE" });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["mapped-menu"] });
        queryClient.invalidateQueries({ queryKey: ["unmapped-menu"] });
      } else {
        alert(t.mapping.deleteError);
      }
    } catch {
      alert(t.mapping.deleteError);
    }
  };

  const handleSaveEdit = async (menuName: string) => {
    try {
      const response = await fetch(`/api/mappings/bulk`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuName, standardDishId: editDishId })
      });
      if (response.ok) {
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: ["mapped-menu"] });
      } else {
        alert(t.mapping.updateError);
      }
    } catch {
      alert(t.mapping.updateError);
    }
  };

  const mappedColumns: ColumnDef<any, unknown>[] = [
    {
      accessorKey: "restaurantCount",
      header: t.uploads.restaurant,
      cell: ({ row }) => {
        const count = row.original.restaurantCount;
        return count > 1 ? `Multiple (${count} Shops)` : "1 Shop";
      },
    },
    { accessorKey: "menuName", header: t.mapping.menuItem },
    {
      id: "arrow",
      header: "",
      cell: () => <span className="text-slate-400">→</span>,
    },
    {
      accessorKey: "standardDishName",
      header: t.mapping.standardDish,
      cell: ({ row }) => {
        const item = row.original;
        if (editingId === item.id) {
          return (
            <select
              value={editDishId}
              onChange={(e) => setEditDishId(e.target.value)}
              className="block w-full rounded-md border-slate-300 py-1 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              {standardDishes.map((dish) => (
                <option key={dish.id} value={dish.id}>
                  {dish.name}
                </option>
              ))}
            </select>
          );
        }
        return item.standardDishName;
      },
    },
    {
      accessorKey: "mappedAt",
      header: t.mapping.mappedAt,
      cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
    },
    {
      id: "actions",
      header: t.common.actions,
      cell: ({ row }) => {
        const item = row.original;
        if (editingId === item.id) {
          return (
            <div className="flex items-center gap-2">
              <button onClick={() => handleSaveEdit(item.id)} className="text-blue-600 hover:underline">{t.mapping.saveMapping}</button>
              <button onClick={() => setEditingId(null)} className="text-slate-500 hover:underline">{t.common.cancel}</button>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingId(item.id);
                setEditDishId(item.standardDishId);
              }}
              className="text-blue-600 hover:underline"
            >
              {t.mapping.editMapping}
            </button>
            <button onClick={() => handleUnmap(item.id)} className="text-red-600 hover:underline">
              {t.mapping.unmap}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.mapping.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{t.mapping.description}</p>
        </div>
        <Button
          onClick={handleAutoMap}
          isLoading={isMapping}
          className="flex items-center gap-2"
        >
          {isMapping ? t.mapping.autoMapProcessing : t.mapping.runAutoMap}
        </Button>
      </div>

      <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab("unmapped")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "unmapped"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {t.mapping.unmappedTab} ({unmappedItems.length})
        </button>
        <button
          onClick={() => setActiveTab("mapped")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "mapped"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {t.mapping.mappedTab} ({mappedItems.length})
        </button>
      </div>

      {activeTab === "unmapped" && (
        <>
          {isLoadingUnmapped ? (
            <p className="text-sm text-slate-500">{t.common.loading}</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-slate-600">
                {t.mapping.unmappedCount.replace("{count}", String(unmappedItems.length))}
              </p>
              <DataTable columns={columns} data={unmappedItems} />
            </>
          )}
        </>
      )}

      {activeTab === "mapped" && (
        <>
          {isLoadingMapped ? (
            <p className="text-sm text-slate-500">{t.common.loading}</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-slate-600">
                {t.mapping.mappedCount.replace("{count}", String(mappedItems.length))}
              </p>
              <DataTable columns={mappedColumns} data={mappedItems} />
            </>
          )}
        </>
      )}
    </div>
  );
}
