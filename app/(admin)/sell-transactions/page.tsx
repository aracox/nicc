"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { apiFetch } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/input";
import { Button } from "@/components/button";
import { useI18n } from "@/lib/i18n";

interface SellTransaction {
  id: string;
  transactionId: string;
  shopNumber: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  dateTime: string;
  createdAt: string;
}

export default function SellTransactionsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [search, setSearch] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);

  const params = new URLSearchParams();
  if (search) params.set("q", search);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["sellTransactions", search],
    queryFn: () =>
      apiFetch<SellTransaction[]>(`/api/sell-transactions?${params.toString()}`),
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
      const response = await fetch("/api/sell-transactions/import", {
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
      alert(t.sellTransactions.importSuccess.replace("{count}", String(result.count)));
      
      queryClient.invalidateQueries({ queryKey: ["sellTransactions"] });
    } catch (error) {
      console.error("Import error:", error);
      alert(t.sellTransactions.importError);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSftpPull = async () => {
    setIsPulling(true);
    try {
      const response = await fetch("/api/sell-transactions/sftp", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("sFTP Pull failed");
      }

      await response.json();
      alert(t.sellTransactions.pullSftpSuccess);
      queryClient.invalidateQueries({ queryKey: ["sellTransactions"] });
    } catch (error) {
      console.error("sFTP Pull Error:", error);
      alert(t.sellTransactions.pullSftpError);
    } finally {
      setIsPulling(false);
    }
  };

  const columns: ColumnDef<SellTransaction, unknown>[] = [
    { accessorKey: "transactionId", header: t.sellTransactions.transactionId },
    { accessorKey: "dateTime", header: t.sellTransactions.dateTime },
    { accessorKey: "shopNumber", header: t.sellTransactions.shopNumber },
    {
      accessorKey: "totalAmount",
      header: t.sellTransactions.totalAmount,
      cell: ({ row }) => {
        const amount = row.original.totalAmount;
        return typeof amount === 'number' ? amount.toFixed(2) : "-";
      },
    },
    { accessorKey: "paymentMethod", header: t.sellTransactions.paymentMethod },
    {
      accessorKey: "status",
      header: t.sellTransactions.status,
      cell: ({ row }) => {
        const currentStatus = row.original.status || "Unknown";
        let statusStyles = "bg-slate-100 text-slate-800";
        if (currentStatus.toLowerCase() === "completed") statusStyles = "bg-green-100 text-green-800";
        if (currentStatus.toLowerCase() === "failed") statusStyles = "bg-red-100 text-red-800";
        if (currentStatus.toLowerCase() === "pending") statusStyles = "bg-amber-100 text-amber-800";
        
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded ${statusStyles}`}>
            {currentStatus}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">
          {t.sellTransactions.title}
        </h2>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSftpPull}
            isLoading={isPulling}
            className="flex items-center gap-2 text-blue-600 hover:bg-blue-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {isPulling ? t.sellTransactions.pullingSftp : t.sellTransactions.pullSftp}
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
            {t.sellTransactions.importCsv}
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
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          label={t.common.search}
          placeholder={t.sellTransactions.searchPlaceholder}
          className="w-72"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">{t.common.loading}</p>
      ) : transactions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          <p>{t.common.noData}</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={transactions}
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
                <p className="text-sm text-slate-500 mb-2">The CSV file should contain columns resembling this order:</p>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Column</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr><td className="px-3 py-2 font-mono text-blue-600">Transaction ID</td><td className="px-3 py-2 text-slate-600">Unique ID (e.g. TX001)</td></tr>
                      <tr><td className="px-3 py-2 font-mono text-blue-600">Date/Time</td><td className="px-3 py-2 text-slate-600">Timestamp</td></tr>
                      <tr><td className="px-3 py-2 font-mono text-blue-600">Shop No.</td><td className="px-3 py-2 text-slate-600">Shop Number</td></tr>
                      <tr><td className="px-3 py-2 font-mono text-blue-600">Total Amount</td><td className="px-3 py-2 text-slate-600">Amount</td></tr>
                      <tr><td className="px-3 py-2 font-mono text-blue-600">Payment Method</td><td className="px-3 py-2 text-slate-600">E.g. Cash, Credit Card</td></tr>
                      <tr><td className="px-3 py-2 font-mono text-blue-600">Status</td><td className="px-3 py-2 text-slate-600">Optional (Completed/Failed)</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-2">Example content:</p>
                <pre className="bg-slate-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed font-mono">
{`Transaction ID,Date/Time,Shop No.,Total Amount,Payment Method,Status
TX001,2026-04-01 10:00:00,803201,150.50,Cash,Completed
TX002,2026-04-01 10:05:30,803202,60.00,PromptPay,Completed`}
                </pre>
              </div>
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
