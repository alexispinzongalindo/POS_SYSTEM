"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import {
  listKitchenOrders,
  getOrderItems,
  updateOrderStatus,
  type OrderSummary,
  type OrderItemRow,
  type OrderStatus,
} from "@/lib/posData";
import { getSetupContext } from "@/lib/setupData";
import MarketingLogo from "@/components/MarketingLogo";

type KDSOrder = OrderSummary & { items: OrderItemRow[] };

const STATUS_COLORS: Record<string, string> = {
  open: "border-amber-400 bg-amber-50",
  preparing: "border-blue-400 bg-blue-50",
  ready: "border-emerald-400 bg-emerald-50",
};

const STATUS_LABELS: Record<string, string> = {
  open: "NEW",
  preparing: "PREPARING",
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

export default function KDSPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [now, setNow] = useState(Date.now());

  const loadOrders = useCallback(async (rid: string) => {
    const res = await listKitchenOrders(rid);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    const summaries = res.data ?? [];

    // Load items for each order
    const withItems: KDSOrder[] = await Promise.all(
      summaries.map(async (o) => {
        const itemsRes = await getOrderItems(o.id);
        return { ...o, items: itemsRes.data ?? [] };
      })
    );

    setOrders(withItems);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setError(null);
      const ctx = await getSetupContext();
      if (cancelled) return;

      if (ctx.error || !ctx.session) {
        router.replace("/login");
        return;
      }

      const rid = (ctx.config?.restaurant_id as string | null) ?? null;
      if (!rid) {
        router.replace("/setup/restaurant");
        return;
      }

      setRestaurantId(rid);

      try {
        await loadOrders(rid);
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
  }, [router, loadOrders]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!restaurantId) return;

    const interval = setInterval(() => {
      void loadOrders(restaurantId);
      setNow(Date.now());
    }, 10000);

    return () => clearInterval(interval);
  }, [restaurantId, loadOrders]);

  // Update elapsed time every second for accurate timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleBump(orderId: string, currentStatus: string) {
    if (!restaurantId) return;

    let nextStatus: OrderStatus;
    if (currentStatus === "open") {
      nextStatus = "preparing";
    } else if (currentStatus === "preparing") {
      nextStatus = "ready";
    } else {
      // Already ready - bump removes from KDS (mark as paid or done)
      nextStatus = "paid";
    }

    setError(null);
    const res = await updateOrderStatus(orderId, nextStatus);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    await loadOrders(restaurantId);
  }

  async function handleRecall(orderId: string, currentStatus: string) {
    if (!restaurantId) return;

    let prevStatus: OrderStatus;
    if (currentStatus === "ready") {
      prevStatus = "preparing";
    } else if (currentStatus === "preparing") {
      prevStatus = "open";
    } else {
      return; // Can't recall from open
    }

    setError(null);
    const res = await updateOrderStatus(orderId, prevStatus);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    await loadOrders(restaurantId);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
        <div className="text-lg">Loading KDS...</div>
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
          <MarketingLogo size={32} variant="mark" />
          <span className="text-lg font-bold tracking-tight">Kitchen Display</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
            <span>New: {openOrders.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
            <span>Preparing: {preparingOrders.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />
            <span>Ready: {readyOrders.length}</span>
          </div>
          <button
            onClick={() => restaurantId && loadOrders(restaurantId)}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {orders.map((order) => {
              const elapsed = getElapsedMinutes(order.created_at);
              const isUrgent = elapsed >= 15 && order.status !== "ready";
              const isWarning = elapsed >= 10 && elapsed < 15 && order.status !== "ready";

              return (
                <div
                  key={order.id}
                  className={`relative flex flex-col rounded-2xl border-2 ${STATUS_COLORS[order.status] ?? "border-zinc-600 bg-zinc-800"} ${isUrgent ? "animate-pulse ring-2 ring-red-500" : ""}`}
                >
                  {/* Order Header */}
                  <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-zinc-900">
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
                        className="text-lg font-bold tabular-nums text-yellow-500 animate-pulse"
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
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-white">
                            {item.qty}
                          </span>
                          <span className="text-sm font-medium text-zinc-900">{item.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 border-t border-black/10 p-3">
                    {order.status !== "open" && (
                      <button
                        onClick={() => handleRecall(order.id, order.status)}
                        className="flex-1 rounded-xl bg-zinc-300 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-400"
                      >
                        RECALL
                      </button>
                    )}
                    <button
                      onClick={() => handleBump(order.id, order.status)}
                      className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 active:bg-emerald-800"
                    >
                      {order.status === "open"
                        ? "Start"
                        : order.status === "preparing"
                          ? "Ready"
                          : "Done"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
