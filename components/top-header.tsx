"use client";

import { useI18n, type Locale } from "@/lib/i18n";

interface TopHeaderProps {
  sidebarCollapsed: boolean;
}

export function TopHeader({ sidebarCollapsed }: TopHeaderProps) {
  const { t, locale, setLocale } = useI18n();

  const toggleLocale = () => {
    setLocale(locale === "en" ? "th" : ("en" as Locale));
  };

  return (
    <header
      className={`fixed top-0 right-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6 transition-all duration-300 ${
        sidebarCollapsed ? "left-16" : "left-60"
      }`}
    >
      <h1 className="text-sm font-semibold text-cpx-blue-dark">
        {t.common.appName}
      </h1>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleLocale}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          title={locale === "en" ? "Switch to Thai" : "เปลี่ยนเป็นภาษาอังกฤษ"}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
          {locale === "en" ? "TH" : "EN"}
        </button>
        <div className="h-8 w-8 rounded-full bg-cpx-blue flex items-center justify-center text-xs font-bold text-white">
          A
        </div>
      </div>
    </header>
  );
}
