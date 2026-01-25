"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getOrCreateAppConfig } from "@/lib/appConfig";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);

      try {
        if (typeof window === "undefined") return;

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // Supabase invite + magic link flows often return tokens in the URL hash.
        const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
        const hashParams = new URLSearchParams(hash);
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
        } else if (access_token && refresh_token) {
          const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
          if (setErr) throw setErr;
        }

        const { data, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;

        const session = data.session;
        if (!session) {
          router.replace("/login");
          return;
        }

        const role = (session.user.app_metadata as { role?: string } | undefined)?.role ?? null;
        if (role === "cashier") {
          router.replace("/pos");
          return;
        }

        const cfg = await getOrCreateAppConfig(session.user.id);
        if (cfg.error) throw cfg.error;

        if (!cfg.data?.setup_complete) {
          router.replace("/setup");
          return;
        }

        router.replace("/admin");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Auth callback failed";
        if (!cancelled) setError(msg);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="max-w-lg rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="text-sm text-zinc-600 dark:text-zinc-400">Signing you in...</div>
    </div>
  );
}
