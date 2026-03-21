"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { useI18n } from "@/lib/i18n";

// Let's create a server action file for auth to be cleaner if needed, 
// but for simplicity in this mockup, I'll use a standard API call or a direct server action if supported.

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [username, setUsername] = useState("test");
  const [password, setPassword] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // In a real app we'd fetch an API route. 
      // For this mock, I'll call a simple API route I'll create.
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("Invalid credentials. Try test / admin");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold text-cpx-blue-dark mb-2">
              {t.common.appName}
            </h1>
            <p className="text-sm text-slate-500">
              Please sign in to your account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Username
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-md border border-red-100">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={loading}
              variant="primary"
            >
              Sign In
            </Button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">© 2024 NICC</span>
            <div className="flex gap-4">
              <span className="text-xs font-medium text-cpx-blue hover:text-cpx-blue-dark cursor-pointer transition-colors">
                Help
              </span >
              <span className="text-xs font-medium text-cpx-blue hover:text-cpx-blue-dark cursor-pointer transition-colors">
                Privacy
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
