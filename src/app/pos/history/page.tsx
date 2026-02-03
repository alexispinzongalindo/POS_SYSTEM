"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getOrCreateAppConfig } from "@/lib/appConfig";
import {
  getOrderReceipt,
  listAllOrders,
  refundOrder,
  updateOrderStatus,
  type OrderReceipt,
  type OrderStatus,
  type OrderSummary,
  type OrderType,
} from "@/lib/posData";

type SourceFilter = "all" | "counter" | "pickup" | "delivery" | "dine_in";

type StatusFilter = "all" | OrderStatus;

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

const STATUS_BADGE: Record<string, string> = {
  open: "bg-amber-100 text-amber-900",
  preparing: "bg-blue-100 text-blue-900",
  ready: "bg-emerald-100 text-emerald-900",
  paid: "bg-emerald-100 text-emerald-900",
  canceled: "bg-zinc-100 text-zinc-700",
  refunded: "bg-red-100 text-red-800",
};

function statusLabel(s: string) {
  if (s === "preparing") return "In Kitchen";
  if (s === "open") return "New";
  if (s === "ready") return "Ready";
  if (s === "paid") return "Paid";
  if (s === "canceled") return "Canceled";
  if (s === "refunded") return "Refunded";
  return s;
}

function typeLabel(t: string | null | undefined) {
  if (!t) return "";
  if (t === "counter") return "Counter";
  if (t === "pickup") return "Takeout";
  if (t === "delivery") return "Delivery";
  if (t === "dine_in") return "Dine-in";
  return t;
}

function money(n: unknown) {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? x.toFixed(2) : "0.00";
}

export default function PosOrderHistoryPage() {
  const router = useRouter();

  const ordersLoadingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [source, setSource] = useState<SourceFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [applyNonce, setApplyNonce] = useState(0);

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find((o) => o.id === selectedOrderId) ?? null;
  }, [orders, selectedOrderId]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setError(null);
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessionError) throw sessionError;
        if (!data.session) {
          router.replace("/login");
          return;
        }

        const u = data.session.user;
        setUserId(u.id);

        const meta = (u.app_metadata ?? {}) as Record<string, unknown>;
        const role = typeof meta.role === "string" ? meta.role : null;
        const ridFromMeta = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;

        if (role === "manager" || role === "cashier") {
          if (!ridFromMeta) {
            setError("No restaurant assigned");
            setLoading(false);
            return;
          }
          setRestaurantId(ridFromMeta);
          setLoading(false);
          return;
        }

        const cfg = await getOrCreateAppConfig(u.id);
        if (cfg.error) throw cfg.error;
        if (!cfg.data?.setup_complete) {
          router.replace("/setup");
          return;
        }
        if (!cfg.data.restaurant_id) {
          setError("No restaurant selected");
          setLoading(false);
          return;
        }

        setRestaurantId(cfg.data.restaurant_id);
        setLoading(false);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load";
        setError(msg);
        setLoading(false);
      }
    }

    void init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  async function loadOrders() {
    if (!restaurantId) return;
    if (ordersLoadingRef.current) return;

    ordersLoadingRef.current = true;
    setError(null);

    try {
      const since = date ? startOfLocalDayIso(date) : undefined;
      const until = date ? endOfLocalDayIso(date) : undefined;

      const opts: {
        limit: number;
        status?: OrderStatus;
        orderType?: OrderType;
        since?: string;
        until?: string;
      } = {
        limit: 150,
        since,
        until,
      };

      if (status !== "all") opts.status = status;
      if (source !== "all") opts.orderType = source;

      const res = await listAllOrders(restaurantId, opts);
      if (res.error) {
        setError(res.error.message);
        return;
      }

      const next = res.data ?? [];
      setOrders(next);

      if (selectedOrderId && next.every((o) => o.id !== selectedOrderId)) {
        setSelectedOrderId(null);
        setReceipt(null);
      }
    } finally {
      ordersLoadingRef.current = false;
    }
  }

  useEffect(() => {
    if (!restaurantId) return;
    void loadOrders();
  }, [restaurantId, applyNonce]);

  useEffect(() => {
    if (!restaurantId) return;

    const id = setInterval(() => {
      setApplyNonce((n) => n + 1);
    }, 10_000);

    return () => {
      clearInterval(id);
    };
  }, [restaurantId]);

  async function viewOrder(orderId: string) {
    setSelectedOrderId(orderId);
    setReceipt(null);
    setReceiptLoading(true);
    setError(null);
    try {
      const res = await getOrderReceipt(orderId);
      if (res.error) throw res.error;
      setReceipt(res.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load order";
      setError(msg);
    } finally {
      setReceiptLoading(false);
    }
  }

  async function voidOrder(order: OrderSummary) {
    if (!restaurantId) return;

    const ok = typeof window !== "undefined" ? window.confirm("Void this order?") : false;
    if (!ok) return;

    setError(null);

    if (order.status === "paid") {
      const reason = typeof window !== "undefined" ? window.prompt("Refund reason (optional)") : "";
      const by = userId;
      if (!by) {
        router.replace("/login");
        return;
      }

      const res = await refundOrder(order.id, {
        refunded_by_user_id: by,
        refund_reason: reason?.trim() ? reason.trim() : null,
        refunded_at: new Date().toISOString(),
      });

      if (res.error) {
        setError(res.error.message);
        return;
      }

      await loadOrders();
      if (selectedOrderId === order.id) {
        await viewOrder(order.id);
      }
      return;
    }

    const res = await updateOrderStatus(order.id, "canceled");
    if (res.error) {
      setError(res.error.message);
      return;
    }

    await loadOrders();
    if (selectedOrderId === order.id) {
      await viewOrder(order.id);
    }
  }

  if (loading) {
    return (
      <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
        <div className="text-sm text-[var(--mp-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Order History</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/pos")}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-4 text-sm font-semibold hover:bg-white"
            >
              Back to POS
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-[340px_1fr]">
          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Filters</div>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <div className="text-xs font-semibold text-[var(--mp-muted)]">Date</div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                />
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-semibold text-[var(--mp-muted)]">Source</div>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as SourceFilter)}
                  className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                >
                  <option value="all">All Sources</option>
                  <option value="counter">Counter</option>
                  <option value="pickup">Takeout</option>
                  <option value="delivery">Delivery</option>
                  <option value="dine_in">Dine-in</option>
                </select>
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-semibold text-[var(--mp-muted)]">Status</div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusFilter)}
                  className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                >
                  <option value="all">All Statuses</option>
                  <option value="open">New</option>
                  <option value="preparing">In Kitchen</option>
                  <option value="ready">Ready</option>
                  <option value="paid">Paid</option>
                  <option value="canceled">Canceled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setApplyNonce((n) => n + 1)}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-orange-500 px-5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Apply Filters
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {orders.length === 0 ? (
                <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm text-[var(--mp-muted)]">
                  No orders.
                </div>
              ) : (
                orders.map((o) => {
                  const active = o.id === selectedOrderId;
                  return (
                    <div
                      key={o.id}
                      className={`rounded-2xl border bg-white p-4 ${
                        active ? "border-[var(--mp-primary)]" : "border-[var(--mp-border)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">
                            Order {o.ticket_no != null ? `#${o.ticket_no}` : o.id.slice(0, 8)}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className={`inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold ${STATUS_BADGE[o.status] ?? "bg-zinc-100 text-zinc-700"}`}>
                              {statusLabel(o.status)}
                            </span>
                            {o.order_type ? (
                              <span className="inline-flex h-6 items-center rounded-full bg-zinc-100 px-2 text-xs font-semibold text-zinc-700">
                                {typeLabel(o.order_type)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-[var(--mp-muted)]">Total</div>
                          <div className="text-base font-bold tabular-nums">${money(o.total)}</div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => void viewOrder(o.id)}
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => void voidOrder(o)}
                          disabled={o.status === "refunded"}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm font-semibold hover:bg-black/[0.03] disabled:opacity-50"
                        >
                          Void
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-5 shadow-sm">
            {!selectedOrder ? (
              <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-10 text-center text-sm text-[var(--mp-muted)]">
                Select an order to view.
              </div>
            ) : receiptLoading ? (
              <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-10 text-center text-sm text-[var(--mp-muted)]">
                Loading...
              </div>
            ) : receipt ? (
              <div className="rounded-2xl border border-[var(--mp-border)] bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{receipt.restaurant_name ?? ""}</div>
                    <div className="mt-1 text-sm text-[var(--mp-muted)]">
                      {new Date(receipt.order.created_at).toLocaleString()}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex h-6 items-center rounded-full px-2 text-xs font-semibold ${STATUS_BADGE[receipt.order.status] ?? "bg-zinc-100 text-zinc-700"}`}>
                        {statusLabel(receipt.order.status)}
                      </span>
                      {receipt.order.order_type ? (
                        <span className="inline-flex h-6 items-center rounded-full bg-zinc-100 px-2 text-xs font-semibold text-zinc-700">
                          {typeLabel(receipt.order.order_type)}
                        </span>
                      ) : null}
                      {receipt.order.ticket_no != null ? (
                        <span className="inline-flex h-6 items-center rounded-full bg-zinc-100 px-2 text-xs font-semibold text-zinc-700">
                          Ticket #{receipt.order.ticket_no}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  {receipt.items.map((it) => (
                    <div key={it.id} className="rounded-xl border border-[var(--mp-border)] bg-white px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">
                            {it.qty} × {it.name}
                          </div>
                          {it.modifiers && it.modifiers.length > 0 ? (
                            <div className="mt-1 grid gap-1">
                              {it.modifiers.map((m, idx) => (
                                <div key={`${it.id}:${idx}`} className="text-xs text-[var(--mp-muted)]">
                                  + {m.option_name ?? "Modifier"}
                                  {Number(m.qty ?? 1) !== 1 ? ` ×${m.qty}` : ""}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="text-sm font-semibold tabular-nums">${money(it.line_total)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-[var(--mp-border)] bg-white px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-[var(--mp-muted)]">Subtotal</div>
                    <div className="tabular-nums">${money(receipt.order.subtotal)}</div>
                  </div>
                  {Number(receipt.order.discount_amount ?? 0) > 0 ? (
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <div className="text-[var(--mp-muted)]">Discount</div>
                      <div className="tabular-nums">-${money(receipt.order.discount_amount)}</div>
                    </div>
                  ) : null}
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <div className="text-[var(--mp-muted)]">Tax</div>
                    <div className="tabular-nums">${money(receipt.order.tax)}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-base font-bold">
                    <div>Total</div>
                    <div className="tabular-nums">${money(receipt.order.total)}</div>
                  </div>

                  {receipt.order.payment_method ? (
                    <div className="mt-2 text-xs text-[var(--mp-muted)]">
                      Paid: {receipt.order.payment_method.replaceAll("_", " ")}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-10 text-center text-sm text-[var(--mp-muted)]">
                Click View to load receipt.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
