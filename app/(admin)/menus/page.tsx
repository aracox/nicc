"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/input";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { useI18n } from "@/lib/i18n";
import { getSession } from "@/lib/auth";

interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  category: string;
  price?: number;
  shopNumber: string;
  restaurantName: string;
}

export default function MenusPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [search, setSearch] = useState("");
  const [foodCourtId, setFoodCourtId] = useState("");
  const [shopId, setShopId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);

  // Layout protects this route; we assume logged-in user is admin for this mock
  const isAdmin = true;

  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (foodCourtId) params.set("foodCourtId", foodCourtId);
  if (shopId) params.set("shopId", shopId);
  if (minPrice) params.set("minPrice", minPrice);
  if (maxPrice) params.set("maxPrice", maxPrice);

  const { data: menus = [], isLoading } = useQuery({
    queryKey: ["menus", search, foodCourtId, shopId, minPrice, maxPrice],
    queryFn: () =>
      apiFetch<MenuItem[]>(`/api/menus?${params.toString()}`),
  });

  const { data: restaurants = [] } = useQuery({
    queryKey: ["restaurants"],
    queryFn: () => apiFetch<any[]>("/api/restaurants"),
  });

  const { data: foodCourts = [] } = useQuery({
    queryKey: ["foodCourts"],
    queryFn: () => apiFetch<any[]>("/api/food-courts"),
  });

  const filteredRestaurants = foodCourtId
    ? restaurants.filter((r: any) => r.foodCourtId === foodCourtId)
    : restaurants;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const response = await fetch("/api/menus/import", {
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
      alert(t.menus.importSuccess.replace("{count}", String(result.count)));
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["menus"] });
    } catch (error) {
      console.error("Import error:", error);
      alert(t.menus.importError);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(t.menus.deleteAllConfirm)) return;
    setIsDeletingBulk(true);
    try {
      const response = await fetch(`/api/menus/bulk?${params.toString()}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Bulk delete failed");
      alert(t.menus.deleteSuccess);
      queryClient.invalidateQueries({ queryKey: ["menus"] });
    } catch (error) {
      alert(t.menus.deleteError);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.menus.deleteConfirm)) return;
    try {
      const response = await fetch(`/api/menus/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      queryClient.invalidateQueries({ queryKey: ["menus"] });
    } catch (error) {
      alert(t.menus.deleteError);
    }
  };

  const columns: ColumnDef<MenuItem, unknown>[] = [
    { accessorKey: "shopNumber", header: t.menus.shopNo },
    { accessorKey: "restaurantName", header: t.menus.shopName },
    { accessorKey: "name", header: t.common.name },
    { accessorKey: "category", header: t.menus.category },
    {
      accessorKey: "price",
      header: t.menus.price,
      cell: ({ row }) => {
        const p = row.original.price;
        return p !== undefined && p !== null ? p.toFixed(2) : "-";
      },
    },
    {
      id: "actions",
      header: t.common.actions || "Actions",
      cell: ({ row }) => {
        if (!isAdmin) return null;
        return (
          <button
            onClick={() => handleDelete(row.original.id)}
            className="text-red-500 hover:text-red-700 p-1 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">
          {t.menus.title}
        </h2>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkDelete}
              isLoading={isDeletingBulk}
              className="flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {t.menus.deleteAll}
            </Button>
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
              {t.menus.importCsv}
            </Button>
            <button
              onClick={() => setShowFormatModal(true)}
              className="flex items-center justify-center h-8 w-8 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="View sample file format"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          label={t.common.search}
          placeholder={t.menus.searchPlaceholder}
          className="w-72"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          label={t.menus.foodCourt}
          value={foodCourtId}
          onChange={(e) => {
            setFoodCourtId(e.target.value);
            setShopId(""); // Reset shop id when food court changes
          }}
          placeholder={t.menus.allFoodCourts}
          options={foodCourts.map((fc: any) => ({
            value: fc.id,
            label: fc.name,
          }))}
          className="w-48"
        />
        <Select
          label={t.menus.shop}
          value={shopId}
          onChange={(e) => setShopId(e.target.value)}
          placeholder={t.menus.allShops}
          options={filteredRestaurants.map((r: any) => ({
            value: r.id,
            label: `${r.shopNumber} - ${r.name}`,
          }))}
          className="w-64"
        />
        <Input
          label={t.menus.minPrice}
          type="number"
          placeholder="0.00"
          className="w-32"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <Input
          label={t.menus.maxPrice}
          type="number"
          placeholder="999.00"
          className="w-32"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">{t.common.loading}</p>
      ) : (
        <DataTable
          columns={columns}
          data={menus}
        />
      )}

      {/* Sample Format Modal */}
      {showFormatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowFormatModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-base font-semibold text-slate-800">Sample CSV Format</h3>
              </div>
              <button onClick={() => setShowFormatModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-2">The CSV file must have <strong>4 columns</strong> in this exact order:</p>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">#</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Column</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr><td className="px-3 py-2 text-slate-400">1</td><td className="px-3 py-2 font-mono text-blue-600">เลขร้านค้า</td><td className="px-3 py-2 text-slate-600">Shop Number</td></tr>
                      <tr><td className="px-3 py-2 text-slate-400">2</td><td className="px-3 py-2 font-mono text-blue-600">ชื่อร้านค้า</td><td className="px-3 py-2 text-slate-600">Shop Name</td></tr>
                      <tr><td className="px-3 py-2 text-slate-400">3</td><td className="px-3 py-2 font-mono text-blue-600">รายการไอเทม</td><td className="px-3 py-2 text-slate-600">Menu Item Name</td></tr>
                      <tr><td className="px-3 py-2 text-slate-400">4</td><td className="px-3 py-2 font-mono text-blue-600">ราคา</td><td className="px-3 py-2 text-slate-600">Price</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-2">Example file content:</p>
                <pre className="bg-slate-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed font-mono">
{`เลขร้านค้า,ชื่อร้านค้า,รายการไอเทม,ราคา
803201,ร้านข้าวขาหมู,ข้าวขาหมู,60.00
803201,ร้านข้าวขาหมู,ข้าวขาหมูพิเศษ,80.00
803202,ร้านผัดไทย,ผัดไทยกุ้ง,70.00`}
                </pre>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ The <strong>Shop Number</strong> must match an existing shop in the system. Rows with unrecognised shop numbers will be skipped.
              </p>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setShowFormatModal(false)} className="text-sm px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
