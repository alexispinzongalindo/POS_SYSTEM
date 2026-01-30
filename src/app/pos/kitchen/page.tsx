"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getOrCreateAppConfig } from "@/lib/appConfig";
import {
  listKitchenOrders,
  getOrderItems,
  updateOrderStatus,
  type OrderSummary,
  type OrderItemRow,
  type OrderStatus,
} from "@/lib/posData";

const STATUS_COLORS: Record<string, string> = {
  open: "border-red-400 bg-red-50",
  preparing: "border-yellow-400 bg-yellow-50",
  ready: "border-green-400 bg-green-50",
};

const STATUS_LABELS: Record<string, string> = {
  open: "NEW",
  preparing: "PREPARING",
  ready: "READY",
};

type KitchenOrder = OrderSummary & { items: OrderItemRow[] };

export default function KitchenDisplayPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [, setNow] = useState(Date.now());
  const [statusStartedAt, setStatusStartedAt] = useState<Record<string, string>>({});

  const loadOrders = useCallback(async (restId: string) => {
    const res = await listKitchenOrders(restId);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    const ordersWithItems: KitchenOrder[] = [];
    for (const order of res.data ?? []) {
      const itemsRes = await getOrderItems(order.id);
      ordersWithItems.push({
        ...order,
        items: itemsRes.data ?? [],
      });
    }

    setOrders(ordersWithItems);
  }, []);

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

      const restId = cfg.data.restaurant_id;
      if (!restId) {
        setError("No restaurant selected");
        setLoading(false);
        return;
      }

      setRestaurantId(restId);
      await loadOrders(restId);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router, loadOrders]);

  // Real-time subscription to orders table
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          loadOrders(restaurantId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
        },
        () => {
          loadOrders(restaurantId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, loadOrders]);

  async function changeStatus(orderId: string, newStatus: OrderStatus) {
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (restaurantId) {
      await loadOrders(restaurantId);
    }
  }

  function getElapsedTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const totalSeconds = Math.floor(diff / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function getStatusKey(orderId: string, status: string) {
    return `${orderId}:${status}`;
  }

  // Track per-order status start times locally (no DB changes required).
  // This will be accurate from the moment the KDS screen starts observing the order.
  useEffect(() => {
    if (!restaurantId) return;

    const storageKey = `islapos:kdsStatusStartedAt:${restaurantId}`;
    let existing: Record<string, string> = {};

    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      if (raw) existing = JSON.parse(raw) as Record<string, string>;
    } catch {
      existing = {};
    }

    const next = { ...existing };
    const nowIso = new Date().toISOString();

    for (const o of orders) {
      const currentKey = getStatusKey(o.id, o.status);

      // If this status hasn't been seen for this order, start timer.
      if (!next[currentKey]) {
        // For brand-new orders, anchor to created_at.
        // For later statuses, we start from "now" since DB doesn't store status change time.
        next[currentKey] = o.status === "open" ? o.created_at : nowIso;
      }

      // If the order changed status, ensure older status keys don't keep being used.
      // We keep them in storage (harmless), but the UI always reads the current status key.
    }

    setStatusStartedAt(next);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }, [orders, restaurantId]);

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-zinc-400">Loading kitchen display...</div>
      </div>
    );
  }

  const newOrders = orders.filter((o) => o.status === "open");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-700 px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Kitchen Display</h1>
          <span className="text-sm text-zinc-400">
            {orders.length} active order{orders.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
          <a
            href="/admin/orders"
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-600"
          >
            All Orders
          </a>
          <a
            href="/pos"
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-600"
          >
            POS
          </a>
        </div>
      </div>

      {error ? (
        <div className="mx-6 mt-4 rounded-lg bg-red-900/50 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {/* Orders Grid */}
      <div className="grid grid-cols-3 gap-4 p-6">
        {/* New Orders Column */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              New ({newOrders.length})
            </h2>
          </div>
          <div className="space-y-3">
            {newOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={changeStatus}
                getElapsedTime={getElapsedTime}
                statusStartedAt={statusStartedAt}
              />
            ))}
          </div>
        </div>

        {/* Preparing Column */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Preparing ({preparingOrders.length})
            </h2>
          </div>
          <div className="space-y-3">
            {preparingOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={changeStatus}
                getElapsedTime={getElapsedTime}
                statusStartedAt={statusStartedAt}
              />
            ))}
          </div>
        </div>

        {/* Ready Column */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Ready ({readyOrders.length})
            </h2>
          </div>
          <div className="space-y-3">
            {readyOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={changeStatus}
                getElapsedTime={getElapsedTime}
                statusStartedAt={statusStartedAt}
              />
            ))}
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <svg className="h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-lg">No active orders</p>
          <p className="text-sm mt-1">New orders will appear here automatically</p>
        </div>
      ) : null}
    </div>
  );
}

function OrderCard({
  order,
  onStatusChange,
  getElapsedTime,
  statusStartedAt,
}: {
  order: KitchenOrder;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  getElapsedTime: (dateStr: string) => string;
  statusStartedAt: Record<string, string>;
}) {
  const statusKey = `${order.id}:${order.status}`;
  const startedAt = statusStartedAt[statusKey] ?? order.created_at;
  const statusElapsed = getElapsedTime(startedAt);

  return (
    <div
      className={`rounded-xl border-2 p-4 ${STATUS_COLORS[order.status] ?? "border-zinc-600 bg-zinc-800"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-zinc-900">
            #{order.ticket_no ?? "—"}
          </span>
          <span className="rounded bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-white">
            {STATUS_LABELS[order.status] ?? order.status.toUpperCase()}
          </span>
        </div>
        <span className="text-lg font-bold tabular-nums text-yellow-500 animate-pulse">{getElapsedTime(order.created_at)}</span>
      </div>

      {/* Order Type & Customer */}
      <div className="mt-2 text-sm text-zinc-700">
        <span className="font-medium">
          {order.order_type === "dine_in"
            ? order.customer_name || "Dine In"
            : order.order_type === "delivery"
            ? "Delivery"
            : order.order_type === "pickup"
            ? "Pickup"
            : "Counter"}
        </span>
        {order.customer_name && order.order_type !== "dine_in" ? (
          <span className="ml-2">• {order.customer_name}</span>
        ) : null}
      </div>

      {/* Items */}
      <div className="mt-3 space-y-1">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-start gap-2 text-sm text-zinc-800">
            <span className="font-bold">{item.qty}x</span>
            <span>{item.name}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        {order.status === "open" ? (
          <button
            onClick={() => onStatusChange(order.id, "preparing")}
            className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 active:bg-red-800"
          >
            <span className="flex items-center justify-center gap-2">
              <span>Start</span>
              <span className="tabular-nums">{statusElapsed}</span>
            </span>
          </button>
        ) : null}
        {order.status === "preparing" ? (
          <button
            onClick={() => onStatusChange(order.id, "ready")}
            className="flex-1 rounded-lg bg-yellow-500 py-2 text-sm font-semibold text-white hover:bg-yellow-600 active:bg-yellow-700"
          >
            <span className="flex items-center justify-center gap-2">
              <span>Ready</span>
              <span className="tabular-nums">{statusElapsed}</span>
            </span>
          </button>
        ) : null}
        {order.status === "ready" ? (
          <button
            onClick={() => onStatusChange(order.id, "paid")}
            className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800"
          >
            <span className="flex items-center justify-center gap-2">
              <span>Done</span>
              <span className="tabular-nums">{statusElapsed}</span>
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
