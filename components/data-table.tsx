"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

interface DataTableProps<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  data: T[];
  onRowClick?: (row: T) => void;
  globalFilter?: string;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  globalFilter: externalFilter,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState(externalFilter ?? "");
  const { t } = useI18n();

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: externalFilter ?? globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[480px] overflow-y-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-cpx-blue-light sticky top-0 z-10 shadow-sm">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cpx-blue-dark cursor-pointer select-none bg-cpx-blue-light"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" && " \u2191"}
                    {header.column.getIsSorted() === "desc" && " \u2193"}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-sm text-slate-500"
              >
                {t.common.noData}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`${onRowClick ? "cursor-pointer hover:bg-cpx-blue-light/50" : ""}`}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
