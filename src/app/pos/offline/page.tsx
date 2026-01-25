"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { applyInventoryDelta } from "@/lib/inventory";
import {
  loadOfflineOrders,
  removeOfflineOrder,
  saveOfflineOrders,
  type OfflineOrder,
} from "@/lib/offlineOrders";
import { createOrder, loadPosMenuData, markOrderPaid } from "@/lib/posData";

function isLikelyOfflineError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  const m = msg.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("fetch failed") ||
    m.includes("network") ||
    m.includes("load failed") ||
    m.includes("timeout")
  );
}

function downloadTextFile(filename: string, content: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  if (/[\n\r",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function OfflineQueuePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [rows, setRows] = useState<OfflineOrder[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setSuccess(null);

      const res = await loadPosMenuData();
      if (cancelled) return;

      if (res.error) {
        if (res.error.message.toLowerCase().includes("signed")) {
          router.replace("/login");
          return;
        }
        setError(res.error.message);
        setLoading(false);
        return;
      }

      setRestaurantId(res.data.restaurantId);
      setRows(loadOfflineOrders(res.data.restaurantId));
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const queuedCount = rows.filter((r) => r.status === "open" || r.status === "paid").length;

  const totals = useMemo(() => {
    const gross = rows.reduce((sum, r) => sum + Number(r.payload.total), 0);
    const paid = rows.filter((r) => r.status === "paid").reduce((sum, r) => sum + Number(r.payload.total), 0);
    return { gross, paid };
  }, [rows]);

  const exportQueue = useCallback(() => {
    if (!restaurantId) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");

    downloadTextFile(
      `offline-tickets-${restaurantId}-${stamp}.json`,
      JSON.stringify({ exported_at: new Date().toISOString(), restaurant_id: restaurantId, tickets: rows }, null, 2),
      "application/json",
    );

    const header = [
      "local_id",
      "created_at",
      "status",
      "order_type",
      "subtotal",
      "tax",
      "total",
      "item_count",
      "payment_method",
      "paid_at",
    ];

    const lines = [header.join(",")];
    for (const o of rows) {
      lines.push(
        [
          o.local_id,
          o.created_at,
          o.status,
          o.payload.order_type ?? "counter",
          o.payload.subtotal,
          o.payload.tax,
          o.payload.total,
          (o.payload.items ?? []).reduce((sum, it) => sum + Number(it.qty), 0),
          o.payment?.payment_method ?? "",
          o.payment?.paid_at ?? "",
        ]
          .map(csvEscape)
          .join(","),
      );
    }

    downloadTextFile(`offline-tickets-${restaurantId}-${stamp}.csv`, lines.join("\n"), "text/csv");
  }, [restaurantId, rows]);

  const reload = useCallback(() => {
    if (!restaurantId) return;
    setRows(loadOfflineOrders(restaurantId));
  }, [restaurantId]);

  const syncOne = useCallback(
    async (o: OfflineOrder) => {
      if (!restaurantId) return;
      const created = await createOrder(o.payload);
      if (created.error) throw created.error;

      const orderId = created.data?.orderId;
      if (!orderId) throw new Error("Failed to sync offline ticket");

      if (o.status === "paid" && o.payment) {
        const paid = await markOrderPaid(orderId, {
          payment_method: o.payment.payment_method,
          paid_at: o.payment.paid_at,
          amount_tendered: o.payment.amount_tendered,
          change_due: o.payment.change_due,
        });
        if (paid.error) throw paid.error;

        try {
          applyInventoryDelta(
            restaurantId,
            o.payload.items.map((r) => ({ menu_item_id: r.menu_item_id, qty: r.qty })),
          );
        } catch {
          // ignore
        }
      }

      removeOfflineOrder(restaurantId, o.local_id);
    },
    [restaurantId],
  );

  const syncAll = useCallback(async () => {
    if (!restaurantId) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("You are offline. Connect to internet to sync.");
      return;
    }

    setError(null);
    setSuccess(null);
    setSyncing(true);

    try {
      const queued = loadOfflineOrders(restaurantId)
        .filter((o) => o.status === "open" || o.status === "paid")
        .reverse();

      for (const o of queued) {
        await syncOne(o);
      }

      setSuccess("Offline tickets synced");
      setRows(loadOfflineOrders(restaurantId));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to sync offline tickets";
      setError(isLikelyOfflineError(e) ? `${msg} (offline/network)` : msg);
    } finally {
      setSyncing(false);
    }
  }, [restaurantId, syncOne]);

  const deleteTicket = useCallback(
    (localId: string) => {
      if (!restaurantId) return;
      setError(null);
      setSuccess(null);
      const next = removeOfflineOrder(restaurantId, localId);
      setRows(next);
    },
    [restaurantId],
  );

  const markCanceled = useCallback(
    (localId: string) => {
      if (!restaurantId) return;
      const prev = loadOfflineOrders(restaurantId);
      const next = prev.map((o) => (o.local_id === localId ? { ...o, status: "canceled" as const } : o));
      saveOfflineOrders(restaurantId, next);
      setRows(next);
    },
    [restaurantId],
  );

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
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Offline Queue Manager</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage tickets created without internet (Hurricane Mode).
            </p>
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

        {success ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            {success}
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium">Queued tickets: {queuedCount}</div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                Total offline gross: ${totals.gross.toFixed(2)} • Paid offline: ${totals.paid.toFixed(2)}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={reload}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
              >
                Refresh
              </button>

              <button
                onClick={exportQueue}
                disabled={rows.length === 0}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-amber-300 bg-white px-3 text-xs font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-60 dark:border-amber-900/50 dark:bg-black dark:text-amber-100 dark:hover:bg-amber-950/40"
              >
                Export JSON+CSV
              </button>

              <button
                onClick={() => void syncAll()}
                disabled={syncing || queuedCount === 0 || (typeof navigator !== "undefined" && !navigator.onLine)}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-amber-900 px-3 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-60 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
              >
                {syncing ? "Syncing..." : "Sync all"}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {rows.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">No offline tickets.</div>
            ) : (
              rows.map((o) => {
                const itemCount = (o.payload.items ?? []).reduce((sum, it) => sum + Number(it.qty), 0);
                const canSync = o.status === "open" || o.status === "paid";

                return (
                  <div key={o.local_id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-medium">{o.local_id}</div>
                        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                          {new Date(o.created_at).toLocaleString()} • {o.payload.order_type ?? "counter"} • {o.status} • Items: {itemCount} • Total: ${Number(o.payload.total).toFixed(2)}
                        </div>
                        {o.payment ? (
                          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                            Paid: {o.payment.payment_method} • {new Date(o.payment.paid_at).toLocaleString()}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            router.push(`/pos?offline=${encodeURIComponent(o.local_id)}`);
                          }}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                        >
                          Open
                        </button>

                        <button
                          onClick={() => markCanceled(o.local_id)}
                          disabled={!canSync}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                        >
                          Cancel
                        </button>

                        <button
                          onClick={() => void (async () => {
                            if (!restaurantId) return;
                            if (typeof navigator !== "undefined" && !navigator.onLine) {
                              setError("You are offline. Connect to internet to sync.");
                              return;
                            }
                            setError(null);
                            setSuccess(null);
                            setSyncing(true);
                            try {
                              await syncOne(o);
                              setRows(loadOfflineOrders(restaurantId));
                              setSuccess(`Synced: ${o.local_id}`);
                            } catch (e) {
                              const msg = e instanceof Error ? e.message : "Failed to sync ticket";
                              setError(isLikelyOfflineError(e) ? `${msg} (offline/network)` : msg);
                            } finally {
                              setSyncing(false);
                            }
                          })()}
                          disabled={syncing || !canSync || (typeof navigator !== "undefined" && !navigator.onLine)}
                          className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                        >
                          Sync
                        </button>

                        <button
                          onClick={() => deleteTicket(o.local_id)}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-1">
                      {(o.payload.items ?? []).slice(0, 6).map((it) => (
                        <div key={it.menu_item_id} className="text-xs text-zinc-600 dark:text-zinc-400">
                          {it.qty} x {it.name} (${Number(it.unit_price).toFixed(2)})
                        </div>
                      ))}
                      {(o.payload.items ?? []).length > 6 ? (
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">
                          + {(o.payload.items ?? []).length - 6} more items
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
