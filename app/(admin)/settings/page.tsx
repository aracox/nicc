"use client";

import { Card } from "@/components/card";
import { useI18n } from "@/lib/i18n";

export default function SettingsPage() {
  const { t } = useI18n();

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-slate-900">
        {t.settings.title}
      </h2>
      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg
            className="mb-4 h-12 w-12 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-slate-700">
            {t.settings.accessControl}
          </h3>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            {t.settings.placeholder}
          </p>
        </div>
      </Card>
    </div>
  );
}
