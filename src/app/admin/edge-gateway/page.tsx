"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getOrCreateAppConfig } from "@/lib/appConfig";

type PairStartResponse = {
  code?: string;
  expiresAt?: string;
  error?: string;
} | null;

export default function AdminEdgeGatewayPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);

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
      if (role === "cashier" || role === "kitchen" || role === "maintenance" || role === "driver" || role === "security") {
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

      if (!cfg.data?.setup_complete) {
        router.replace("/setup");
        return;
      }

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

  async function authedFetch(path: string, init?: RequestInit) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      router.replace("/login");
      throw new Error("Not signed in");
    }

    return fetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        authorization: `Bearer ${token}`,
      },
    });
  }

  async function generateCode() {
    if (generating) return;

    setGenerating(true);
    setError(null);
    setStatus(null);

    try {
      const res = await authedFetch("/api/edge/pair/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const json = (await res.json().catch(() => null)) as PairStartResponse;
      if (!res.ok || json?.error) {
        throw new Error(json?.error ?? `Failed (${res.status})`);
      }

      const nextCode = typeof json?.code === "string" ? json.code : null;
      const nextExpires = typeof json?.expiresAt === "string" ? json.expiresAt : null;

      if (!nextCode) throw new Error("Failed to generate code");

      setCode(nextCode);
      setExpiresAt(nextExpires);
      setStatus("Pairing code created.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }

  async function copyCode() {
    if (!code) return;

    setStatus(null);
    setError(null);

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        setStatus("Copied.");
        return;
      }
      setStatus("Copy not available on this device.");
    } catch {
      setStatus("Copy failed.");
    }
  }

  if (loading) {
    return (
      <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
        <div className="text-sm text-[var(--mp-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Edge Gateway</h1>
            <p className="mt-2 text-sm text-[var(--mp-muted)]">Generate a pairing code for your Windows Print Hub.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-zinc-50"
          >
            Back
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {status ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {status}
          </div>
        ) : null}

        <div className="mt-8 rounded-3xl border border-[var(--mp-border)] bg-white p-7 shadow-sm">
          <div className="text-base font-semibold">Pairing Code</div>
          <div className="mt-2 text-sm text-[var(--mp-muted)]">Codes expire in about 60 minutes.</div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={generateCode}
              disabled={generating}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
            >
              {generating ? "Generating..." : "Generate code"}
            </button>

            <button
              type="button"
              onClick={copyCode}
              disabled={!code}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-60"
            >
              Copy
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--mp-border)] bg-zinc-50 px-5 py-4">
              <div className="text-xs font-semibold text-[var(--mp-muted)]">CODE</div>
              <div className="mt-2 text-2xl font-semibold tracking-widest">{code ?? "—"}</div>
            </div>
            <div className="rounded-2xl border border-[var(--mp-border)] bg-zinc-50 px-5 py-4">
              <div className="text-xs font-semibold text-[var(--mp-muted)]">EXPIRES</div>
              <div className="mt-2 text-sm font-semibold">{expiresAt ?? "—"}</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--mp-border)] bg-white px-5 py-4 text-sm text-[var(--mp-muted)]">
            On the Windows PC running the Gateway, open its local page and enter the code to pair.
          </div>
        </div>
      </div>
    </div>
  );
}
