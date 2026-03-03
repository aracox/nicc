"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { KpiCard } from "@/components/card";
import { Card } from "@/components/card";
import { SimpleSvgBarChart } from "@/components/simple-svg-bar-chart";
import { SimpleSvgLineChart } from "@/components/simple-svg-line-chart";
import { useI18n } from "@/lib/i18n";

interface DashboardData {
  kpis: {
    restaurantsOnboarded: number;
    totalRestaurants: number;
    uploadsToday: number;
    failedUploads: number;
    publishedReports: number;
    draftReports: number;
  };
  charts: {
    menuItemsByRestaurant: { label: string; value: number }[];
    uploadsByStatus: { label: string; value: number }[];
  };
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
      <h2 className="mb-6 text-xl font-bold text-slate-900">
        {t.dashboard.title}
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t.dashboard.restaurantsOnboarded}
          value={data.kpis.restaurantsOnboarded}
          sub={t.dashboard.ofTotal.replace(
            "{total}",
            String(data.kpis.totalRestaurants)
          )}
          color="blue"
        />
        <KpiCard
          label={t.dashboard.uploadsToday}
          value={data.kpis.uploadsToday}
          color="green"
        />
        <KpiCard
          label={t.dashboard.failedUploads}
          value={data.kpis.failedUploads}
          color="red"
        />
        <KpiCard
          label={t.dashboard.publishedReports}
          value={data.kpis.publishedReports}
          sub={t.dashboard.drafts.replace(
            "{count}",
            String(data.kpis.draftReports)
          )}
          color="gold"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <SimpleSvgBarChart
            data={data.charts.menuItemsByRestaurant}
            title={t.dashboard.menuItemsByRestaurant}
            color="#0055A6"
          />
        </Card>
        <Card>
          <SimpleSvgLineChart
            data={data.charts.uploadsByStatus}
            title={t.dashboard.uploadsByStatus}
            color="#10b981"
          />
        </Card>
      </div>
    </div>
  );
}
