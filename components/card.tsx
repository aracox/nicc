import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: "blue" | "green" | "red" | "gold";
}

const colorMap = {
  blue: "bg-cpx-blue-light text-cpx-blue-dark border-cpx-blue/20",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-red-50 text-red-700 border-red-200",
  gold: "bg-cpx-gold-light text-amber-800 border-cpx-gold/30",
} as const;

export function KpiCard({ label, value, sub, color = "blue" }: KpiCardProps) {
  return (
    <div className={`rounded-lg border p-5 shadow-sm ${colorMap[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-70">{sub}</p>}
    </div>
  );
}
