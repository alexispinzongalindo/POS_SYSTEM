"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getOrCreateAppConfig } from "@/lib/appConfig";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;

      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        router.replace("/login");
        return;
      }

      const role = (data.session.user.app_metadata as { role?: string } | undefined)?.role ?? null;
      if (role === "cashier") {
        router.replace("/pos");
        return;
      }

      const userId = data.session.user.id;
      const cfg = await getOrCreateAppConfig(userId);
      if (cancelled) return;
      if (cfg.error) {
        setError(cfg.error.message);
        setLoading(false);
        return;
      }

      if (cfg.data?.setup_complete) {
        router.replace("/admin");
        return;
      }

      setEmail(data.session.user.email ?? null);
      setLoading(false);
    }

    void load();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Setup</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Signed in as {email ?? "(unknown)"}
          </p>
        </div>

        {/* {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null} */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => router.push("/setup/restaurant")}
            className="rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            <h2 className="text-base font-semibold">1) Business</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Name, branding, contact info.
            </p>
          </button>

          <button
            onClick={() => router.push("/setup/location")}
            className="rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            <h2 className="text-base font-semibold">2) Location</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Address, timezone, business hours.
            </p>
          </button>

          <button
            onClick={() => router.push("/setup/taxes")}
            className="rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            <h2 className="text-base font-semibold">3) Taxes</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Tax settings (IVU).</p>
          </button>

          <button
            onClick={() => router.push("/setup/menu")}
            className="rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            <h2 className="text-base font-semibold">4) Products</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Categories and items.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
