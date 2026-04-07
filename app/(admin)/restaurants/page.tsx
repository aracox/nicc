"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/badge";
import { Select } from "@/components/select";
import { Input } from "@/components/input";
import { Button } from "@/components/button";
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
  actFlag?: string;
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
  const [activeTab, setActiveTab] = useState<"overview" | "inventory">("overview");
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);

  // Reset drawer state when changing restaurant
  useEffect(() => {
    setIsMenuExpanded(false);
    setActiveTab("overview");
  }, [selectedId]);

  const isAdmin = true;

  // Close drawer on ESC key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/restaurants/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Import failed");

      const result = await response.json();
      alert(`Successfully imported ${result.count} restaurants for ${result.foodCourtName}`);

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

    queryClient.setQueryData(["restaurants", status, foodCourtId, search], (old: Restaurant[] | undefined) => {
      if (!old) return old;
      return old.map((r) => (r.id === selectedId ? { ...r, status: newStatus } : r));
    });
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
      if (!response.ok) throw new Error("Update failed");
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-detail", selectedId] });
    } catch (error) {
      console.error("Status update error:", error);
      alert("Failed to update status.");
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-detail", selectedId] });
    }
  };

  const columns: ColumnDef<Restaurant, unknown>[] = [
    { accessorKey: "shopNumber", header: "Shop No." },
    { accessorKey: "name", header: t.common.name },
    { accessorKey: "customerNo", header: "Customer No." },
    { accessorKey: "actFlag", header: "Act Flag" },
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

  const isDrawerOpen = !!selectedId;

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{t.restaurants.title}</h2>
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

      {/* ── Filters ─────────────────────────────────────────────────── */}
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
          options={foodCourts.map((fc) => ({ value: fc.id, label: fc.name }))}
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

      {/* ── Table ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <p className="text-sm text-slate-500">{t.common.loading}</p>
      ) : (
        <DataTable
          columns={columns}
          data={restaurants}
          onRowClick={(row) => setSelectedId((row as Restaurant).id === selectedId ? null : (row as Restaurant).id)}
        />
      )}

      {/* ── Slide-over backdrop ──────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSelectedId(null)}
        aria-hidden="true"
      />

      {/* ── Slide-over drawer panel ───────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Restaurant detail"
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isDrawerOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-brand-teal/10 flex items-center justify-center">
              <svg className="h-5 w-5 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">{detail?.name ?? "Restaurant Detail"}</h3>
              <p className="text-xs text-slate-400 truncate">{detail?.foodCourtName ?? "—"}</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedId(null)}
            className="flex-shrink-0 ml-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            aria-label="Close"
          >
          </button>
        </div>

        {/* Tab Header */}
        <div className="flex px-6 border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-brand-teal text-brand-teal"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "inventory"
                ? "border-brand-teal text-brand-teal"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.nav.recipes} & Inventory
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {detail ? (
            activeTab === "overview" ? (
              <div className="space-y-6">
                {/* Info rows */}
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    {t.restaurants.info}
                  </p>
                  <div className="bg-slate-50 rounded-xl divide-y divide-slate-100 border border-slate-100">
                    {/* ... existing info rows ... */}
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-slate-500">Food Court</span>
                      <span className="text-sm font-medium text-slate-800">{detail.foodCourtName}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-slate-500">Shop No.</span>
                      <span className="text-sm font-medium text-slate-800">{detail.shopNumber}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-slate-500">Customer No.</span>
                      <span className="text-sm font-medium text-slate-800">{detail.customerNo}</span>
                    </div>
                    {detail.actFlag && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-slate-500">Act Flag</span>
                        <span className="text-sm font-medium text-slate-800">{detail.actFlag}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-slate-500">{t.common.status}</span>
                      {isAdmin ? (
                        <div className="w-36">
                          <Select
                            value={detail.status}
                            onChange={(e) => handleStatusChange(e.target.value as "ONBOARDED" | "PENDING" | "INACTIVE")}
                            className={`text-sm font-semibold ${
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
                        <Badge variant={statusVariant[detail.status]}>{detail.status}</Badge>
                      )}
                    </div>
                  </div>
                </section>

                {/* Quick links */}
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    {t.restaurants.quickLinks}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href={`/uploads?restaurantId=${detail.id}`}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-brand-teal hover:bg-teal-50 transition-colors group"
                    >
                      <svg className="h-4 w-4 text-slate-400 group-hover:text-brand-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-slate-700 group-hover:text-brand-teal">{t.uploads.title}</p>
                        <p className="text-xs text-slate-400">{detail.uploads.length} files</p>
                      </div>
                    </Link>
                    <Link
                      href="/mapping/menu"
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-brand-teal hover:bg-teal-50 transition-colors group"
                    >
                      <svg className="h-4 w-4 text-slate-400 group-hover:text-brand-teal flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-slate-700 group-hover:text-brand-teal">Mappings</p>
                        <p className="text-xs text-slate-400">{detail.menuMappings.length} linked</p>
                      </div>
                    </Link>
                  </div>
                </section>

                {/* Recent menu items */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {t.restaurants.recentMenuItems}
                    </p>
                    <Link
                      href={`/menus?shopId=${detail.id}&foodCourtId=${detail.foodCourtId}`}
                      className="text-[10px] font-medium text-brand-teal hover:underline flex items-center gap-0.5"
                    >
                      View in Menus
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  </div>
                  {detail.menuItems.length > 0 ? (
                    <ul className="space-y-1">
                      {(isMenuExpanded ? detail.menuItems : detail.menuItems.slice(0, 8)).map((mi) => (
                        <li key={mi.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                          <span className="text-sm text-slate-700 truncate pr-2">{mi.name}</span>
                          <span className="flex-shrink-0 text-[10px] font-medium text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 uppercase tracking-tight">{mi.category}</span>
                        </li>
                      ))}
                      {detail.menuItems.length > 8 && (
                        <li className="pt-1 pl-3">
                          <button
                            onClick={() => setIsMenuExpanded(!isMenuExpanded)}
                            className="text-xs font-medium text-brand-teal hover:text-brand-teal/80 transition-colors flex items-center gap-1"
                          >
                            {isMenuExpanded ? (
                              <>
                                Show less
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </>
                            ) : (
                              <>
                                {t.restaurants.more.replace("{count}", String(detail.menuItems.length - 8))}
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </>
                            )}
                          </button>
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No menu items yet</p>
                  )}
                </section>
              </div>
            ) : (
              <InventoryTab restaurantId={detail.id} />
            )
          ) : (
            /* Loading skeleton while detail is fetching */
            <div className="space-y-4 animate-pulse">
              <div className="h-3 bg-slate-200 rounded w-1/3" />
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded-xl" />
                ))}
              </div>
              <div className="h-3 bg-slate-200 rounded w-1/4 mt-4" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 bg-slate-100 rounded-xl" />
                <div className="h-16 bg-slate-100 rounded-xl" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sample Format Modal ──────────────────────────────────────── */}
      {showFormatModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
          onClick={() => setShowFormatModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
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
                      <tr><td className="px-3 py-2 text-slate-400">1</td><td className="px-3 py-2 font-mono text-blue-600">Shop Number</td><td className="px-3 py-2 text-slate-600">e.g. A01</td></tr>
                      <tr><td className="px-3 py-2 text-slate-400">2</td><td className="px-3 py-2 font-mono text-blue-600">Shop Name</td><td className="px-3 py-2 text-slate-600">e.g. Chicken Rice</td></tr>
                      <tr><td className="px-3 py-2 text-slate-400">3</td><td className="px-3 py-2 font-mono text-blue-600">Customer No.</td><td className="px-3 py-2 text-slate-600">e.g. CUST001</td></tr>
                      <tr><td className="px-3 py-2 text-slate-400">4</td><td className="px-3 py-2 font-mono text-blue-600">Act Flag</td><td className="px-3 py-2 text-slate-600">Y or N (N will be skipped)</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-2">Example file content:</p>
                <pre className="bg-slate-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed font-mono">
{`A01,Chicken Rice,CUST001,Y
A02,Noodle Soup,CUST002,N
A03,Som Tum,CUST003,Y`}
                </pre>
              </div>
              <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                💡 The <strong>file name</strong> (e.g. <code>Centralworld.csv</code>) will be used as the <strong>Food Court Name</strong>.
              </p>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowFormatModal(false)}
                className="text-sm px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryTab({ restaurantId }: { restaurantId: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ ingredientName: "", initialStock: "", unit: "" });

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["restaurant-inventory", restaurantId],
    queryFn: () => apiFetch<any[]>(`/api/restaurants/${restaurantId}/inventory`),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ingredientName || !form.initialStock || !form.unit) return;

    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientName: form.ingredientName,
          initialStock: parseFloat(form.initialStock),
          unit: form.unit,
        }),
      });

      if (!response.ok) throw new Error("Update failed");
      
      setForm({ ingredientName: "", initialStock: "", unit: "" });
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ["restaurant-inventory", restaurantId] });
    } catch (error) {
      console.error("Inventory error:", error);
      alert("Failed to update inventory.");
    }
  };

  if (isLoading) return <div className="animate-pulse space-y-3 mt-4"><div className="h-20 bg-slate-100 rounded-xl" /> <div className="h-20 bg-slate-100 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">{t.inventory.title}</h4>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs font-medium text-brand-teal hover:bg-teal-50 px-2 py-1 rounded transition-colors"
        >
          {isAdding ? t.common.cancel : t.inventory.addIngredient}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input
                label={t.recipes.ingredientName}
                placeholder="e.g. Rice"
                value={form.ingredientName}
                onChange={(e) => setForm({ ...form, ingredientName: e.target.value })}
                required
              />
            </div>
            <Input
              label={t.inventory.initialStock}
              type="number"
              placeholder="0.00"
              value={form.initialStock}
              onChange={(e) => setForm({ ...form, initialStock: e.target.value })}
              required
            />
            <Input
              label={t.recipes.unit}
              placeholder="e.g. kg"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              required
            />
          </div>
          <Button type="submit" size="sm" className="w-full">
            {t.common.save}
          </Button>
        </form>
      )}

      {inventory.length > 0 ? (
        <div className="space-y-3">
          {inventory.map((item) => (
            <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-brand-teal/30 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.ingredientName}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {t.inventory.lastUpdated}: {new Date(item.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                {item.remainingQty <= 0 ? (
                  <Badge variant="danger">{t.inventory.outOfStock}</Badge>
                ) : item.remainingQty < item.initialStock * 0.2 ? (
                  <Badge variant="warning">{t.inventory.lowStock}</Badge>
                ) : (
                  <Badge variant="success">Healthy</Badge>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 p-2 rounded-lg text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{t.inventory.initialStock}</p>
                  <p className="text-xs font-bold text-slate-700">{item.initialStock} <span className="text-[9px] font-normal">{item.unit}</span></p>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg text-center">
                  <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{t.inventory.usage}</p>
                  <p className="text-xs font-bold text-amber-600">-{item.usedQty .toFixed(2)}</p>
                </div>
                <div className={`p-2 rounded-lg text-center ${item.remainingQty <= 0 ? 'bg-red-50' : 'bg-brand-teal/5'}`}>
                  <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{t.inventory.remaining}</p>
                  <p className={`text-xs font-bold ${item.remainingQty <= 0 ? 'text-red-600' : 'text-brand-teal'}`}>
                    {item.remainingQty.toFixed(2)} <span className="text-[9px] font-normal">{item.unit}</span>
                  </p>
                </div>
              </div>

              {/* Simple progress bar */}
              <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    item.remainingQty <= 0 ? 'bg-red-500' : 
                    item.remainingQty < item.initialStock * 0.2 ? 'bg-amber-500' : 'bg-brand-teal'
                  }`}
                  style={{ width: `${Math.min(100, (item.remainingQty / item.initialStock) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <svg className="h-10 w-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-sm text-slate-500">No inventory tracking for this restaurant yet.</p>
          <button
            onClick={() => setIsAdding(true)}
            className="mt-3 text-xs font-medium text-brand-teal hover:underline"
          >
            + Start tracking ingredients
          </button>
        </div>
      )}
    </div>
  );
}
