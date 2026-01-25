"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { loadPosMenuData, listOpenDineInOrders, type DineInTableOrder } from "@/lib/posData";

type TableRow = {
  tableNumber: number;
  openOrder: DineInTableOrder | null;
};

const DEFAULT_TABLE_COUNT = 20;
const TABLE_COUNT_KEY = "pos.table_count";

export default function PosTablesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [tableCount, setTableCount] = useState<number>(DEFAULT_TABLE_COUNT);
  const [orders, setOrders] = useState<DineInTableOrder[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);

      try {
        const stored = typeof window !== "undefined" ? window.localStorage.getItem(TABLE_COUNT_KEY) : null;
        const parsed = stored ? Number(stored) : NaN;
        if (Number.isFinite(parsed) && parsed > 0 && parsed <= 200) setTableCount(parsed);

        const res = await loadPosMenuData();
        if (cancelled) return;

        if (res.error) {
          if (res.error.message.toLowerCase().includes("signed")) {
            router.replace("/login");
            return;
          }
          if (res.error.message.toLowerCase().includes("setup")) {
            router.replace("/setup");
            return;
          }
          throw res.error;
        }

        setRestaurantId(res.data.restaurantId);

        const dineIn = await listOpenDineInOrders(res.data.restaurantId);
        if (cancelled) return;
        if (dineIn.error) throw dineIn.error;

        setOrders(dineIn.data ?? []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load tables";
        setError(msg);
      } finally {
        setLoading(false);
      }
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

  const tables = useMemo(() => {
    const map = new Map<string, DineInTableOrder>();
    for (const o of orders) {
      const label = (o.customer_name ?? "").trim();
      if (!label) continue;
      if (!map.has(label)) map.set(label, o);
    }

    const rows: TableRow[] = [];
    for (let i = 1; i <= tableCount; i += 1) {
      const label = `Table ${i}`;
      rows.push({ tableNumber: i, openOrder: map.get(label) ?? null });
    }

    return rows;
  }, [orders, tableCount]);

  async function saveTableCount(next: number) {
    setError(null);
    const safe = Math.max(1, Math.min(200, Math.floor(next)));
    setTableCount(safe);
    try {
      window.localStorage.setItem(TABLE_COUNT_KEY, String(safe));
    } catch {
      // ignore
    }
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
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Tables</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Tap a table to open its ticket.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/pos")}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
            >
              Back to POS
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold">Table count</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Stored per device (no DB changes).
            </p>

            <div className="mt-4 flex gap-2">
              <input
                inputMode="numeric"
                value={String(tableCount)}
                onChange={(e) => void saveTableCount(Number(e.target.value))}
                className="h-10 w-32 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
              />
              <button
                onClick={() => router.refresh()}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold">Status</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Occupied tables are detected from open dine-in tickets.
            </p>

            <div className="mt-4 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="text-zinc-600 dark:text-zinc-400">Open tables</div>
                <div className="font-medium">{orders.length}</div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-zinc-600 dark:text-zinc-400">Active restaurant</div>
                <div className="font-medium">{restaurantId ? restaurantId.slice(0, 8) : "-"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tables.map((t) => {
            const occupied = !!t.openOrder;
            return (
              <button
                key={t.tableNumber}
                onClick={() => router.push(`/pos?table=${t.tableNumber}`)}
                className={`rounded-2xl border p-5 text-left shadow-sm transition-colors dark:bg-zinc-950 ${
                  occupied
                    ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
                    : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-base font-semibold">Table {t.tableNumber}</div>
                  <div
                    className={`text-xs font-medium ${
                      occupied ? "text-emerald-800 dark:text-emerald-200" : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {occupied ? "Occupied" : "Available"}
                  </div>
                </div>

                {occupied ? (
                  <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                    {t.openOrder?.ticket_no != null ? `Ticket #${t.openOrder.ticket_no}` : "Open ticket"} • ${
                      Number(t.openOrder?.total ?? 0).toFixed(2)
                    }
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Tap to open ticket</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
