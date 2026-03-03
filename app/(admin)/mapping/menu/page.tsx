"use client";

import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { useI18n } from "@/lib/i18n";

interface UnmappedMenuItem {
  id: string;
  name: string;
  category: string;
  restaurantId: string;
  createdAt: string;
  restaurant: { id: string; name: string };
}

export default function MenuMappingPage() {
  const { t } = useI18n();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["unmapped-menu"],
    queryFn: () =>
      apiFetch<UnmappedMenuItem[]>("/api/mappings/unmapped-menu"),
  });

  const columns: ColumnDef<UnmappedMenuItem, unknown>[] = [
    {
      accessorKey: "restaurant.name",
      header: t.uploads.restaurant,
      cell: ({ row }) => row.original.restaurant.name,
    },
    { accessorKey: "name", header: t.mapping.menuItem },
    { accessorKey: "category", header: t.mapping.category },
    {
      accessorKey: "createdAt",
      header: t.common.createdAt,
      cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
    },
    {
      id: "actions",
      header: t.common.actions,
      cell: () => (
        <span className="text-xs text-slate-400 italic">
          {t.mapping.notImplemented}
        </span>
      ),
    },
  ];

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-slate-900">
        {t.mapping.title}
      </h2>
      <p className="mb-6 text-sm text-slate-500">{t.mapping.description}</p>

      {isLoading ? (
        <p className="text-sm text-slate-500">{t.common.loading}</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-600">
            {t.mapping.unmappedCount.replace("{count}", String(items.length))}
          </p>
          <DataTable columns={columns} data={items} />
        </>
      )}
    </div>
  );
}
