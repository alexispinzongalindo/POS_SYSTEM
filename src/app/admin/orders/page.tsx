"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getOrCreateAppConfig } from "@/lib/appConfig";
import {
  listAllOrders,
  getOrderItems,
  updateOrderStatus,
  type OrderSummary,
  type OrderItemRow,
  type OrderStatus,
  type OrderType,
} from "@/lib/posData";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  preparing: "bg-yellow-100 text-yellow-800",
  ready: "bg-green-100 text-green-800",
  paid: "bg-emerald-100 text-emerald-800",
  canceled: "bg-zinc-100 text-zinc-600",
  refunded: "bg-red-100 text-red-800",
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  counter: "Counter",
  pickup: "Pickup",
  delivery: "Delivery",
  dine_in: "Dine In",
};

function toDateInputValue(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDayIso(dateInput: string) {
  const d = new Date(`${dateInput}T00:00:00`);
  return d.toISOString();
}

function endOfLocalDayIso(dateInput: string) {
  const d = new Date(`${dateInput}T23:59:59.999`);
  return d.toISOString();
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "">("");
  const [filterType, setFilterType] = useState<OrderType | "">("");
  const [filterFrom, setFilterFrom] = useState<string>(() => toDateInputValue(new Date()));
  const [filterTo, setFilterTo] = useState<string>(() => toDateInputValue(new Date()));

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
  }, [router]);

  async function loadOrders(restId?: string) {
    const id = restId ?? restaurantId;
    if (!id) return;

    const since = filterFrom ? startOfLocalDayIso(filterFrom) : undefined;
    const until = filterTo ? endOfLocalDayIso(filterTo) : undefined;

    const res = await listAllOrders(id, {
      limit: 100,
      status: filterStatus || undefined,
      orderType: filterType || undefined,
      since,
      until,
    });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    setOrders(res.data ?? []);
  }

  async function selectOrder(order: OrderSummary) {
    setSelectedOrder(order);
    setLoadingItems(true);
    const res = await getOrderItems(order.id);
    setLoadingItems(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setOrderItems(res.data ?? []);
  }

  async function deleteSelected() {
    if (deleting) return;
    const ids = Object.entries(selectedIds)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (ids.length === 0) return;

    const ok = typeof window !== "undefined" ? window.confirm(`Delete ${ids.length} transaction(s)? This cannot be undone.`) : false;
    if (!ok) return;

    setDeleting(true);
    setError(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token ?? null;
      if (!token) {
        router.replace("/login");
        return;
      }

      const r = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderIds: ids }),
      });

      const payload = (await r.json().catch(() => null)) as { error?: string } | null;
      if (!r.ok) {
        setError(payload?.error ?? "Failed to delete transactions");
        return;
      }

      setSelectedIds({});
      if (selectedOrder && ids.includes(selectedOrder.id)) {
        setSelectedOrder(null);
        setOrderItems([]);
      }
      await loadOrders();
    } finally {
      setDeleting(false);
    }
  }

  async function changeStatus(orderId: string, newStatus: OrderStatus) {
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    await loadOrders();
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  }

  useEffect(() => {
    if (restaurantId) {
      loadOrders();
    }
  }, [filterStatus, filterType, filterFrom, filterTo]);

  // Real-time subscription to orders table
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, filterStatus, filterType]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--mp-bg)] flex items-center justify-center">
        <div className="text-[var(--mp-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
            <p className="mt-1 text-sm text-[var(--mp-muted)]">
              View and manage all orders
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/pos/kitchen"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 text-sm font-medium text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
            >
              Kitchen Display
            </a>
            <a
              href="/admin"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm font-medium hover:bg-zinc-50"
            >
              ← Back
            </a>
          </div>
        </div>

        {/* {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null} */}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as OrderStatus | "")}
            className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="paid">Paid</option>
            <option value="canceled">Canceled</option>
            <option value="refunded">Refunded</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as OrderType | "")}
            className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm"
          >
            <option value="">All types</option>
            <option value="counter">Counter</option>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
            <option value="dine_in">Dine In</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-[var(--mp-muted)]">
            <span>From:</span>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm text-[var(--mp-fg)]"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--mp-muted)]">
            <span>To:</span>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="h-10 rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm text-[var(--mp-fg)]"
            />
          </label>

          <button
            type="button"
            onClick={deleteSelected}
            disabled={deleting || Object.values(selectedIds).every((v) => !v)}
            className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete selected"}
          </button>

          <span className="flex items-center gap-2 text-xs text-[var(--mp-muted)]">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live updates
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Orders List */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-[var(--mp-border)] bg-white shadow-sm">
              <div className="border-b border-[var(--mp-border)] px-4 py-3">
                <h2 className="text-sm font-semibold">Orders ({orders.length})</h2>
              </div>

              {orders.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[var(--mp-muted)]">
                  No orders found
                </div>
              ) : (
                <div className="divide-y divide-[var(--mp-border)]">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className={`flex items-stretch gap-3 px-4 py-3 hover:bg-zinc-50 ${
                        selectedOrder?.id === order.id ? "bg-emerald-50" : ""
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedIds[order.id])}
                          onChange={(e) => setSelectedIds((prev) => ({ ...prev, [order.id]: e.target.checked }))}
                          className="h-4 w-4"
                        />
                      </div>

                      <button
                        onClick={() => selectOrder(order)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">
                              #{order.ticket_no ?? "—"}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                STATUS_COLORS[order.status] ?? "bg-zinc-100"
                              }`}
                            >
                              {order.status}
                            </span>
                            <span className="text-xs text-[var(--mp-muted)]">
                              {ORDER_TYPE_LABELS[order.order_type ?? "counter"] ?? order.order_type}
                            </span>
                          </div>
                          <span className="text-sm font-medium tabular-nums">
                            ${order.total.toFixed(2)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-[var(--mp-muted)]">
                          <span>{order.customer_name || "Walk-in"}</span>
                          <span>{new Date(order.created_at).toLocaleString()}</span>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Order Details */}
          <div>
            <div className="rounded-2xl border border-[var(--mp-border)] bg-white shadow-sm">
              <div className="border-b border-[var(--mp-border)] px-4 py-3">
                <h2 className="text-sm font-semibold">Order Details</h2>
              </div>

              {!selectedOrder ? (
                <div className="px-4 py-8 text-center text-sm text-[var(--mp-muted)]">
                  Select an order to view details
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">
                      #{selectedOrder.ticket_no ?? "—"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[selectedOrder.status] ?? "bg-zinc-100"
                      }`}
                    >
                      {selectedOrder.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--mp-muted)]">Type</span>
                      <span>{ORDER_TYPE_LABELS[selectedOrder.order_type ?? "counter"]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--mp-muted)]">Customer</span>
                      <span>{selectedOrder.customer_name || "Walk-in"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--mp-muted)]">Total</span>
                      <span className="font-semibold">${selectedOrder.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--mp-muted)]">Created</span>
                      <span>{new Date(selectedOrder.created_at).toLocaleString()}</span>
                    </div>
                    {selectedOrder.payment_method ? (
                      <div className="flex justify-between">
                        <span className="text-[var(--mp-muted)]">Payment</span>
                        <span>{selectedOrder.payment_method}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Items */}
                  <div className="mt-4 border-t border-[var(--mp-border)] pt-4">
                    <h3 className="text-sm font-semibold">Items</h3>
                    {loadingItems ? (
                      <div className="mt-2 text-sm text-[var(--mp-muted)]">Loading...</div>
                    ) : orderItems.length === 0 ? (
                      <div className="mt-2 text-sm text-[var(--mp-muted)]">No items</div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {orderItems.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>
                              {item.qty}x {item.name}
                            </span>
                            <span className="tabular-nums">${item.line_total.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status Actions */}
                  {selectedOrder.status !== "paid" &&
                    selectedOrder.status !== "canceled" &&
                    selectedOrder.status !== "refunded" ? (
                    <div className="mt-4 border-t border-[var(--mp-border)] pt-4">
                      <h3 className="text-sm font-semibold mb-2">Update Status</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedOrder.status === "open" ? (
                          <button
                            onClick={() => changeStatus(selectedOrder.id, "preparing")}
                            className="rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600"
                          >
                            Start Preparing
                          </button>
                        ) : null}
                        {selectedOrder.status === "preparing" ? (
                          <button
                            onClick={() => changeStatus(selectedOrder.id, "ready")}
                            className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600"
                          >
                            Mark Ready
                          </button>
                        ) : null}
                        {selectedOrder.status !== "canceled" ? (
                          <button
                            onClick={() => changeStatus(selectedOrder.id, "canceled")}
                            className="rounded-lg bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-300"
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
