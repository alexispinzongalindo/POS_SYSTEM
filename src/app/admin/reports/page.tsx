"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getSetupContext } from "@/lib/setupData";
import { listPaidOrdersForSummary, type SalesSummaryRow } from "@/lib/posData";
import { useMarketingLang } from "@/lib/useMarketingLang";

export default function AdminReportsPage() {
  const router = useRouter();
  const { lang } = useMarketingLang();
  const isEs = lang === "es";
  const t = {
    loading: isEs ? "Cargando…" : "Loading…",
    title: isEs ? "Reportes" : "Reports",
    subtitle: isEs ? "Resumen de ventas del restaurante activo." : "Sales summary for the active restaurant.",
    back: isEs ? "Volver" : "Back",
    range: isEs ? "Rango" : "Range",
    today: isEs ? "Hoy" : "Today",
    days7: isEs ? "7 días" : "7 days",
    days30: isEs ? "30 días" : "30 days",
    loadingSales: isEs ? "Cargando ventas…" : "Loading sales…",
    totals: isEs ? "Totales" : "Totals",
    gross: isEs ? "Ventas brutas" : "Gross sales",
    tickets: isEs ? "Tickets" : "Tickets",
    net: isEs ? "Ventas netas" : "Net sales",
    tax: isEs ? "IVU" : "Tax",
    byPayment: isEs ? "Por método de pago" : "By payment method",
    empty: isEs ? "No hay tickets pagados en este rango." : "No paid tickets in this range.",
    ticketsCount: isEs ? "tickets" : "tickets",
    failed: isEs ? "No se pudo cargar el reporte" : "Failed to load report",
  };

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
      if (role === "cashier" || role === "kitchen" || role === "maintenance" || role === "driver" || role === "security") {
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
          const msg = e instanceof Error ? e.message : t.failed;
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
      <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
            <p className="text-sm text-[var(--mp-muted)]">{t.subtitle}</p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white"
          >
            {t.back}
          </button>
        </div>

        {/* {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null} */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">{t.range}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setRange("today")}
                className={`inline-flex h-11 items-center justify-center rounded-xl border px-5 text-sm font-semibold ${
                  range === "today"
                    ? "border-[var(--mp-primary)] bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                    : "border-[var(--mp-border)] bg-white hover:bg-white"
                }`}
              >
                {t.today}
              </button>
              <button
                onClick={() => setRange("7d")}
                className={`inline-flex h-11 items-center justify-center rounded-xl border px-5 text-sm font-semibold ${
                  range === "7d"
                    ? "border-[var(--mp-primary)] bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                    : "border-[var(--mp-border)] bg-white hover:bg-white"
                }`}
              >
                {t.days7}
              </button>
              <button
                onClick={() => setRange("30d")}
                className={`inline-flex h-11 items-center justify-center rounded-xl border px-5 text-sm font-semibold ${
                  range === "30d"
                    ? "border-[var(--mp-primary)] bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                    : "border-[var(--mp-border)] bg-white hover:bg-white"
                }`}
              >
                {t.days30}
              </button>
            </div>

            {rowsLoading ? (
              <div className="mt-4 text-sm text-[var(--mp-muted)]">{t.loadingSales}</div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">{t.totals}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                <div className="text-xs text-[var(--mp-muted)]">{t.gross}</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">${summary.gross.toFixed(2)}</div>
              </div>
              <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                <div className="text-xs text-[var(--mp-muted)]">{t.tickets}</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{summary.ticketCount}</div>
              </div>
              <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                <div className="text-xs text-[var(--mp-muted)]">{t.net}</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">${summary.net.toFixed(2)}</div>
              </div>
              <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3">
                <div className="text-xs text-[var(--mp-muted)]">{t.tax}</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">${summary.tax.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
          <h2 className="text-base font-semibold">{t.byPayment}</h2>
          <div className="mt-4 flex flex-col gap-2">
            {summary.methods.length === 0 ? (
              <div className="text-sm text-[var(--mp-muted)]">{t.empty}</div>
            ) : (
              summary.methods.map(([method, v]) => (
                <div
                  key={method}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3"
                >
                  <div className="text-sm font-medium">{method.replaceAll("_", " ")}</div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-[var(--mp-muted)] tabular-nums">{v.count} {t.ticketsCount}</div>
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
