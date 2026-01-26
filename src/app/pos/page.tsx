"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { applyInventoryDelta } from "@/lib/inventory";
import { loadInventory, type InventoryState } from "@/lib/inventory";
import {
  getOfflineOrder,
  getSyncedCloudOrderId,
  isOfflineOrderId,
  listOfflineOrderSummaries,
  loadOfflineOrders,
  markOfflineOrderSynced,
  removeOfflineOrder,
  upsertOfflineOrder,
  type OfflineOrderPayment,
} from "@/lib/offlineOrders";
import {
  createOrder,
  findOrderByOfflineLocalId,
  findMenuItemByCode,
  getOrderDeliveryMeta,
  getOrderReceipt,
  getOrderItems,
  listRecentOrders,
  listRecentOrdersFiltered,
  findOpenDineInOrderByTable,
  formatTableLabel,
  listPaidOrdersForSummary,
  loadPosMenuData,
  markOrderPaid,
  refundOrder,
  updateOrderStatus,
  updateOrder,
  type OrderType,
  type OrderSummary,
  type OrderReceipt,
  type PosMenuData,
  type SalesSummaryRow,
} from "@/lib/posData";

type CartLine = {
  id: string;
  name: string;
  unitPrice: number;
  qty: number;
};

export default function PosPage() {
  const router = useRouter();
  const [tableQuery, setTableQuery] = useState<string | null>(null);
  const [offlineQuery, setOfflineQuery] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [productSearch, setProductSearch] = useState<string>("");
  const [qtyInput, setQtyInput] = useState<string>("");

  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [syncingOffline, setSyncingOffline] = useState(false);

  const [scanCode, setScanCode] = useState<string>("");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "ath_movil" | "other">("cash");
  const [amountTendered, setAmountTendered] = useState<string>("");

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState<string>("");

  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | "open" | "paid" | "canceled" | "refunded">(
    "all",
  );
  const [orderDateFilter, setOrderDateFilter] = useState<"all" | "today" | "7d" | "30d">("all");
  const [orderSearch, setOrderSearch] = useState<string>("");

  const [summaryRange, setSummaryRange] = useState<"today" | "7d" | "30d">("today");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryRows, setSummaryRows] = useState<SalesSummaryRow[]>([]);

  const [data, setData] = useState<PosMenuData | null>(null);
  const [inventory, setInventory] = useState<InventoryState>({});
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderStatus, setActiveOrderStatus] = useState<string | null>(null);

  const [orderType, setOrderType] = useState<OrderType>("counter");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [deliveryAddress1, setDeliveryAddress1] = useState<string>("");
  const [deliveryAddress2, setDeliveryAddress2] = useState<string>("");
  const [deliveryCity, setDeliveryCity] = useState<string>("");
  const [deliveryState, setDeliveryState] = useState<string>("PR");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState<string>("");
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>("");

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
        if (res.error.message.toLowerCase().includes("setup")) {
          router.replace("/setup");
          return;
        }
        setError(res.error.message);
        setLoading(false);
        return;
      }

      setData(res.data);
      setInventory(loadInventory(res.data.restaurantId));

      setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
      setOfflineQueueCount(listOfflineOrderSummaries(res.data.restaurantId).length);

      const history = await listRecentOrders(res.data.restaurantId, 20);
      if (cancelled) return;
      if (history.error) {
        setError(history.error.message);
        setLoading(false);
        return;
      }
      setOrders(history.data ?? []);

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

  const getTrackedStock = useCallback(
    (menuItemId: string) => {
      const row = inventory[menuItemId];
      if (!row?.tracked) return null;
      const n = Number(row.stock);
      return Number.isFinite(n) ? n : null;
    },
    [inventory],
  );

  function tryAddItem(id: string, name: string, unitPrice: number, qtyToAdd = 1) {
    const stock = getTrackedStock(id);
    if (stock != null) {
      const current = cart[id]?.qty ?? 0;
      if (current + qtyToAdd > stock) {
        setError(`Out of stock: ${name}`);
        return;
      }
    }

    setCart((prev) => {
      const existing = prev[id];
      const qty = (existing?.qty ?? 0) + qtyToAdd;
      return { ...prev, [id]: { id, name, unitPrice, qty } };
    });
  }

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

  function exportOfflineTickets(restaurantId: string) {
    const rows = loadOfflineOrders(restaurantId);
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
  }

  const refreshOfflineQueueCount = useCallback(
    (restaurantId: string) => {
      const count = listOfflineOrderSummaries(restaurantId).length;
      setOfflineQueueCount(count);
    },
    [setOfflineQueueCount],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const table = params.get("table");
      const offline = params.get("offline");
      setTableQuery(table);
      setOfflineQuery(offline);
    } catch {
      setTableQuery(null);
      setOfflineQuery(null);
    }
  }, []);

  useEffect(() => {
    if (!data) return;
    if (loading) return;

    const id = (offlineQuery ?? "").trim();
    if (!id) return;

    void openOrder(id);
  }, [data, loading, offlineQuery]);

  useEffect(() => {
    if (!data) return;
    if (loading) return;

    const tableQ = tableQuery;
    if (!tableQ) return;

    const t = Number(tableQ);
    if (!Number.isFinite(t) || t <= 0 || t > 200) return;

    const label = formatTableLabel(Math.floor(t));
    setOrderType("dine_in");
    setCustomerName(label);

    void (async () => {
      const existing = await findOpenDineInOrderByTable(data.restaurantId, label);
      if (existing.error) {
        setError(existing.error.message);
        return;
      }

      if (existing.data?.id) {
        await openOrder(existing.data.id);
      } else {
        setActiveOrderId(null);
        setActiveOrderStatus(null);
        setCart({});
      }
    })();
  }, [data, loading, tableQuery]);

  useEffect(() => {
    if (!data) return;
    if (loading) return;

    const now = new Date();
    const since =
      summaryRange === "today"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        : summaryRange === "7d"
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const t = window.setTimeout(() => {
      void (async () => {
        setSummaryLoading(true);
        try {
          const res = await listPaidOrdersForSummary(data.restaurantId, { since });
          if (res.error) throw res.error;
          setSummaryRows(res.data ?? []);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Failed to load sales summary";
          setError(msg);
        } finally {
          setSummaryLoading(false);
        }
      })();
    }, 250);

    return () => window.clearTimeout(t);
  }, [data, loading, summaryRange]);

  const salesSummary = useMemo(() => {
    const gross = summaryRows.reduce((sum, r) => sum + Number(r.total), 0);
    const tax = summaryRows.reduce((sum, r) => sum + Number(r.tax), 0);
    const net = summaryRows.reduce((sum, r) => sum + Number(r.subtotal), 0);
    const ticketCount = summaryRows.length;
    const byMethod: Record<string, { gross: number; count: number }> = {};
    for (const r of summaryRows) {
      const key = (r.payment_method ?? "unknown").toLowerCase();
      byMethod[key] = byMethod[key] ?? { gross: 0, count: 0 };
      byMethod[key].gross += Number(r.total);
      byMethod[key].count += 1;
    }
    const methods = Object.entries(byMethod).sort((a, b) => b[1].gross - a[1].gross);
    return { gross, tax, net, ticketCount, methods };
  }, [summaryRows]);

  const qtyToAdd = useMemo(() => {
    const n = Number(qtyInput);
    if (!qtyInput.trim()) return 1;
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.min(99, Math.floor(n)));
  }, [qtyInput]);

  const filteredItems = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    const categoryId = activeCategoryId;
    return data?.items
      .filter((it) => {
        if (categoryId !== "all" && (it.category_id ?? "") !== categoryId) return false;
        if (!q) return true;
        return it.name.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeCategoryId, data?.items, productSearch]);

  const cartLines = useMemo(() => Object.values(cart), [cart]);

  const totals = useMemo(() => {
    const subtotal = cartLines.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
    const ivuRate = data?.ivuRate ?? 0;
    const pricesIncludeTax = data?.pricesIncludeTax ?? false;

    if (pricesIncludeTax) {
      const total = subtotal;
      const tax = ivuRate > 0 ? total - total / (1 + ivuRate) : 0;
      const net = total - tax;
      return { subtotal: net, tax, total };
    }

    const tax = subtotal * ivuRate;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [cartLines, data]);

  const tenderedNumber = Number(amountTendered);
  const isCashPayment = paymentMethod === "cash";
  const cashTenderedValid =
    !isCashPayment || (Number.isFinite(tenderedNumber) && tenderedNumber >= totals.total);
  const changeDueDisplay =
    isCashPayment && Number.isFinite(tenderedNumber) ? Math.max(0, tenderedNumber - totals.total) : 0;

  function normalizeCode(value: string) {
    return value.trim().toLowerCase();
  }

  async function addByCode(code: string) {
    if (!data) return;
    const q = normalizeCode(code);
    if (!q) return;

    const matches = data.items.filter((it) => {
      const barcode = normalizeCode(it.barcode ?? "");
      const sku = normalizeCode(it.sku ?? "");
      return (barcode && barcode === q) || (sku && sku === q);
    });

    if (matches.length === 0) {
      const dbRes = await findMenuItemByCode(data.restaurantId, code);
      if (dbRes.error) {
        setError(dbRes.error.message);
        return;
      }
      if (!dbRes.data) {
        setError(`No product found for code: ${code}`);
        return;
      }

      tryAddItem(dbRes.data.id, dbRes.data.name, Number(dbRes.data.price));
      setSuccess(`Added: ${dbRes.data.name}`);
      return;
    }

    if (matches.length > 1) {
      setError(`Multiple products match code: ${code}. Please search by name.`);
      return;
    }

    const it = matches[0];
    tryAddItem(it.id, it.name, Number(it.price));
    setSuccess(`Added: ${it.name}`);
  }

  function decItem(id: string) {
    setCart((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      const qty = existing.qty - 1;
      if (qty <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { ...existing, qty } };
    });
  }

  function clearCart() {
    setCart({});
    setActiveOrderId(null);
    setActiveOrderStatus(null);
    setOrderType("counter");
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryAddress1("");
    setDeliveryAddress2("");
    setDeliveryCity("");
    setDeliveryState("PR");
    setDeliveryPostalCode("");
    setDeliveryInstructions("");
  }

  const refreshOrders = useCallback(
    async (restaurantId: string) => {
    const now = new Date();
    const since =
      orderDateFilter === "today"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        : orderDateFilter === "7d"
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
          : orderDateFilter === "30d"
            ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
            : undefined;

    const history =
      orderStatusFilter === "all" && !since
        ? await listRecentOrders(restaurantId, 20)
        : await listRecentOrdersFiltered(restaurantId, {
            limit: 50,
            status: orderStatusFilter === "all" ? undefined : orderStatusFilter,
            since,
          });
    if (history.error) {
      if (isLikelyOfflineError(history.error)) {
        setIsOffline(true);
        const offline = listOfflineOrderSummaries(restaurantId);
        setOrders(offline);
        refreshOfflineQueueCount(restaurantId);
        return;
      }
      setError(history.error.message);
      return;
    }

    const cloud = history.data ?? [];
    const offline = listOfflineOrderSummaries(restaurantId);
    const merged = [...offline, ...cloud].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setOrders(merged);
    refreshOfflineQueueCount(restaurantId);
    },
    [orderDateFilter, orderStatusFilter, refreshOfflineQueueCount],
  );

  const syncOfflineOrders = useCallback(
    async (restaurantId: string) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      if (syncingOffline) return;

      const queued = loadOfflineOrders(restaurantId)
        .filter((o) => o.status === "open" || o.status === "paid")
        .reverse();

      if (queued.length === 0) {
        refreshOfflineQueueCount(restaurantId);
        return;
      }

      setSyncingOffline(true);
      try {
        for (const o of queued) {
          let orderId = getSyncedCloudOrderId(restaurantId, o.local_id);

          if (!orderId) {
            const existing = await findOrderByOfflineLocalId(restaurantId, o.local_id);
            if (existing.error) throw existing.error;

            orderId = existing.data?.id ?? "";

            if (!orderId) {
              const created = await createOrder({ ...o.payload, offline_local_id: o.local_id });
              if (created.error) throw created.error;

              orderId = created.data?.orderId ?? "";
              if (!orderId) throw new Error("Failed to sync offline ticket");
            }

            markOfflineOrderSynced(restaurantId, o.local_id, orderId);
          }

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
        }

        refreshOfflineQueueCount(restaurantId);
        await refreshOrders(restaurantId);
        setSuccess("Offline tickets synced");
      } catch (e) {
        if (isLikelyOfflineError(e)) setIsOffline(true);
        const msg = e instanceof Error ? e.message : "Failed to sync offline tickets";
        setError(msg);
      } finally {
        setSyncingOffline(false);
      }
    },
    [refreshOrders, refreshOfflineQueueCount, syncingOffline],
  );

  useEffect(() => {
    if (!data) return;
    if (typeof window === "undefined") return;

    const restaurantId = data.restaurantId;

    function handleOnline() {
      setIsOffline(false);
      void syncOfflineOrders(restaurantId);
    }
    function handleOffline() {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [data, syncOfflineOrders]);

  useEffect(() => {
    if (!data) return;
    if (loading) return;

    const t = window.setTimeout(() => {
      void refreshOrders(data.restaurantId);
    }, 250);

    return () => window.clearTimeout(t);
  }, [data, loading, refreshOrders]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const idMatch = o.id.toLowerCase().includes(q);
      const ticketMatch = o.ticket_no != null ? String(o.ticket_no).includes(q) : false;
      return idMatch || ticketMatch;
    });
  }, [orders, orderSearch]);

  async function openOrder(orderId: string) {
    if (!data) return;
    setError(null);
    setSuccess(null);

    if (isOfflineOrderId(orderId)) {
      const offline = getOfflineOrder(data.restaurantId, orderId);
      if (!offline) {
        setError("Offline ticket not found");
        return;
      }

      setOrderType(offline.payload.order_type ?? "counter");
      setCustomerName(String(offline.payload.customer_name ?? ""));
      setCustomerPhone(String(offline.payload.customer_phone ?? ""));
      setDeliveryAddress1(String(offline.payload.delivery_address1 ?? ""));
      setDeliveryAddress2(String(offline.payload.delivery_address2 ?? ""));
      setDeliveryCity(String(offline.payload.delivery_city ?? ""));
      setDeliveryState(String(offline.payload.delivery_state ?? "PR"));
      setDeliveryPostalCode(String(offline.payload.delivery_postal_code ?? ""));
      setDeliveryInstructions(String(offline.payload.delivery_instructions ?? ""));

      const next: Record<string, CartLine> = {};
      for (const row of offline.payload.items ?? []) {
        next[row.menu_item_id] = {
          id: row.menu_item_id,
          name: row.name,
          unitPrice: Number(row.unit_price),
          qty: row.qty,
        };
      }
      setCart(next);
      setActiveOrderId(orderId);
      setActiveOrderStatus(offline.status);
      return;
    }

    const summary = orders.find((o) => o.id === orderId);
    const status = summary?.status ?? null;
    if (status && status !== "open") {
      setError(`Only open tickets can be edited (status: ${status})`);
      setActiveOrderId(null);
      setActiveOrderStatus(null);
      setCart({});
      return;
    }

    const itemsRes = await getOrderItems(orderId);
    if (itemsRes.error) {
      setError(itemsRes.error.message);
      return;
    }

    const metaRes = await getOrderDeliveryMeta(orderId);
    if (metaRes.error) {
      setError(metaRes.error.message);
      return;
    }

    const meta = metaRes.data;
    setOrderType(meta?.order_type ?? "counter");
    setCustomerName(meta?.customer_name ?? "");
    setCustomerPhone(meta?.customer_phone ?? "");
    setDeliveryAddress1(meta?.delivery_address1 ?? "");
    setDeliveryAddress2(meta?.delivery_address2 ?? "");
    setDeliveryCity(meta?.delivery_city ?? "");
    setDeliveryState(meta?.delivery_state ?? "PR");
    setDeliveryPostalCode(meta?.delivery_postal_code ?? "");
    setDeliveryInstructions(meta?.delivery_instructions ?? "");

    const next: Record<string, CartLine> = {};
    for (const row of itemsRes.data ?? []) {
      next[row.menu_item_id] = {
        id: row.menu_item_id,
        name: row.name,
        unitPrice: Number(row.unit_price),
        qty: row.qty,
      };
    }

    setCart(next);
    setActiveOrderId(orderId);
    setActiveOrderStatus(status);
  }

  async function setTicketStatus(nextStatus: "paid" | "canceled") {
    if (!data || !activeOrderId) return;

    setError(null);
    setSuccess(null);
    setPlacing(true);

    try {
      const res = await updateOrderStatus(activeOrderId, nextStatus);
      if (res.error) throw res.error;

      clearCart();
      await refreshOrders(data.restaurantId);
      setSuccess(`Ticket marked ${nextStatus}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update ticket status";
      setError(msg);
    } finally {
      setPlacing(false);
    }
  }

  async function openReceipt(orderId: string) {
    setError(null);
    setSuccess(null);
    setReceipt(null);
    setReceiptLoading(true);
    setShowReceiptModal(true);

    try {
      const res = await getOrderReceipt(orderId);
      if (res.error) throw res.error;
      setReceipt(res.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load receipt";
      setError(msg);
      setShowReceiptModal(false);
    } finally {
      setReceiptLoading(false);
    }
  }

  async function confirmPayment() {
    if (!data || !activeOrderId) return;

    const tendered = Number(amountTendered);
    const isCash = paymentMethod === "cash";
    const changeDue = isCash && Number.isFinite(tendered) ? tendered - totals.total : 0;
    if (isCash && (!Number.isFinite(tendered) || tendered < totals.total)) {
      setError("Cash payment requires amount tendered >= total");
      return;
    }

    setError(null);
    setSuccess(null);
    setPlacing(true);

    const payment: OfflineOrderPayment = {
      payment_method: paymentMethod,
      paid_at: new Date().toISOString(),
      amount_tendered: isCash ? Number(tendered.toFixed(2)) : null,
      change_due: isCash ? Number(changeDue.toFixed(2)) : null,
    };

    try {
      if (isOfflineOrderId(activeOrderId)) {
        const offline = getOfflineOrder(data.restaurantId, activeOrderId);
        if (!offline) throw new Error("Offline ticket not found");

        upsertOfflineOrder(data.restaurantId, {
          local_id: offline.local_id,
          created_by_user_id: offline.created_by_user_id,
          payload: offline.payload,
          status: "paid",
          payment,
          created_at: offline.created_at,
        });

        try {
          applyInventoryDelta(
            data.restaurantId,
            offline.payload.items.map((r) => ({ menu_item_id: r.menu_item_id, qty: r.qty })),
          );
          setInventory(loadInventory(data.restaurantId));
        } catch {
          // ignore
        }

        setIsOffline(true);
        setShowPaymentModal(false);
        clearCart();
        await refreshOrders(data.restaurantId);
        setSuccess(`Ticket marked paid OFFLINE (${paymentMethod.replace("_", " ")})`);
        return;
      }

      const res = await markOrderPaid(activeOrderId, {
        payment_method: paymentMethod,
        paid_at: payment.paid_at,
        amount_tendered: payment.amount_tendered,
        change_due: payment.change_due,
      });
      if (res.error) throw res.error;

      try {
        const itemsRes = await getOrderItems(activeOrderId);
        if (!itemsRes.error && itemsRes.data) {
          applyInventoryDelta(
            data.restaurantId,
            itemsRes.data.map((r) => ({ menu_item_id: r.menu_item_id, qty: r.qty })),
          );
        }
      } catch {
        // ignore inventory errors
      }

      setShowPaymentModal(false);
      clearCart();
      await refreshOrders(data.restaurantId);
      setSuccess(`Ticket marked paid (${paymentMethod.replace("_", " ")})`);
    } catch (e) {
      if (isLikelyOfflineError(e)) {
        const offline = getOfflineOrder(data.restaurantId, activeOrderId);
        if (!offline) {
          setError("Offline save failed");
          return;
        }

        upsertOfflineOrder(data.restaurantId, {
          local_id: offline.local_id,
          created_by_user_id: offline.created_by_user_id,
          payload: offline.payload,
          status: "paid",
          payment,
          created_at: offline.created_at,
        });

        try {
          applyInventoryDelta(
            data.restaurantId,
            offline.payload.items.map((r) => ({ menu_item_id: r.menu_item_id, qty: r.qty })),
          );
        } catch {
          // ignore
        }

        setIsOffline(true);
        setShowPaymentModal(false);
        clearCart();
        await refreshOrders(data.restaurantId);
        setSuccess(`Ticket marked paid OFFLINE (${paymentMethod.replace("_", " ")})`);
        return;
      }

      const msg = e instanceof Error ? e.message : "Failed to mark ticket paid";
      setError(msg);
    } finally {
      setPlacing(false);
    }
  }

  async function confirmRefund() {
    if (!data || !activeOrderId) return;

    setError(null);
    setSuccess(null);
    setPlacing(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const userId = sessionData.session?.user.id;
      if (!userId) {
        router.replace("/login");
        return;
      }

      const res = await refundOrder(activeOrderId, {
        refunded_by_user_id: userId,
        refunded_at: new Date().toISOString(),
        refund_reason: refundReason.trim() ? refundReason.trim() : null,
      });
      if (res.error) throw res.error;

      setShowRefundModal(false);
      setRefundReason("");
      clearCart();
      await refreshOrders(data.restaurantId);
      setSuccess("Ticket refunded");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to refund ticket";
      setError(msg);
    } finally {
      setPlacing(false);
    }
  }

  async function placeOrder() {
    if (!data) return;
    if (cartLines.length === 0) return;

    setError(null);
    setSuccess(null);
    setPlacing(true);

    let userId: string | null = null;
    let payload: {
      restaurant_id: string;
      created_by_user_id: string;
      subtotal: number;
      tax: number;
      total: number;
      order_type: OrderType;
      customer_name: string | null;
      customer_phone: string | null;
      delivery_address1: string | null;
      delivery_address2: string | null;
      delivery_city: string | null;
      delivery_state: string | null;
      delivery_postal_code: string | null;
      delivery_instructions: string | null;
      items: Array<{
        menu_item_id: string;
        name: string;
        unit_price: number;
        qty: number;
        line_total: number;
      }>;
    } | null = null;

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      userId = sessionData.session?.user.id ?? null;
      if (!userId) {
        router.replace("/login");
        return;
      }

      const items = cartLines.map((it) => ({
        menu_item_id: it.id,
        name: it.name,
        unit_price: it.unitPrice,
        qty: it.qty,
        line_total: it.unitPrice * it.qty,
      }));

      if (orderType === "delivery") {
        if (!customerName.trim()) {
          setError("Delivery requires customer name");
          return;
        }
        if (!customerPhone.trim()) {
          setError("Delivery requires customer phone");
          return;
        }
        if (!deliveryAddress1.trim() || !deliveryCity.trim() || !deliveryState.trim() || !deliveryPostalCode.trim()) {
          setError("Delivery requires address, city, state, and postal code");
          return;
        }
      }

      payload = {
        restaurant_id: data.restaurantId,
        created_by_user_id: userId,
        subtotal: Number(totals.subtotal.toFixed(2)),
        tax: Number(totals.tax.toFixed(2)),
        total: Number(totals.total.toFixed(2)),
        order_type: orderType,
        customer_name: customerName.trim() ? customerName.trim() : null,
        customer_phone: customerPhone.trim() ? customerPhone.trim() : null,
        delivery_address1: orderType === "delivery" && deliveryAddress1.trim() ? deliveryAddress1.trim() : null,
        delivery_address2: orderType === "delivery" && deliveryAddress2.trim() ? deliveryAddress2.trim() : null,
        delivery_city: orderType === "delivery" && deliveryCity.trim() ? deliveryCity.trim() : null,
        delivery_state: orderType === "delivery" && deliveryState.trim() ? deliveryState.trim() : null,
        delivery_postal_code:
          orderType === "delivery" && deliveryPostalCode.trim() ? deliveryPostalCode.trim() : null,
        delivery_instructions:
          orderType === "delivery" && deliveryInstructions.trim() ? deliveryInstructions.trim() : null,
        items,
      };

      const res = activeOrderId
        ? isOfflineOrderId(activeOrderId)
          ? { data: { orderId: activeOrderId, ticketNo: null }, error: null }
          : await updateOrder(activeOrderId, payload)
        : await createOrder(payload);

      if (res.error) throw res.error;

      if (activeOrderId && isOfflineOrderId(activeOrderId)) {
        upsertOfflineOrder(data.restaurantId, {
          local_id: activeOrderId,
          created_by_user_id: userId,
          payload,
          status: "open",
        });
        refreshOfflineQueueCount(data.restaurantId);
      }

      setInventory(loadInventory(data.restaurantId));

      clearCart();
      await refreshOrders(data.restaurantId);
      router.refresh();
      const ticketNo = res.data?.ticketNo;
      setSuccess(
        activeOrderId
          ? `Order updated${ticketNo != null ? ` (#${ticketNo})` : ""}: ${res.data?.orderId}`
          : `Order created${ticketNo != null ? ` (#${ticketNo})` : ""}: ${res.data?.orderId}`,
      );
    } catch (e) {
      if (isLikelyOfflineError(e)) {
        setIsOffline(true);

        if (!payload) {
          setError("Failed to save offline ticket");
          return;
        }

        const { local_id } = upsertOfflineOrder(data.restaurantId, {
          local_id: activeOrderId && isOfflineOrderId(activeOrderId) ? activeOrderId : undefined,
          created_by_user_id: userId ?? payload.created_by_user_id,
          payload,
          status: "open",
        });

        setActiveOrderId(local_id);
        setActiveOrderStatus("open");
        refreshOfflineQueueCount(data.restaurantId);
        await refreshOrders(data.restaurantId);
        setSuccess(`Saved OFFLINE: ${local_id}`);
        return;
      }

      const msg = e instanceof Error ? e.message : "Failed to place order";
      setError(msg);
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">No data.</div>
      </div>
    );
  }

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">POS</h1>
            <p className="text-sm text-[var(--mp-muted)]">Add items and place an order.</p>
          </div>
          <div className="flex gap-2">
            <div className="hidden md:block">
              <input
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  setError(null);
                  setSuccess(null);
                  void addByCode(scanCode);
                  setScanCode("");
                }}
                placeholder="Scan barcode / SKU"
                className="h-11 w-64 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              />
            </div>
            <button
              onClick={() => router.push("/pos/tables")}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white"
            >
              Tables
            </button>
            <button
              onClick={() => router.push("/admin")}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white"
            >
              Admin
            </button>
            <button
              onClick={() => router.push("/pos/menu")}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white"
            >
              Edit Menu
            </button>
            <button
              onClick={clearCart}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white disabled:opacity-60"
              disabled={cartLines.length === 0}
            >
              Clear
            </button>
            <button
              onClick={() => {
                clearCart();
                setError(null);
                setSuccess(null);
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
            >
              New ticket
            </button>
          </div>
        </div>

        {isOffline || offlineQueueCount > 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">
                  {isOffline ? "OFFLINE MODE" : "Offline queue"}
                </div>
                <div className="text-xs opacity-90">Queued tickets: {offlineQueueCount}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push("/pos/offline")}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-300 bg-white px-4 text-xs font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-60"
                >
                  Manage
                </button>

                <button
                  onClick={() => data && void syncOfflineOrders(data.restaurantId)}
                  disabled={syncingOffline || (typeof navigator !== "undefined" && !navigator.onLine)}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-amber-900 px-4 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
                >
                  {syncingOffline ? "Syncing..." : "Sync now"}
                </button>

                <button
                  onClick={() => data && exportOfflineTickets(data.restaurantId)}
                  disabled={!data || offlineQueueCount === 0}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-300 bg-white px-4 text-xs font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-60"
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {success ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {success}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCategoryId("all")}
                    className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors ${
                      activeCategoryId === "all"
                        ? "border-[var(--mp-primary)] bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                        : "border-[var(--mp-border)] bg-white text-[var(--mp-fg)] hover:bg-black/[0.03]"
                    }`}
                  >
                    All
                  </button>
                  {data.categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveCategoryId(c.id)}
                      className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors ${
                        activeCategoryId === c.id
                          ? "border-[var(--mp-primary)] bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                          : "border-[var(--mp-border)] bg-white text-[var(--mp-fg)] hover:bg-black/[0.03]"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search items"
                    className="h-10 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)] md:w-64"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">Menu</div>
                <div className="text-xs text-[var(--mp-muted)]">Tap to add • Qty: {qtyToAdd}</div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(filteredItems ?? []).length === 0 ? (
                  <div className="text-sm text-[var(--mp-muted)]">No items found.</div>
                ) : (
                  (filteredItems ?? []).map((it) => {
                    const stock = getTrackedStock(it.id);
                    const out = stock != null && stock <= 0;
                    return (
                      <button
                        key={it.id}
                        onClick={() => {
                          tryAddItem(it.id, it.name, Number(it.price), qtyToAdd);
                          setQtyInput("");
                        }}
                        disabled={out}
                        className="group rounded-3xl border border-[var(--mp-border)] bg-white p-4 text-left shadow-sm transition-colors hover:bg-black/[0.03] disabled:opacity-60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{it.name}</div>
                            <div className="mt-1 text-xs text-[var(--mp-muted)]">
                              {it.sku ? `SKU ${it.sku}` : it.barcode ? `Barcode ${it.barcode}` : ""}
                            </div>
                          </div>
                          <div className="shrink-0 rounded-2xl bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-900">
                            ${Number(it.price).toFixed(2)}
                          </div>
                        </div>
                        {stock != null ? (
                          <div className={`mt-3 text-xs ${out ? "text-rose-600" : "text-[var(--mp-muted)]"}`}>
                            {out ? "Out of stock" : `Stock: ${stock}`}
                          </div>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Order</div>
                <div className="mt-1 text-xs text-[var(--mp-muted)]">
                  {orderType === "dine_in" && customerName.trim() ? customerName.trim() : orderType.replace("_", " ")}
                  {activeOrderId ? " • editing" : ""}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={clearCart}
                  disabled={placing || cartLines.length === 0}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-white disabled:opacity-60"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as OrderType)}
                  className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                >
                  <option value="counter">Counter</option>
                  <option value="pickup">Pickup</option>
                  <option value="delivery">Delivery</option>
                  <option value="dine_in">Dine-in</option>
                </select>
                <input
                  value={scanCode}
                  onChange={(e) => setScanCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    setError(null);
                    setSuccess(null);
                    void addByCode(scanCode);
                    setScanCode("");
                  }}
                  placeholder="Scan barcode / SKU"
                  className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                />
              </div>

              {orderType === "dine_in" ? (
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Table 1"
                  className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                />
              ) : null}

              <div className="rounded-2xl border border-[var(--mp-border)] bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">Cart</div>
                  <div className="text-xs text-[var(--mp-muted)]">Items: {cartLines.reduce((s, it) => s + it.qty, 0)}</div>
                </div>

                <div className="mt-3 max-h-[340px] overflow-auto pr-1">
                  {cartLines.length === 0 ? (
                    <div className="text-sm text-[var(--mp-muted)]">Cart is empty.</div>
                  ) : (
                    <div className="grid gap-2">
                      {cartLines.map((line) => (
                        <div
                          key={line.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--mp-border)] bg-white px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{line.name}</div>
                            <div className="mt-0.5 text-xs text-[var(--mp-muted)]">
                              ${line.unitPrice.toFixed(2)} x {line.qty}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => decItem(line.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white text-sm font-semibold hover:bg-white"
                            >
                              -
                            </button>
                            <button
                              onClick={() => tryAddItem(line.id, line.name, line.unitPrice)}
                              disabled={(() => {
                                const stock = getTrackedStock(line.id);
                                return stock != null && line.qty + 1 > stock;
                              })()}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white text-sm font-semibold hover:bg-white disabled:opacity-60"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[var(--mp-border)] bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[var(--mp-muted)]">Subtotal</div>
                    <div className="text-sm font-semibold tabular-nums">${totals.subtotal.toFixed(2)}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-[var(--mp-muted)]">Tax</div>
                    <div className="text-sm font-semibold tabular-nums">${totals.tax.toFixed(2)}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs font-semibold">Total</div>
                    <div className="text-base font-semibold tabular-nums">${totals.total.toFixed(2)}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--mp-border)] bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[var(--mp-muted)]">Qty keypad</div>
                    <div className="text-sm font-semibold">{qtyToAdd}</div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", ""] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          if (k === "C") {
                            setQtyInput("");
                            return;
                          }
                          if (k === "") {
                            setQtyInput((prev) => prev.slice(0, -1));
                            return;
                          }
                          setQtyInput((prev) => `${prev}${k}`.slice(0, 2));
                        }}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white text-sm font-semibold hover:bg-black/[0.03]"
                      >
                        {k === "C" ? "CLR" : k === "" ? "DEL" : k}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={placeOrder}
                disabled={placing || cartLines.length === 0}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
              >
                {placing ? "Saving..." : activeOrderId ? "Update ticket" : "Place order"}
              </button>

              {activeOrderId && (activeOrderStatus ?? "open") === "open" ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setError(null);
                      setSuccess(null);
                      setPaymentMethod("cash");
                      setAmountTendered("");
                      setShowPaymentModal(true);
                    }}
                    disabled={placing}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-white disabled:opacity-60"
                  >
                    Close (Paid)
                  </button>
                  <button
                    onClick={() => setTicketStatus("canceled")}
                    disabled={placing}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-white disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}

              <div className="text-xs text-[var(--mp-muted)]">
                Tax settings: {(data.ivuRate * 100).toFixed(2)}%{data.pricesIncludeTax ? " (prices include tax)" : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPaymentModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-[#fffdf7] p-6 shadow-xl">
            <div className="text-base font-semibold">Close ticket as paid</div>
            <div className="mt-1 text-sm text-[var(--mp-muted)]">Select payment method</div>

            <div className="mt-4 grid gap-2">
              <label className="text-sm font-medium">Payment method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="ath_movil">ATH Móvil</option>
                <option value="other">Other</option>
              </select>
            </div>

            {paymentMethod === "cash" ? (
              <div className="mt-4 grid gap-2">
                <label className="text-sm font-medium">Amount tendered</label>
                <input
                  inputMode="decimal"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder={totals.total.toFixed(2)}
                  className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                />
                <div className="text-xs text-[var(--mp-muted)]">
                  Total: ${totals.total.toFixed(2)}
                  {amountTendered && Number.isFinite(tenderedNumber)
                    ? ` • Change due: $${changeDueDisplay.toFixed(2)}`
                    : ""}
                </div>
                {amountTendered && !cashTenderedValid ? (
                  <div className="text-xs text-rose-600">
                    Amount tendered must be at least ${totals.total.toFixed(2)}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={placing}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirmPayment}
                disabled={placing || !cashTenderedValid}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
              >
                {placing ? "Saving..." : "Mark paid"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showReceiptModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-[#fffdf7] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Receipt</div>
                <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {receipt?.restaurant_name ?? ""}
                </div>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold hover:bg-zinc-50"
              >
                Close
              </button>
            </div>

            {receiptLoading ? (
              <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">Loading receipt...</div>
            ) : receipt ? (
              <div className="receipt-print mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="text-center">
                  <div className="text-sm font-semibold tracking-tight">{receipt.restaurant_name ?? ""}</div>
                  <div className="mt-1 text-[11px] text-zinc-600">
                    {new Date(receipt.order.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-700">
                  <div>Ticket</div>
                  <div className="font-semibold tabular-nums">
                    {receipt.order.ticket_no != null ? `#${receipt.order.ticket_no}` : ""}
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-700">
                  <div>Status</div>
                  <div className="font-medium">
                    {receipt.order.status}
                    {receipt.order.payment_method ? ` • ${receipt.order.payment_method.replace("_", " ")}` : ""}
                  </div>
                </div>

                <div className="mt-1 text-[10px] text-zinc-500 break-all">{receipt.order.id}</div>

                {receipt.order.order_type ? (
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Type: {receipt.order.order_type.replace("_", " ")}
                    {receipt.order.order_type === "delivery" && receipt.order.delivery_status
                      ? ` • Delivery: ${receipt.order.delivery_status.replace("_", " ")}`
                      : ""}
                  </div>
                ) : null}

                {receipt.order.order_type === "delivery" ? (
                  <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {receipt.order.customer_name ? `${receipt.order.customer_name} • ` : ""}
                    {receipt.order.customer_phone ?? ""}
                    <div className="mt-1">
                      {receipt.order.delivery_address1 ?? ""}
                      {receipt.order.delivery_address2 ? `, ${receipt.order.delivery_address2}` : ""}
                    </div>
                    <div className="mt-1">
                      {receipt.order.delivery_city ?? ""}
                      {receipt.order.delivery_state ? `, ${receipt.order.delivery_state}` : ""}
                      {receipt.order.delivery_postal_code ? ` ${receipt.order.delivery_postal_code}` : ""}
                    </div>
                    {receipt.order.delivery_instructions ? (
                      <div className="mt-1">Instructions: {receipt.order.delivery_instructions}</div>
                    ) : null}
                    {receipt.order.delivery_tracking_url ? (
                      <div className="mt-1 break-all">Tracking: {receipt.order.delivery_tracking_url}</div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
                  <div className="grid gap-2">
                    {receipt.items.map((it) => (
                      <div key={it.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate">{it.name}</div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">
                            ${Number(it.unit_price).toFixed(2)} x {it.qty}
                          </div>
                        </div>
                        <div className="shrink-0">${Number(it.line_total).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-zinc-600 dark:text-zinc-400">Subtotal</div>
                      <div>${Number(receipt.order.subtotal).toFixed(2)}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <div className="text-zinc-600 dark:text-zinc-400">Tax</div>
                      <div>${Number(receipt.order.tax).toFixed(2)}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm font-medium">
                      <div>Total</div>
                      <div>${Number(receipt.order.total).toFixed(2)}</div>
                    </div>

                    {receipt.order.payment_method === "cash" &&
                    receipt.order.amount_tendered != null &&
                    receipt.order.change_due != null ? (
                      <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
                        Tendered: ${Number(receipt.order.amount_tendered).toFixed(2)} • Change: ${Number(receipt.order.change_due).toFixed(2)}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800"
                  >
                    Print
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">No receipt data.</div>
            )}
          </div>
        </div>
      ) : null}

      {showRefundModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-base font-semibold">Refund ticket</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              This will mark the ticket as refunded.
            </div>

            <div className="mt-4 grid gap-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <input
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Example: wrong item"
                className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-black"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowRefundModal(false)}
                disabled={placing}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={confirmRefund}
                disabled={placing}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
              >
                {placing ? "Saving..." : "Confirm refund"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
