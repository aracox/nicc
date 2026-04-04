"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { useI18n } from "@/lib/i18n";

interface ChartPoint {
  label: string;
  value: number;
}

interface DashboardData {
  kpis: {
    restaurantsOnboarded: number;
    totalRestaurants: number;
    totalRevenue: number;
    totalTransactions: number;
    totalItemsSold: number;
  };
  charts: {
    revenueByShop: ChartPoint[];
    topSellingItems: ChartPoint[];
    transactionsByShop: ChartPoint[];
    dailyRevenueTrend: ChartPoint[];
    transactionsByHour: ChartPoint[];
  };
}

const PIE_COLORS = ["#0055A6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

function formatNumber(value: unknown) {
  return typeof value === "number" ? value.toLocaleString() : "-";
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      <div className="h-72">{children}</div>
    </Card>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardData>("/api/dashboard"),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-500">{t.common.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{t.common.errorDbDown}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-slate-900">{t.dashboard.title}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t.dashboard.restaurantsOnboarded}
          value={data.kpis.restaurantsOnboarded}
          sub={t.dashboard.ofTotal.replace("{total}", String(data.kpis.totalRestaurants))}
          color="blue"
        />
        <KpiCard
          label={t.dashboard.totalTransactions}
          value={new Intl.NumberFormat("en-US").format(data.kpis.totalTransactions)}
          color="green"
        />
        <KpiCard
          label={t.dashboard.totalItemsSold}
          value={new Intl.NumberFormat("en-US").format(data.kpis.totalItemsSold)}
          color="gold"
        />
        <KpiCard
          label={t.dashboard.totalRevenue}
          value={new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(data.kpis.totalRevenue)}
          color="blue"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title={t.dashboard.revenueByShop}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.charts.revenueByShop} margin={{ top: 4, right: 8, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" angle={-18} textAnchor="end" height={58} tick={{ fontSize: 11, fill: "#475569" }} />
              <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11, fill: "#475569" }} width={62} />
              <Tooltip formatter={(value) => formatNumber(value)} />
              <Bar dataKey="value" fill="#0055A6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t.dashboard.topSellingItems}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.charts.topSellingItems} margin={{ top: 4, right: 8, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" angle={-18} textAnchor="end" height={58} tick={{ fontSize: 11, fill: "#475569" }} />
              <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11, fill: "#475569" }} width={52} />
              <Tooltip formatter={(value) => formatNumber(value)} />
              <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t.dashboard.dailyRevenueTrend}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.charts.dailyRevenueTrend} margin={{ top: 4, right: 8, left: 0, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#475569" }} minTickGap={14} />
              <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11, fill: "#475569" }} width={62} />
              <Tooltip formatter={(value) => formatNumber(value)} />
              <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 2.5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t.dashboard.transactionsByHour}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.charts.transactionsByHour} margin={{ top: 4, right: 8, left: 0, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#475569" }} minTickGap={10} />
              <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11, fill: "#475569" }} width={52} />
              <Tooltip formatter={(value) => formatNumber(value)} />
              <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2.5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard title={t.dashboard.revenueShareByShop}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.charts.revenueByShop}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={2}
                >
                  {data.charts.revenueByShop.map((entry, index) => (
                    <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatNumber(value)} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title={t.dashboard.transactionsByShop}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.charts.transactionsByShop} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tickFormatter={formatNumber} tick={{ fontSize: 11, fill: "#475569" }} />
              <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11, fill: "#475569" }} />
              <Tooltip formatter={(value) => formatNumber(value)} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
