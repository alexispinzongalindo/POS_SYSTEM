"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

const SETUP_COMPLETE_KEY = "pos_setup_complete";

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

      const isComplete = localStorage.getItem(SETUP_COMPLETE_KEY) === "true";
      if (isComplete) {
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

  function markComplete() {
    localStorage.setItem(SETUP_COMPLETE_KEY, "true");
    router.replace("/admin");
  }

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

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold">1) Restaurant</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Name, branding, contact info.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold">2) Location</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Address, timezone, business hours.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold">3) Puerto Rico taxes</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              IVU settings.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold">4) Menu</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Categories, items, modifiers.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={markComplete}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
          >
            Mark setup complete (temporary)
          </button>
        </div>
      </div>
    </div>
  );
}
