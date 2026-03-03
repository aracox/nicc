"use client";

import { useState } from "react";
import { SidebarNav } from "./sidebar-nav";
import { TopHeader } from "./top-header";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <SidebarNav collapsed={collapsed} onToggle={() => setCollapsed((p) => !p)} />
      <TopHeader sidebarCollapsed={collapsed} />
      <main
        className={`pt-14 transition-all duration-300 ${
          collapsed ? "ml-16" : "ml-60"
        }`}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
