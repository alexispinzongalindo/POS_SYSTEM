"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";

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
  const [, setNow] = useState(Date.now());

  const loadOrders = useCallback(async (rid: string) => {
    // Get orders with status open, preparing, or ready
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("id, ticket_no, status, total, created_at, order_type, customer_name")
      .eq("restaurant_id", rid)
      .in("status", ["open", "preparing", "ready"])
      .order("created_at", { ascending: true });

    if (ordersError) {
      setError(ordersError.message);
      return;
    }

    // Load items for each order
    const withItems: KDSOrder[] = await Promise.all(
      (ordersData ?? []).map(async (o) => {
        const { data: items } = await supabase
          .from("order_items")
          .select("id, name, qty")
          .eq("order_id", o.id);
        return { ...o, items: items ?? [] };
      })
    );

    setOrders(withItems);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setError(null);

      // Validate token and get restaurant
      const { data: kdsToken, error: tokenError } = await supabase
        .from("kds_tokens")
        .select("restaurant_id, is_active")
        .eq("token", token)
        .maybeSingle();

      if (cancelled) return;

      if (tokenError || !kdsToken) {
        setError("Invalid or expired KDS link");
        setLoading(false);
        return;
      }

      if (!kdsToken.is_active) {
        setError("This KDS link has been deactivated");
        setLoading(false);
        return;
      }

      const rid = kdsToken.restaurant_id;
      setRestaurantId(rid);

      // Get restaurant name
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", rid)
        .maybeSingle();

      if (restaurant) setRestaurantName(restaurant.name);

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
  }, [token, loadOrders]);

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

    let nextStatus: string;
    if (currentStatus === "open") {
      nextStatus = "preparing";
    } else if (currentStatus === "preparing") {
      nextStatus = "ready";
    } else {
      nextStatus = "paid";
    }

    setError(null);
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", orderId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadOrders(restaurantId);
  }

  async function handleRecall(orderId: string, currentStatus: string) {
    if (!restaurantId) return;

    let prevStatus: string;
    if (currentStatus === "ready") {
      prevStatus = "preparing";
    } else if (currentStatus === "preparing") {
      prevStatus = "open";
    } else {
      return;
    }

    setError(null);
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: prevStatus })
      .eq("id", orderId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadOrders(restaurantId);
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
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                    <button
                      onClick={() => handleBump(order.id, order.status)}
                      className="flex-1 rounded-xl bg-emerald-600 py-4 text-sm font-bold text-white hover:bg-emerald-700 active:bg-emerald-800"
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

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-700 bg-zinc-800 px-4 py-2 text-center text-xs text-zinc-500">
        Auto-refreshes every 10 seconds • Tap Refresh to update now
      </div>
    </div>
  );
}
