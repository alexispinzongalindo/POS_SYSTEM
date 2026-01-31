"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

type OrderItem = {
  id: string;
  name: string;
  qty: number;
};

type KDSOrder = {
  id: string;
  ticket_no: number | null;
  status: string;
  total: number;
  created_at: string;
  order_type: string | null;
  customer_name: string | null;
  items: OrderItem[];
};

const STATUS_COLORS: Record<string, string> = {
  open: "border-amber-400 bg-amber-50",
  preparing: "border-blue-400 bg-blue-50",
  ready: "border-emerald-400 bg-emerald-50",
};

const STATUS_LABELS: Record<string, string> = {
  open: "NEW",
  preparing: "COOKING",
  ready: "READY",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  open: "bg-amber-500 text-white",
  preparing: "bg-blue-500 text-white",
  ready: "bg-emerald-500 text-white",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getElapsedMinutes(iso: string) {
  const created = new Date(iso).getTime();
  const now = Date.now();
  return Math.floor((now - created) / 60000);
}

function getElapsedTime(iso: string) {
  const created = new Date(iso).getTime();
  const now = Date.now();
  const totalSeconds = Math.floor((now - created) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function PublicKDSPage() {
  const params = useParams();
  const token = (params?.token as string) ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [statusStartedAt, setStatusStartedAt] = useState<Record<string, string>>({});
  const [, setNow] = useState(Date.now());

  const statusStorageKey = `kdsStatusStartedAt:token:${token}`;

  function getStatusKey(orderId: string, status: string) {
    return `${orderId}:${status}`;
  }

  function syncStatusStartedAt(nextOrders: KDSOrder[]) {
    try {
      const raw = localStorage.getItem(statusStorageKey);
      const prev = raw ? (JSON.parse(raw) as Record<string, string>) : {};

      const next = { ...prev };
      for (const o of nextOrders) {
        const key = getStatusKey(o.id, o.status);

        // Clear other statuses for this order (status changed)
        for (const s of ["open", "preparing", "ready"]) {
          const k = getStatusKey(o.id, s);
          if (k !== key) delete next[k];
        }

        if (!next[key]) next[key] = o.created_at;
      }

      localStorage.setItem(statusStorageKey, JSON.stringify(next));
      setStatusStartedAt(next);
    } catch {
      // ignore storage errors
    }
  }

  function setStatusStart(orderId: string, status: string, iso: string) {
    try {
      const raw = localStorage.getItem(statusStorageKey);
      const prev = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      const next = { ...prev };

      for (const s of ["open", "preparing", "ready"]) {
        const k = getStatusKey(orderId, s);
        if (s !== status) delete next[k];
      }

      next[getStatusKey(orderId, status)] = iso;
      localStorage.setItem(statusStorageKey, JSON.stringify(next));
      setStatusStartedAt(next);
    } catch {
      // ignore
    }
  }

  const loadOrders = useCallback(async () => {
    const r = await fetch(`/api/kds/${encodeURIComponent(token)}`, {
      method: "GET",
      headers: {
        "content-type": "application/json",
      },
      cache: "no-store",
    });

    const payload = (await r.json().catch(() => null)) as
      | { error?: string; restaurantId?: string; restaurantName?: string | null; orders?: KDSOrder[] }
      | null;

    if (!r.ok) {
      setError(payload?.error ?? "Failed to load orders");
      return;
    }

    setError(null);
    setRestaurantId(payload?.restaurantId ?? null);
    setRestaurantName(payload?.restaurantName ?? null);
    const nextOrders = payload?.orders ?? [];
    setOrders(nextOrders);
    syncStatusStartedAt(nextOrders);
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setError(null);
      try {
        await loadOrders();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load orders");
      } finally {
        setLoading(false);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [token, loadOrders]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      void loadOrders();
      setNow(Date.now());
    }, 10000);

    return () => clearInterval(interval);
  }, [loadOrders]);

  // Update elapsed time every second for accurate timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleBump(orderId: string, currentStatus: string) {
    setError(null);

    const r = await fetch(`/api/kds/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ orderId, action: "bump" }),
    });

    const payload = (await r.json().catch(() => null)) as { error?: string; orders?: KDSOrder[] } | null;
    if (!r.ok) {
      setError(payload?.error ?? "Failed to update order");
      return;
    }

    const nowIso = new Date().toISOString();
    const nextStatus =
      currentStatus === "open"
        ? "preparing"
        : currentStatus === "preparing"
          ? "ready"
          : "paid";
    if (nextStatus !== "paid") setStatusStart(orderId, nextStatus, nowIso);

    const nextOrders = payload?.orders ?? [];
    setOrders(nextOrders);
    syncStatusStartedAt(nextOrders);
  }

  async function handleRecall(orderId: string, currentStatus: string) {
    setError(null);

    const r = await fetch(`/api/kds/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ orderId, action: "recall" }),
    });

    const payload = (await r.json().catch(() => null)) as { error?: string; orders?: KDSOrder[] } | null;
    if (!r.ok) {
      setError(payload?.error ?? "Failed to update order");
      return;
    }

    const nowIso = new Date().toISOString();
    const prevStatus = currentStatus === "ready" ? "preparing" : currentStatus === "preparing" ? "open" : null;
    if (prevStatus) setStatusStart(orderId, prevStatus, nowIso);

    const nextOrders = payload?.orders ?? [];
    setOrders(nextOrders);
    syncStatusStartedAt(nextOrders);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
        <div className="text-center">
          <div className="text-lg">Loading Kitchen Display...</div>
          <div className="mt-2 text-sm text-zinc-400">Connecting to orders</div>
        </div>
      </div>
    );
  }

  if (error && !restaurantId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
        <div className="text-center">
          <div className="text-6xl">🔒</div>
          <div className="mt-4 text-xl text-red-400">{error}</div>
          <div className="mt-2 text-sm text-zinc-400">Please scan a valid KDS QR code</div>
        </div>
      </div>
    );
  }

  const openOrders = orders.filter((o) => o.status === "open");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👨‍🍳</span>
          <div>
            <span className="text-lg font-bold tracking-tight">Kitchen Display</span>
            {restaurantName && (
              <span className="ml-2 text-sm text-zinc-400">• {restaurantName}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
            <span>New: {openOrders.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
            <span>Cooking: {preparingOrders.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />
            <span>Ready: {readyOrders.length}</span>
          </div>
          <button
            onClick={() => void loadOrders()}
            className="rounded-lg bg-zinc-700 px-3 py-1.5 text-sm font-medium hover:bg-zinc-600"
          >
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-4 rounded-lg bg-red-900/50 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Orders Grid */}
      <div className="p-4">
        {orders.length === 0 ? (
          <div className="flex h-[60vh] items-center justify-center text-zinc-500">
            <div className="text-center">
              <div className="text-6xl">🍽️</div>
              <div className="mt-4 text-xl">No active orders</div>
              <div className="mt-1 text-sm">Orders will appear here when placed</div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {orders.map((order) => {
              const elapsed = getElapsedMinutes(order.created_at);
              const isUrgent = elapsed >= 15 && order.status !== "ready";
              const isWarning = elapsed >= 10 && elapsed < 15 && order.status !== "ready";
              const startedAt = statusStartedAt[getStatusKey(order.id, order.status)] ?? order.created_at;
              const statusElapsed = getElapsedTime(startedAt);

              return (
                <div
                  key={order.id}
                  className={`relative flex flex-col rounded-2xl border-2 ${STATUS_COLORS[order.status] ?? "border-zinc-600 bg-zinc-800"} ${isUrgent ? "animate-pulse ring-2 ring-red-500" : ""}`}
                >
                  {/* Order Header */}
                  <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-zinc-900">
                        #{order.ticket_no ?? "—"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${STATUS_BADGE_COLORS[order.status] ?? "bg-zinc-500 text-white"}`}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-600">{formatTime(order.created_at)}</div>
                      <div
                        className="text-lg font-bold tabular-nums text-black animate-pulse"
                      >
                        {getElapsedTime(order.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Order Type & Customer */}
                  {(order.order_type || order.customer_name) && (
                    <div className="border-b border-black/10 px-4 py-2 text-sm">
                      {order.order_type && (
                        <span className="mr-2 rounded bg-zinc-200 px-2 py-0.5 text-xs font-semibold uppercase text-zinc-700">
                          {order.order_type.replace("_", " ")}
                        </span>
                      )}
                      {order.customer_name && (
                        <span className="font-medium text-zinc-800">{order.customer_name}</span>
                      )}
                    </div>
                  )}

                  {/* Items */}
                  <div className="flex-1 px-4 py-3">
                    <ul className="space-y-2">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex items-start gap-2">
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-white">
                            {item.qty}
                          </span>
                          <span className="text-base font-medium text-zinc-900">{item.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 border-t border-black/10 p-3">
                    {order.status !== "open" && (
                      <button
                        onClick={() => handleRecall(order.id, order.status)}
                        className="flex-1 rounded-xl bg-zinc-300 py-4 text-sm font-bold text-zinc-700 hover:bg-zinc-400 active:bg-zinc-500"
                      >
                        ← BACK
                      </button>
                    )}
                    {order.status === "open" ? (
                      <button
                        onClick={() => handleBump(order.id, order.status)}
                        className="flex-1 rounded-xl bg-red-600 py-4 text-sm font-bold text-black hover:bg-red-700 active:bg-red-800"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span>Start</span>
                          <span className="tabular-nums text-black">{statusElapsed}</span>
                        </span>
                      </button>
                    ) : null}
                    {order.status === "preparing" ? (
                      <button
                        onClick={() => handleBump(order.id, order.status)}
                        className="flex-1 rounded-xl bg-yellow-500 py-4 text-sm font-bold text-black hover:bg-yellow-600 active:bg-yellow-700"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span>Ready</span>
                          <span className="tabular-nums text-black">{statusElapsed}</span>
                        </span>
                      </button>
                    ) : null}
                    {order.status === "ready" ? (
                      <button
                        onClick={() => handleBump(order.id, order.status)}
                        className="flex-1 rounded-xl bg-emerald-600 py-4 text-sm font-bold text-black hover:bg-emerald-700 active:bg-emerald-800"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span>Done</span>
                          <span className="tabular-nums text-black">{statusElapsed}</span>
                        </span>
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-700 bg-zinc-800 px-4 py-2 text-center text-xs text-zinc-500">
        Auto-refreshes every 10 seconds • Tap Refresh to update now
      </div>
    </div>
  );
}
