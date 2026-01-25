"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getSetupContext } from "@/lib/setupData";
import { listPaidOrdersForSummary, type SalesSummaryRow } from "@/lib/posData";

export default function AdminReportsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [range, setRange] = useState<"today" | "7d" | "30d">("today");
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rows, setRows] = useState<SalesSummaryRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);

      const ctx = await getSetupContext();
      if (cancelled) return;

      if (ctx.error || !ctx.session) {
        router.replace("/login");
        return;
      }

      const role = (ctx.session.user.app_metadata as { role?: string } | undefined)?.role ?? null;
      if (role === "cashier") {
        router.replace("/pos");
        return;
      }

      const rid = (ctx.config?.restaurant_id as string | null) ?? null;
      if (!rid) {
        router.replace("/setup/restaurant");
        return;
      }

      setRestaurantId(rid);
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

  useEffect(() => {
    if (!restaurantId) return;
    if (loading) return;

    const now = new Date();
    const since =
      range === "today"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        : range === "7d"
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const t = window.setTimeout(() => {
      void (async () => {
        setRowsLoading(true);
        setError(null);
        try {
          const res = await listPaidOrdersForSummary(restaurantId, { since });
          if (res.error) throw res.error;
          setRows(res.data ?? []);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Failed to load report";
          setError(msg);
        } finally {
          setRowsLoading(false);
        }
      })();
    }, 150);

    return () => window.clearTimeout(t);
  }, [loading, range, restaurantId]);

  const summary = useMemo(() => {
    const gross = rows.reduce((sum, r) => sum + Number(r.total), 0);
    const tax = rows.reduce((sum, r) => sum + Number(r.tax), 0);
    const net = rows.reduce((sum, r) => sum + Number(r.subtotal), 0);
    const ticketCount = rows.length;

    const byMethod: Record<string, { gross: number; count: number }> = {};
    for (const r of rows) {
      const key = (r.payment_method ?? "unknown").toLowerCase();
      byMethod[key] = byMethod[key] ?? { gross: 0, count: 0 };
      byMethod[key].gross += Number(r.total);
      byMethod[key].count += 1;
    }

    const methods = Object.entries(byMethod).sort((a, b) => b[1].gross - a[1].gross);

    return { gross, tax, net, ticketCount, methods };
  }, [rows]);

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
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Sales summary for the active restaurant.</p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
          >
            Back
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold">Range</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setRange("today")}
                className={`inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium ${
                  range === "today"
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
                    : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setRange("7d")}
                className={`inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium ${
                  range === "7d"
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
                    : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                }`}
              >
                7 days
              </button>
              <button
                onClick={() => setRange("30d")}
                className={`inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium ${
                  range === "30d"
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
                    : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                }`}
              >
                30 days
              </button>
            </div>

            {rowsLoading ? (
              <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading sales...</div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold">Totals</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Gross sales</div>
                <div className="mt-1 text-base font-semibold tabular-nums">${summary.gross.toFixed(2)}</div>
              </div>
              <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Tickets</div>
                <div className="mt-1 text-base font-semibold tabular-nums">{summary.ticketCount}</div>
              </div>
              <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Net sales</div>
                <div className="mt-1 text-base font-semibold tabular-nums">${summary.net.toFixed(2)}</div>
              </div>
              <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Tax</div>
                <div className="mt-1 text-base font-semibold tabular-nums">${summary.tax.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">By payment method</h2>
          <div className="mt-4 flex flex-col gap-2">
            {summary.methods.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">No paid tickets in this range.</div>
            ) : (
              summary.methods.map(([method, v]) => (
                <div
                  key={method}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                >
                  <div className="text-sm font-medium">{method.replaceAll("_", " ")}</div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">{v.count} tickets</div>
                    <div className="text-sm font-semibold tabular-nums">${v.gross.toFixed(2)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
