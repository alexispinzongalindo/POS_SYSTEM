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
  open: "border-blue-400 bg-blue-50",
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

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!restaurantId) return;

    const interval = setInterval(() => {
      loadOrders(restaurantId);
    }, 10000);

    return () => clearInterval(interval);
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

  function getTimeSince(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins === 1) return "1 min ago";
    return `${mins} mins ago`;
  }

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
          <button
            onClick={() => restaurantId && loadOrders(restaurantId)}
            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-600"
          >
            Refresh
          </button>
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
            <div className="h-3 w-3 rounded-full bg-blue-400" />
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
                getTimeSince={getTimeSince}
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
                getTimeSince={getTimeSince}
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
                getTimeSince={getTimeSince}
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
  getTimeSince,
}: {
  order: KitchenOrder;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  getTimeSince: (dateStr: string) => string;
}) {
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
        <span className="text-xs text-zinc-600">{getTimeSince(order.created_at)}</span>
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
            className="flex-1 rounded-lg bg-yellow-500 py-2 text-sm font-semibold text-white hover:bg-yellow-600"
          >
            Start
          </button>
        ) : null}
        {order.status === "preparing" ? (
          <button
            onClick={() => onStatusChange(order.id, "ready")}
            className="flex-1 rounded-lg bg-green-500 py-2 text-sm font-semibold text-white hover:bg-green-600"
          >
            Ready
          </button>
        ) : null}
        {order.status === "ready" ? (
          <button
            onClick={() => onStatusChange(order.id, "paid")}
            className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Complete
          </button>
        ) : null}
      </div>
    </div>
  );
}
