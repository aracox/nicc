"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { Card, KpiCard } from "@/components/card";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Select } from "@/components/select";
import { Badge } from "@/components/badge";
import { useI18n } from "@/lib/i18n";

interface RestaurantOption {
  id: string;
  name: string;
  shopNumber: string;
}

interface InsightsReportResponse {
  filters: {
    startDate: string;
    endDate: string;
    shopNumber: string;
    compare: boolean;
  };
  summary: {
    revenue: number;
    orders: number;
    itemsSold: number;
    aov: number;
    revenueDeltaPct: number;
    ordersDeltaPct: number;
    itemsDeltaPct: number;
    aovDeltaPct: number;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  };
  executive: {
    highlights: string[];
  };
  charts: {
    dailyRevenue: { date: string; current: number; previous: number }[];
    ordersByHour: { hour: string; orders: number }[];
    weekdayPerformance: { day: string; revenue: number }[];
    topMenus: { label: string; qty: number; revenue: number }[];
    menuMix: { label: string; value: number }[];
    risingMenus: { label: string; delta: number }[];
    decliningMenus: { label: string; delta: number }[];
    shopComparison: {
      shopNumber: string;
      shopName: string;
      revenue: number;
      orders: number;
      aov: number;
      dataQuality: number;
    }[];
  };
  dataQuality: {
    score: number;
    missingCritical: number;
    missingByField: { field: string; missing: number }[];
    confidence: "HIGH" | "MEDIUM" | "LOW";
  };
  recommendations: {
    priority: "HIGH" | "MEDIUM" | "LOW";
    action: string;
    reason: string;
    expectedImpact: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  }[];
}

const PIE_COLORS = ["#0055A6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

function formatNumber(value: unknown) {
  return typeof value === "number" ? value.toLocaleString() : "-";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function deltaText(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function confidenceBadge(confidence: "HIGH" | "MEDIUM" | "LOW") {
  if (confidence === "HIGH") return <Badge variant="success">HIGH</Badge>;
  if (confidence === "MEDIUM") return <Badge variant="warning">MEDIUM</Badge>;
  return <Badge variant="danger">LOW</Badge>;
}

function priorityBadge(priority: "HIGH" | "MEDIUM" | "LOW") {
  if (priority === "HIGH") return <Badge variant="danger">HIGH</Badge>;
  if (priority === "MEDIUM") return <Badge variant="warning">MEDIUM</Badge>;
  return <Badge variant="default">LOW</Badge>;
}

export default function InsightsPage() {
  const { t } = useI18n();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [shopNumber, setShopNumber] = useState("");
  const [compare, setCompare] = useState(true);

  const [applied, setApplied] = useState({
    startDate: "",
    endDate: "",
    shopNumber: "",
    compare: true,
  });
  const [filterError, setFilterError] = useState("");

  const { data: restaurants = [] } = useQuery({
    queryKey: ["restaurants-for-insights"],
    queryFn: () => apiFetch<RestaurantOption[]>("/api/restaurants"),
  });

  const shopOptions = useMemo(
    () =>
      restaurants.map((r) => ({
        value: r.shopNumber,
        label: `${r.shopNumber} - ${r.name}`,
      })),
    [restaurants],
  );

  const reportParams = new URLSearchParams();
  if (applied.startDate) reportParams.set("startDate", applied.startDate);
  if (applied.endDate) reportParams.set("endDate", applied.endDate);
  if (applied.shopNumber) reportParams.set("shopNumber", applied.shopNumber);
  reportParams.set("compare", String(applied.compare));

  const hasAppliedDateRange = Boolean(applied.startDate && applied.endDate);

  const { data, isLoading, error } = useQuery({
    queryKey: ["insights-report", applied],
    queryFn: () =>
      apiFetch<InsightsReportResponse>(
        `/api/insights/report?${reportParams.toString()}`,
      ),
    enabled: hasAppliedDateRange,
  });

  if (isLoading && hasAppliedDateRange) {
    return <p className="text-sm text-slate-500">{t.common.loading}</p>;
  }

  const canShowReport = hasAppliedDateRange && Boolean(data);
  const report = data;

  const onGenerate = () => {
    setFilterError("");
    if (!startDate || !endDate) {
      setFilterError(
        "Please select both Period Start and Period End before generating report.",
      );
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setFilterError("Period Start must be earlier than Period End.");
      return;
    }
    setApplied({ startDate, endDate, shopNumber, compare });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">{t.insights.title}</h2>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{t.insights.confidence}</span>
          {canShowReport && report ? confidenceBadge(report.summary.confidence) : <span>-</span>}
        </div>
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            type="date"
            label={t.insights.periodStart}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            type="date"
            label={t.insights.periodEnd}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Select
            label={t.insights.shop}
            placeholder={t.insights.allShops}
            value={shopNumber}
            onChange={(e) => setShopNumber(e.target.value)}
            options={shopOptions}
          />
          <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
            />
            {t.insights.comparePrevious}
          </label>
          <div className="flex items-end">
            <Button onClick={onGenerate} className="w-full">
              {t.insights.generate}
            </Button>
          </div>
        </div>
        {filterError ? (
          <p className="mt-3 text-sm text-red-600">{filterError}</p>
        ) : null}
      </Card>

      {!hasAppliedDateRange ? (
        <Card>
          <p className="text-sm text-slate-500">
            Please select Period Start and Period End, then click Generate.
          </p>
        </Card>
      ) : null}

      {error && hasAppliedDateRange ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{t.common.errorDbDown}</p>
        </div>
      ) : null}

      {!canShowReport ? null : (
        <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t.insights.revenue}
          value={formatCurrency(report!.summary.revenue)}
          sub={deltaText(report!.summary.revenueDeltaPct)}
          color="blue"
        />
        <KpiCard
          label={t.insights.totalOrders}
          value={formatNumber(report!.summary.orders)}
          sub={deltaText(report!.summary.ordersDeltaPct)}
          color="green"
        />
        <KpiCard
          label={t.insights.itemsSold}
          value={formatNumber(report!.summary.itemsSold)}
          sub={deltaText(report!.summary.itemsDeltaPct)}
          color="gold"
        />
        <KpiCard
          label={t.insights.aov}
          value={formatCurrency(report!.summary.aov)}
          sub={deltaText(report!.summary.aovDeltaPct)}
          color="blue"
        />
      </div>

      <Card className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">{t.insights.executiveSummary}</h3>
          {confidenceBadge(report!.summary.confidence)}
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {report!.executive.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">{t.insights.dailyRevenueTrend}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report!.charts.dailyRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#475569" }} minTickGap={14} />
                <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11, fill: "#475569" }} width={62} />
                <Tooltip formatter={(value) => formatNumber(value)} />
                <Legend />
                <Line type="monotone" dataKey="current" name={t.insights.currentPeriod} stroke="#0ea5e9" strokeWidth={2.5} dot={false} />
                {applied.compare && (
                  <Line type="monotone" dataKey="previous" name={t.insights.previousPeriod} stroke="#94a3b8" strokeWidth={2} dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">{t.insights.ordersByHour}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report!.charts.ordersByHour} margin={{ top: 4, right: 8, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#475569" }} minTickGap={8} />
                <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11, fill: "#475569" }} width={52} />
                <Tooltip formatter={(value) => formatNumber(value)} />
                <Bar dataKey="orders" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">{t.insights.weekdayPerformance}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report!.charts.weekdayPerformance} margin={{ top: 4, right: 8, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11, fill: "#475569" }} width={62} />
                <Tooltip formatter={(value) => formatNumber(value)} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">{t.insights.menuMix}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={report!.charts.menuMix} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95}>
                  {report!.charts.menuMix.map((entry, index) => (
                    <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatNumber(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">{t.insights.topMenus}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-2 pr-3">Menu</th>
                  <th className="pb-2 pr-3 text-right">Qty</th>
                  <th className="pb-2 pr-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {report!.charts.topMenus.map((m) => (
                  <tr key={m.label} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 pr-3 font-medium text-slate-700">{m.label}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-600">{formatNumber(m.qty)}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-700">{formatCurrency(m.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">{t.insights.dataQuality}</h3>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-slate-500">{t.insights.confidence}</span>
            {confidenceBadge(report!.dataQuality.confidence)}
          </div>
          <p className="mb-3 text-2xl font-bold text-slate-800">{report!.dataQuality.score}%</p>
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-blue"
              style={{ width: `${report!.dataQuality.score}%` }}
            />
          </div>
          <div className="space-y-2 text-xs">
            {report!.dataQuality.missingByField.map((f) => (
              <div key={f.field} className="flex items-center justify-between text-slate-600">
                <span>{f.field}</span>
                <span>{formatNumber(f.missing)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">{t.insights.shopComparison}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="pb-2 pr-3">Shop</th>
                <th className="pb-2 pr-3 text-right">Revenue</th>
                <th className="pb-2 pr-3 text-right">Orders</th>
                <th className="pb-2 pr-3 text-right">AOV</th>
                <th className="pb-2 pr-3 text-right">Data Quality</th>
              </tr>
            </thead>
            <tbody>
              {report!.charts.shopComparison.map((s) => (
                <tr key={`${s.shopNumber}-${s.shopName}`} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-3 text-slate-700">{s.shopNumber} - {s.shopName}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-700">{formatCurrency(s.revenue)}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-600">{formatNumber(s.orders)}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-600">{formatCurrency(s.aov)}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-600">{s.dataQuality}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">{t.insights.recommendations}</h3>
        <div className="space-y-3">
          {report!.recommendations.map((r, index) => (
            <div key={`${r.action}-${index}`} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-2 flex items-center gap-2">
                {priorityBadge(r.priority)}
                {confidenceBadge(r.confidence)}
              </div>
              <p className="text-sm font-semibold text-slate-800">{r.action}</p>
              <p className="mt-1 text-sm text-slate-600">{r.reason}</p>
              <p className="mt-1 text-xs text-slate-500">{r.expectedImpact}</p>
            </div>
          ))}
        </div>
      </Card>
        </>
      )}
    </div>
  );
}
