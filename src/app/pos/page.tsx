"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import MarketingLogo from "@/components/MarketingLogo";
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
  loadMenuItemModifiers,
  type MenuItemModifiers,
  type SelectedModifier,
  type CreateOrderInput,
  type OrderType,
  type OrderSummary,
  type OrderReceipt,
  type PosMenuData,
  type SalesSummaryRow,
} from "@/lib/posData";

type TaxType = "state_tax" | "municipal_tax" | "no_tax";

type CartLine = {
  id: string;
  name: string;
  unitPrice: number;
  qty: number;
  taxType: TaxType;
  modifiers: SelectedModifier[];
};

type TimeClockAction = "clock_in" | "break_out" | "break_in" | "clock_out";

type TimeClockEntry = {
  id: string;
  restaurantId: string;
  userId: string;
  action: TimeClockAction;
  at: string;
};

export default function PosPage() {
  const router = useRouter();

  const [showOpenTickets, setShowOpenTickets] = useState(false);
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
  const [otherPaymentReason, setOtherPaymentReason] = useState<string>("");
  const [otherPaymentApproved, setOtherPaymentApproved] = useState(false);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState<string>("");

  const [showTimeClockModal, setShowTimeClockModal] = useState(false);
  const [timeClockSaving, setTimeClockSaving] = useState(false);
  const [timeClockError, setTimeClockError] = useState<string | null>(null);
  const [timeClockEntries, setTimeClockEntries] = useState<TimeClockEntry[]>([]);
  const [timeClockUserId, setTimeClockUserId] = useState<string | null>(null);

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

  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [discountReason, setDiscountReason] = useState<string>("");

  const [showModifiersModal, setShowModifiersModal] = useState(false);
  const [modifiersLoading, setModifiersLoading] = useState(false);
  const [modifiersError, setModifiersError] = useState<string | null>(null);
  const [modifiersItemId, setModifiersItemId] = useState<string | null>(null);
  const [modifiersItemName, setModifiersItemName] = useState<string>("");
  const [modifiersItemPrice, setModifiersItemPrice] = useState<number>(0);
  const [modifiersItemTaxType, setModifiersItemTaxType] = useState<TaxType>("state_tax");
  const [modifiersData, setModifiersData] = useState<MenuItemModifiers>([]);
  const [selectedModifiersByGroup, setSelectedModifiersByGroup] = useState<Record<string, SelectedModifier>>({});

  const [orderType, setOrderType] = useState<OrderType>("counter");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [deliveryAddress1, setDeliveryAddress1] = useState<string>("");
  const [deliveryAddress2, setDeliveryAddress2] = useState<string>("");
  const [deliveryCity, setDeliveryCity] = useState<string>("");
  const [deliveryState, setDeliveryState] = useState<string>("PR");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState<string>("");
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>("");

  const [showOpenTicketModal, setShowOpenTicketModal] = useState(false);
  const [idVerified, setIdVerified] = useState(false);

  const openNonTableTickets = useMemo(() => {
    return (orders ?? []).filter((o) => (o.status ?? "open") === "open" && (o.order_type ?? "counter") !== "dine_in");
  }, [orders]);

  useEffect(() => {
    if (openNonTableTickets.length === 0) setShowOpenTickets(false);
  }, [openNonTableTickets.length]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setSuccess(null);

      let storageOk = true;
      try {
        const k = "islapos.__storage_test__";
        window.localStorage.setItem(k, "1");
        window.localStorage.removeItem(k);
      } catch {
        storageOk = false;
      }

      // Always try to load cached menu first for instant display
      const cached = storageOk ? localStorage.getItem("islapos_cached_menu") : null;
      if (cached && storageOk) {
        try {
          const menuData = JSON.parse(cached);
          setData(menuData);
          setInventory(loadInventory(menuData.restaurantId));
          setOrders([]);
          setOfflineQueueCount(0);
          // Don't return yet - still try to fetch fresh data in background
        } catch {
          // ignore cache parse error
        }
      }

      // Fast offline check: if no network, stop here with cached menu or error
      const isOffline = typeof navigator !== "undefined" ? !navigator.onLine : false;
      if (isOffline) {
        if (!cached) {
          setError(storageOk ? "No internet and no cached menu available" : "Offline mode is not available in Safari Private browsing");
          setLoading(false);
        } else {
          setLoading(false);
        }
        return;
      }

      // When online, try to fetch fresh data in background with timeout
      const TIMEOUT_MS = 3000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Network timeout")), TIMEOUT_MS);
      });

      try {
        const res = await Promise.race([loadPosMenuData(), timeoutPromise]);
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
          // On error, keep using cached menu if available
          if (!cached) {
            setError(res.error.message);
          }
          setLoading(false);
          return;
        }

        // Fresh data loaded - update cache and state
        setData(res.data);
        setInventory(loadInventory(res.data.restaurantId));
        if (storageOk) {
          try {
            localStorage.setItem("islapos_cached_menu", JSON.stringify(res.data));
          } catch {
            setError("Offline mode is not available in Safari Private browsing");
          }
        }

        setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
        setOfflineQueueCount(listOfflineOrderSummaries(res.data.restaurantId).length);

        const history = await listRecentOrders(res.data.restaurantId, 20);
        if (cancelled) return;
        if (history.error) {
          // Don't fail whole load if orders fail
          console.error("Failed to load orders:", history.error);
        }
        setOrders(history.data ?? []);

        // Load time clock entries for this restaurant (local only for now)
        if (storageOk) {
          try {
            const raw = localStorage.getItem("islapos_timeclock_v1");
            const parsed = raw ? (JSON.parse(raw) as TimeClockEntry[]) : [];
            const filtered = Array.isArray(parsed)
              ? parsed.filter((e) => e && typeof e === "object" && (e as TimeClockEntry).restaurantId === res.data.restaurantId)
              : [];
            setTimeClockEntries(filtered);
          } catch {
            setTimeClockEntries([]);
          }
        }

        try {
          const { data: sessionData } = await supabase.auth.getSession();
          setTimeClockUserId(sessionData.session?.user.id ?? null);
        } catch {
          setTimeClockUserId(null);
        }
      } catch (e) {
        if (!cancelled) {
          // On timeout/network error, keep using cached menu if available
          // Don't show error if we already have cached data displayed
          if (!cached) {
            const msg = e instanceof Error ? e.message : "Failed to load POS data";
            setError(msg);
          }
          // If we have cached data, silently ignore network errors
        }
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const timeClockStatus = useMemo(() => {
    const restaurantId = data?.restaurantId;
    const userId = timeClockUserId;
    if (!restaurantId || !userId) {
      return {
        clockedIn: false,
        onBreak: false,
        last: null as TimeClockEntry | null,
      };
    }

    const mine = timeClockEntries.filter((e) => e.restaurantId === restaurantId && e.userId === userId);
    const last = mine.length ? mine[mine.length - 1] : null;
    if (!last) return { clockedIn: false, onBreak: false, last: null };

    if (last.action === "clock_in") return { clockedIn: true, onBreak: false, last };
    if (last.action === "break_out") return { clockedIn: true, onBreak: true, last };
    if (last.action === "break_in") return { clockedIn: true, onBreak: false, last };
    return { clockedIn: false, onBreak: false, last };
  }, [data?.restaurantId, timeClockEntries, timeClockUserId]);

  const saveTimeClockEntry = useCallback(
    async (action: TimeClockAction) => {
      if (!data?.restaurantId) return;
      setTimeClockError(null);
      setTimeClockSaving(true);
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const userId = sessionData.session?.user.id;
        if (!userId) {
          router.replace("/login");
          return;
        }
        setTimeClockUserId(userId);

        const entry: TimeClockEntry = {
          id: `tc_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          restaurantId: data.restaurantId,
          userId,
          action,
          at: new Date().toISOString(),
        };

        const raw = localStorage.getItem("islapos_timeclock_v1");
        const parsed = raw ? (JSON.parse(raw) as TimeClockEntry[]) : [];
        const nextAll = Array.isArray(parsed) ? [...parsed, entry] : [entry];
        localStorage.setItem("islapos_timeclock_v1", JSON.stringify(nextAll));

        setTimeClockEntries(nextAll.filter((e) => e.restaurantId === data.restaurantId));
        setSuccess(
          action === "clock_in"
            ? "Clocked in"
            : action === "break_out"
              ? "Break started"
              : action === "break_in"
                ? "Break ended"
                : "Clocked out",
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to save time clock";
        setTimeClockError(msg);
      } finally {
        setTimeClockSaving(false);
      }
    },
    [data?.restaurantId, router],
  );

  const getTrackedStock = useCallback(
    (menuItemId: string) => {
      const row = inventory[menuItemId];
      if (!row?.tracked) return null;
      const n = Number(row.stock);
      return Number.isFinite(n) ? n : null;
    },
    [inventory],
  );

  function normalizeMoneyInput(v: string) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, n);
  }

  function sumModifierDelta(mods: SelectedModifier[]) {
    return (mods ?? []).reduce((sum, m) => sum + Number(m.price_delta || 0) * Number(m.qty || 1), 0);
  }

  function tryAddItem(
    id: string,
    name: string,
    baseUnitPrice: number,
    taxType: TaxType = "state_tax",
    qtyToAdd = 1,
    modifiers: SelectedModifier[] = [],
  ) {
    const stock = getTrackedStock(id);
    if (stock != null) {
      const current = cart[id]?.qty ?? 0;
      if (current + qtyToAdd > stock) {
        setError(`Out of stock: ${name}`);
        return;
      }
    }

    const existing = cart[id];
    if (existing && JSON.stringify(existing.modifiers ?? []) !== JSON.stringify(modifiers ?? [])) {
      setError("This item is already in the cart with different modifiers. Clear cart or remove the item first.");
      return;
    }

    const unitPrice = Number(baseUnitPrice) + sumModifierDelta(modifiers);

    setCart((prev) => {
      const ex = prev[id];
      const qty = (ex?.qty ?? 0) + qtyToAdd;
      return { ...prev, [id]: { id, name, unitPrice, qty, taxType, modifiers } };
    });
  }

  async function addItemWithOptionalModifiers(params: {
    id: string;
    name: string;
    baseUnitPrice: number;
    taxType: TaxType;
    qtyToAdd: number;
  }) {
    if (!data) return;
    setModifiersError(null);
    setModifiersLoading(true);
    try {
      const res = await loadMenuItemModifiers(data.restaurantId, params.id);
      if (res.error) throw res.error;
      const groups = res.data ?? [];

      if (groups.length === 0) {
        tryAddItem(params.id, params.name, params.baseUnitPrice, params.taxType, params.qtyToAdd, []);
        return;
      }

      setModifiersItemId(params.id);
      setModifiersItemName(params.name);
      setModifiersItemPrice(params.baseUnitPrice);
      setModifiersItemTaxType(params.taxType);
      setModifiersData(groups);
      setSelectedModifiersByGroup({});
      setShowModifiersModal(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load modifiers";
      setModifiersError(msg);
      setError(msg);
    } finally {
      setModifiersLoading(false);
    }
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
      const offlineNow = typeof navigator !== "undefined" ? !navigator.onLine : false;
      if (offlineNow) {
        const offline = loadOfflineOrders(data.restaurantId);
        const match = offline.find(
          (o) =>
            o.status === "open" &&
            (o.payload.order_type ?? "counter") === "dine_in" &&
            (o.payload.customer_name ?? "") === label,
        );

        if (match?.local_id) {
          await openOrder(match.local_id);
        } else {
          setActiveOrderId(null);
          setActiveOrderStatus(null);
          setCart({});
        }
        return;
      }

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
        // Skip if offline
        if (typeof navigator !== "undefined" && !navigator.onLine) return;
        
        setSummaryLoading(true);
        try {
          const res = await listPaidOrdersForSummary(data.restaurantId, { since });
          if (res.error) throw res.error;
          setSummaryRows(res.data ?? []);
        } catch (e) {
          // Don't show error if offline
          if (typeof navigator !== "undefined" && !navigator.onLine) return;
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
    const pricesIncludeTax = data?.pricesIncludeTax ?? false;
    
    // Tax rates
    const STATE_TAX_RATE = 0.07; // 7%
    const MUNICIPAL_TAX_RATE = 0.01; // 1%

    type LineCalc = { base: number; tax: number; rate: number };
    const lines: LineCalc[] = [];

    for (const line of cartLines) {
      const lineTotal = line.unitPrice * line.qty;
      let taxRate = 0;

      if (line.taxType === "state_tax") {
        taxRate = STATE_TAX_RATE;
      } else if (line.taxType === "municipal_tax") {
        taxRate = MUNICIPAL_TAX_RATE;
      }
      // no_tax = 0

      if (pricesIncludeTax) {
        const lineTax = taxRate > 0 ? lineTotal - lineTotal / (1 + taxRate) : 0;
        const base = lineTotal - lineTax;
        lines.push({ base, tax: lineTax, rate: taxRate });
      } else {
        const base = lineTotal;
        const lineTax = base * taxRate;
        lines.push({ base, tax: lineTax, rate: taxRate });
      }
    }

    const baseSubtotal = lines.reduce((sum, l) => sum + l.base, 0);
    const rawDiscount = normalizeMoneyInput(discountAmount);
    const discount = Math.min(baseSubtotal, rawDiscount);

    // Apply discount proportionally to line bases, then recompute tax from discounted bases.
    let discountedSubtotal = 0;
    let tax = 0;
    for (const l of lines) {
      const share = baseSubtotal > 0 ? l.base / baseSubtotal : 0;
      const lineDiscount = discount * share;
      const discountedBase = Math.max(0, l.base - lineDiscount);
      discountedSubtotal += discountedBase;

      if (pricesIncludeTax) {
        // We extracted tax before discount, so approximate discounted tax proportionally.
        const originalBase = l.base;
        const scale = originalBase > 0 ? discountedBase / originalBase : 0;
        tax += l.tax * scale;
      } else {
        tax += discountedBase * l.rate;
      }
    }

    const total = discountedSubtotal + tax;
    return { subtotal: discountedSubtotal, tax, total, discount };
  }, [cartLines, data, discountAmount]);

  const tenderedNumber = Number(amountTendered);
  const isCashPayment = paymentMethod === "cash";
  const cashTenderedValid =
    !isCashPayment || (Number.isFinite(tenderedNumber) && tenderedNumber >= totals.total);
  const changeDueDisplay =
    isCashPayment && Number.isFinite(tenderedNumber) ? Math.max(0, tenderedNumber - totals.total) : 0;

  function normalizeCode(value: string) {
    return value.trim().toLowerCase();
  }

  function parseHexColor(input: string) {
    const hex = input.trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    if (![r, g, b].every((n) => Number.isFinite(n))) return null;
    return { r, g, b };
  }

  function chooseTextColor(bgHex: string) {
    const rgb = parseHexColor(bgHex);
    if (!rgb) return "#ffffff";
    const { r, g, b } = rgb;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.62 ? "#0f172a" : "#ffffff";
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
    setIdVerified(false);
    setDeliveryAddress1("");
    setDeliveryAddress2("");
    setDeliveryCity("");
    setDeliveryState("PR");
    setDeliveryPostalCode("");
    setDeliveryInstructions("");
    setDiscountAmount("0");
    setDiscountReason("");
  }

  async function confirmOpenTicket() {
    if (!data) return;

    setError(null);
    setSuccess(null);
    setPlacing(true);

    try {
      if (orderType === "dine_in") {
        setError("Open Ticket is for counter/pickup/delivery (non-table)");
        return;
      }

      const name = customerName.trim();
      if (!name) {
        setError("Customer name is required to open a ticket");
        return;
      }

      if (!idVerified) {
        setError("Driver's license must be verified by staff");
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const userId = sessionData.session?.user.id;
      if (!userId) {
        router.replace("/login");
        return;
      }

      const payload: CreateOrderInput = {
        restaurant_id: data.restaurantId,
        created_by_user_id: userId,
        subtotal: 0,
        tax: 0,
        total: 0,
        order_type: orderType,
        customer_name: name,
        customer_phone: customerPhone.trim() ? customerPhone.trim() : null,
        id_verified: true,
        id_verified_at: new Date().toISOString(),
        id_verified_by_user_id: userId,
        delivery_address1: null,
        delivery_address2: null,
        delivery_city: null,
        delivery_state: null,
        delivery_postal_code: null,
        delivery_instructions: null,
        items: [],
      };

      const created = await createOrder(payload);
      if (created.error) throw created.error;

      const orderId = created.data?.orderId ?? null;
      if (!orderId) throw new Error("Failed to open ticket");

      setOrders((prev) => {
        const nextRow: OrderSummary = {
          id: orderId,
          ticket_no: created.data?.ticketNo ?? null,
          status: "open",
          total: 0,
          created_at: new Date().toISOString(),
          order_type: orderType,
          customer_name: name,
          delivery_status: orderType === "delivery" ? "needs_dispatch" : null,
          delivery_provider: null,
          delivery_tracking_url: null,
          payment_method: null,
          paid_at: null,
          amount_tendered: null,
          change_due: null,
          refunded_at: null,
          refunded_by_user_id: null,
          refund_reason: null,
        };

        const merged = [nextRow, ...prev.filter((o) => o.id !== orderId)];
        return merged;
      });

      setOrderStatusFilter("open");
      setOrderSearch("");

      setActiveOrderId(orderId);
      setActiveOrderStatus("open");
      setShowOpenTicketModal(false);
      setSuccess("Ticket opened");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to open ticket";
      setError(msg);
    } finally {
      setPlacing(false);
    }
  }

  const refreshOrders = useCallback(
    async (restaurantId: string) => {
    // Skip Supabase calls when offline - just show local orders
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      const offline = listOfflineOrderSummaries(restaurantId);
      setOrders(offline);
      refreshOfflineQueueCount(restaurantId);
      return;
    }

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

    // Skip refreshing orders when offline
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

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
      const nameMatch = (o.customer_name ?? "").toLowerCase().includes(q);
      return idMatch || ticketMatch || nameMatch;
    });
  }, [orderSearch, orders]);

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
          taxType: (row as { tax_type?: TaxType }).tax_type ?? "state_tax",
          modifiers: (row as { modifiers?: SelectedModifier[] }).modifiers ?? [],
        };
      }
      setCart(next);
      setDiscountAmount(String((offline.payload.discount_amount ?? 0) as number));
      setDiscountReason(String(offline.payload.discount_reason ?? ""));
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

    const [itemsRes, metaRes, receiptRes] = await Promise.all([
      getOrderItems(orderId),
      getOrderDeliveryMeta(orderId),
      getOrderReceipt(orderId),
    ]);

    if (itemsRes.error) {
      setError(itemsRes.error.message);
      return;
    }

    if (metaRes.error) {
      setError(metaRes.error.message);
      return;
    }

    if (receiptRes.error) {
      setError(receiptRes.error.message);
      return;
    }

    const meta = metaRes.data;
    const receiptData = receiptRes.data;

    setOrderType(meta?.order_type ?? "counter");
    setCustomerName(meta?.customer_name ?? "");
    setCustomerPhone(meta?.customer_phone ?? "");
    setIdVerified(Boolean(meta?.id_verified));
    setDeliveryAddress1(meta?.delivery_address1 ?? "");
    setDeliveryAddress2(meta?.delivery_address2 ?? "");
    setDeliveryCity(meta?.delivery_city ?? "");
    setDeliveryState(meta?.delivery_state ?? "PR");
    setDeliveryPostalCode(meta?.delivery_postal_code ?? "");
    setDeliveryInstructions(meta?.delivery_instructions ?? "");

    setDiscountAmount(String(Number(receiptData?.order.discount_amount ?? 0)));
    setDiscountReason(String(receiptData?.order.discount_reason ?? ""));

    const next: Record<string, CartLine> = {};
    for (const row of receiptData?.items ?? itemsRes.data ?? []) {
      const menuItem = data?.items.find((it) => it.id === row.menu_item_id);
      next[row.menu_item_id] = {
        id: row.menu_item_id,
        name: row.name,
        unitPrice: Number(row.unit_price),
        qty: row.qty,
        taxType: (menuItem?.tax_type as TaxType) ?? "state_tax",
        modifiers: (row as { modifiers?: SelectedModifier[] }).modifiers ?? [],
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
    const isOther = paymentMethod === "other";
    const changeDue = isCash && Number.isFinite(tendered) ? tendered - totals.total : 0;
    if (isCash && (!Number.isFinite(tendered) || tendered < totals.total)) {
      setError("Cash payment requires amount tendered >= total");
      return;
    }

    if (isOther) {
      const reason = otherPaymentReason.trim();
      if (!reason) {
        setError("Other payment requires a written reason");
        return;
      }
      if (!otherPaymentApproved) {
        setError("Other payment requires staff approval");
        return;
      }
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

    // Build items first (doesn't need network)
    const items = cartLines.map((it) => ({
      menu_item_id: it.id,
      name: it.name,
      unit_price: it.unitPrice,
      qty: it.qty,
      line_total: it.unitPrice * it.qty,
      modifiers: it.modifiers,
    }));

    // Validate inputs before any network calls
    if (orderType === "delivery") {
      if (!customerName.trim()) {
        setError("Delivery requires customer name");
        setPlacing(false);
        return;
      }
      if (!customerPhone.trim()) {
        setError("Delivery requires customer phone");
        setPlacing(false);
        return;
      }
      if (!deliveryAddress1.trim() || !deliveryCity.trim() || !deliveryState.trim() || !deliveryPostalCode.trim()) {
        setError("Delivery requires address, city, state, and postal code");
        setPlacing(false);
        return;
      }
    }

    if (orderType !== "dine_in") {
      if (!customerName.trim()) {
        setError("Customer name is required");
        setPlacing(false);
        return;
      }
      if (!idVerified) {
        setError("Driver's license must be verified by staff");
        setPlacing(false);
        return;
      }
    }

    let userId: string | null = null;
    let payload: CreateOrderInput | null = null;

    // Check if offline - save locally without network calls
    const isOfflineNow = typeof navigator !== "undefined" && !navigator.onLine;
    
    if (isOfflineNow) {
      // Build payload for offline save (use placeholder userId)
      payload = {
        restaurant_id: data.restaurantId,
        created_by_user_id: "offline-user",
        discount_amount: Number(totals.discount.toFixed(2)),
        discount_reason: discountReason.trim() ? discountReason.trim() : null,
        subtotal: Number(totals.subtotal.toFixed(2)),
        tax: Number(totals.tax.toFixed(2)),
        total: Number(totals.total.toFixed(2)),
        order_type: orderType,
        customer_name: customerName.trim() ? customerName.trim() : null,
        customer_phone: customerPhone.trim() ? customerPhone.trim() : null,
        id_verified: orderType === "dine_in" ? null : idVerified,
        id_verified_at: orderType === "dine_in" || !idVerified ? null : new Date().toISOString(),
        id_verified_by_user_id: null,
        delivery_address1: orderType === "delivery" && deliveryAddress1.trim() ? deliveryAddress1.trim() : null,
        delivery_address2: orderType === "delivery" && deliveryAddress2.trim() ? deliveryAddress2.trim() : null,
        delivery_city: orderType === "delivery" && deliveryCity.trim() ? deliveryCity.trim() : null,
        delivery_state: orderType === "delivery" && deliveryState.trim() ? deliveryState.trim() : null,
        delivery_postal_code: orderType === "delivery" && deliveryPostalCode.trim() ? deliveryPostalCode.trim() : null,
        delivery_instructions: orderType === "delivery" && deliveryInstructions.trim() ? deliveryInstructions.trim() : null,
        items,
      };

      const { local_id } = upsertOfflineOrder(data.restaurantId, {
        local_id: activeOrderId && isOfflineOrderId(activeOrderId) ? activeOrderId : undefined,
        created_by_user_id: "offline-user",
        payload,
        status: "open",
      });

      setIsOffline(true);
      setActiveOrderId(local_id);
      setActiveOrderStatus("open");
      refreshOfflineQueueCount(data.restaurantId);
      clearCart();
      await refreshOrders(data.restaurantId);
      setSuccess(`Saved OFFLINE: ${local_id}`);
      setPlacing(false);
      return;
    }

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      userId = sessionData.session?.user.id ?? null;
      if (!userId) {
        router.replace("/login");
        return;
      }

      payload = {
        restaurant_id: data.restaurantId,
        created_by_user_id: userId,
        discount_amount: Number(totals.discount.toFixed(2)),
        discount_reason: discountReason.trim() ? discountReason.trim() : null,
        subtotal: Number(totals.subtotal.toFixed(2)),
        tax: Number(totals.tax.toFixed(2)),
        total: Number(totals.total.toFixed(2)),
        order_type: orderType,
        customer_name: customerName.trim() ? customerName.trim() : null,
        customer_phone: customerPhone.trim() ? customerPhone.trim() : null,
        id_verified: orderType === "dine_in" ? null : idVerified,
        id_verified_at: orderType === "dine_in" || !idVerified ? null : new Date().toISOString(),
        id_verified_by_user_id: orderType === "dine_in" || !idVerified ? null : userId,
        delivery_address1: orderType === "delivery" && deliveryAddress1.trim() ? deliveryAddress1.trim() : null,
        delivery_address2: orderType === "delivery" && deliveryAddress2.trim() ? deliveryAddress2.trim() : null,
        delivery_city: orderType === "delivery" && deliveryCity.trim() ? deliveryCity.trim() : null,
        delivery_state: orderType === "delivery" && deliveryState.trim() ? deliveryState.trim() : null,
        delivery_postal_code:
          orderType === "delivery" && deliveryPostalCode.trim() ? deliveryPostalCode.trim() : null,
        delivery_instructions:
          orderType === "delivery" && deliveryInstructions.trim() ? deliveryInstructions.trim() : null,
        items: cartLines.map((it) => ({
          menu_item_id: it.id,
          name: it.name,
          unit_price: it.unitPrice,
          qty: it.qty,
          line_total: it.unitPrice * it.qty,
          modifiers: it.modifiers,
        })),
      };

      if (!payload) throw new Error("Failed to build ticket payload");

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
        <div className="text-sm text-zinc-600 dark:text-zinc-400">{error ?? "No data."}</div>
      </div>
    );
  }

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-3 text-3xl font-semibold tracking-tight">
              <MarketingLogo className="shrink-0" size={44} variant="lockup" />
            </div>
            <p className="text-sm text-[var(--mp-muted)]">Add items and place an order.</p>
          </div>
          <div className="flex gap-2">
            <div className="hidden md:block">
              <input
                data-tour="pos.scan"
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
              type="button"
              onClick={() => {
                setTimeClockError(null);
                setShowTimeClockModal(true);
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white"
            >
              Time Clock
            </button>
            <button
              data-tour="pos.tables"
              onClick={() => router.push("/pos/tables")}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white"
            >
              Tables
            </button>
            <button
              data-tour="pos.openTickets"
              type="button"
              onClick={() => {
                setShowOpenTickets(true);
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white disabled:opacity-60"
              disabled={openNonTableTickets.length === 0}
            >
              <span className="text-red-600">Open tickets</span>
              <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--mp-primary)] px-2 text-xs font-extrabold text-[var(--mp-primary-contrast)]">
                {openNonTableTickets.length}
              </span>
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
          <div
            data-tour="pos.offlineBanner"
            className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
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

            <div className="rounded-2xl border border-[var(--mp-border)] bg-white p-3">
              <div className="text-xs font-semibold">Discount</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="h-10 w-full rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                />
                <input
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="Reason"
                  className="h-10 w-full rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                />
              </div>
            </div>
          </div>
        ) : null}

      {showTimeClockModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-[#fffdf7] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Time Clock</div>
                <div className="mt-1 text-sm text-[var(--mp-muted)]">
                  {timeClockUserId ? "Tap your action." : "Sign in to use the time clock."}
                </div>
              </div>
              <button
                onClick={() => setShowTimeClockModal(false)}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold hover:bg-zinc-50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--mp-border)] bg-white p-4">
              <div className="text-sm font-semibold">Status</div>
              <div className="mt-1 text-sm text-[var(--mp-muted)]">
                {timeClockStatus.clockedIn
                  ? timeClockStatus.onBreak
                    ? "On break"
                    : "Clocked in"
                  : "Not clocked in"}
              </div>
              {timeClockStatus.last ? (
                <div className="mt-2 text-xs text-[var(--mp-muted)]">
                  Last: {timeClockStatus.last.action.replace("_", " ")} @ {new Date(timeClockStatus.last.at).toLocaleString()}
                </div>
              ) : null}
              {timeClockError ? <div className="mt-2 text-sm text-red-700">{timeClockError}</div> : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void saveTimeClockEntry("clock_in")}
                disabled={timeClockSaving || !timeClockUserId || timeClockStatus.clockedIn}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--mp-primary)] px-4 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
              >
                Clock In
              </button>

              <button
                type="button"
                onClick={() => void saveTimeClockEntry("clock_out")}
                disabled={timeClockSaving || !timeClockUserId || !timeClockStatus.clockedIn}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--mp-border)] bg-white px-4 text-sm font-semibold hover:bg-white disabled:opacity-60"
              >
                Clock Out
              </button>

              <button
                type="button"
                onClick={() => void saveTimeClockEntry("break_out")}
                disabled={timeClockSaving || !timeClockUserId || !timeClockStatus.clockedIn || timeClockStatus.onBreak}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--mp-border)] bg-white px-4 text-sm font-semibold hover:bg-white disabled:opacity-60"
              >
                Break Out
              </button>

              <button
                type="button"
                onClick={() => void saveTimeClockEntry("break_in")}
                disabled={timeClockSaving || !timeClockUserId || !timeClockStatus.clockedIn || !timeClockStatus.onBreak}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--mp-border)] bg-white px-4 text-sm font-semibold hover:bg-white disabled:opacity-60"
              >
                Break In
              </button>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowTimeClockModal(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-white"
              >
                Done
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
                        ? "border-[var(--mp-primary)] bg-[var(--mp-primary)] text-black"
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
                      style={
                        activeCategoryId === c.id
                          ? {
                              backgroundColor: c.color ?? "#00b3a4",
                              borderColor: c.color ?? "#00b3a4",
                              color: "#000000",
                            }
                          : {
                              backgroundColor: "#ffffff",
                              borderColor: c.color ?? "var(--mp-border)",
                              color: c.color ?? "var(--mp-fg)",
                            }
                      }
                      className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors hover:bg-black/[0.03]`}
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
                          void addItemWithOptionalModifiers({
                            id: it.id,
                            name: it.name,
                            baseUnitPrice: Number(it.price),
                            taxType: (it.tax_type as TaxType) ?? "state_tax",
                            qtyToAdd,
                          });
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

          <div className="flex flex-col rounded-3xl border border-[var(--mp-border)] bg-white p-5 shadow-sm">
            <div className="min-h-0 flex-1 overflow-auto pr-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">Order</div>
                  <div className="mt-1 text-xs text-[var(--mp-muted)]">
                    {orderType === "dine_in" && customerName.trim() ? customerName.trim() : orderType.replace("_", " ")}
                    {activeOrderId ? " • editing" : ""}
                  </div>
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

              {orderType !== "dine_in" ? (
                <div className="grid gap-2">
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={idVerified}
                      onChange={(e) => setIdVerified(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span>Driver&apos;s license verified (staff)</span>
                  </label>
                </div>
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
                    <div className="text-xs text-[var(--mp-muted)]">Discount</div>
                    <div className="text-sm font-semibold tabular-nums">-${totals.discount.toFixed(2)}</div>
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

              <div className="text-xs text-[var(--mp-muted)]">
                Tax settings: {(data.ivuRate * 100).toFixed(2)}%{data.pricesIncludeTax ? " (prices include tax)" : ""}
              </div>
              </div>
            </div>

            <div className="sticky bottom-0 mt-4 border-t border-[var(--mp-border)] bg-white pt-3">
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  {!activeOrderId && orderType !== "dine_in" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setSuccess(null);
                        setShowOpenTicketModal(true);
                      }}
                      disabled={placing}
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      Open Ticket
                    </button>
                  ) : (
                    <div />
                  )}

                  <button
                    type="button"
                    onClick={clearCart}
                    disabled={placing || cartLines.length === 0}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-5 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60"
                  data-tour="pos.placeOrder"
                  >
                    Clear
                  </button>
                </div>

                <button
                  onClick={placeOrder}
                  disabled={placing || cartLines.length === 0}
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
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
                        setOtherPaymentReason("");
                        setOtherPaymentApproved(false);
                        setShowPaymentModal(true);
                      }}
                      disabled={placing}
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      Close (Paid)
                    </button>
                    <button
                      onClick={() => setTicketStatus("canceled")}
                      disabled={placing}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showOpenTickets ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            onClick={() => setShowOpenTickets(false)}
            className="absolute inset-0 bg-black/30"
            aria-label="Close"
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-[var(--mp-border)] bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--mp-border)] px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-[var(--mp-fg)]">Open tickets</div>
                <div className="mt-1 text-xs text-[var(--mp-muted)]">{openNonTableTickets.length} open</div>
              </div>
              <button
                type="button"
                onClick={() => setShowOpenTickets(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-xs font-semibold hover:bg-white"
              >
                Close
              </button>
            </div>

            <div className="p-5">
              {openNonTableTickets.length === 0 ? (
                <div className="rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm text-[var(--mp-muted)]">
                  No open tickets.
                </div>
              ) : (
                <div className="grid gap-2">
                  {openNonTableTickets.map((t) => {
                    const label =
                      (t.customer_name ?? "").trim() ||
                      (t.ticket_no != null ? `#${t.ticket_no}` : t.id.slice(0, 8));
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          void openOrder(t.id);
                          setShowOpenTickets(false);
                        }}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3 text-left hover:bg-black/[0.03]"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[var(--mp-fg)]">{label}</div>
                          <div className="mt-1 text-xs text-[var(--mp-muted)]">{t.order_type ?? "counter"}</div>
                        </div>
                        <div className="text-xs font-semibold text-[var(--mp-primary)]">Open</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

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

            {paymentMethod === "other" ? (
              <div className="mt-4 grid gap-3">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Reason</label>
                  <input
                    value={otherPaymentReason}
                    onChange={(e) => setOtherPaymentReason(e.target.value)}
                    placeholder="Write reason"
                    className="h-11 rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                  />
                  <div className="text-xs text-[var(--mp-muted)]">Required for Other payments.</div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={otherPaymentApproved}
                    onChange={(e) => setOtherPaymentApproved(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span>Staff approval</span>
                </label>
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
                disabled={
                  placing ||
                  (paymentMethod === "cash" && !cashTenderedValid) ||
                  (paymentMethod === "other" && (!otherPaymentReason.trim() || !otherPaymentApproved))
                }
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
                          {(it.modifiers ?? []).length > 0 ? (
                            <div className="mt-1 text-[11px] text-zinc-500">
                              {(it.modifiers ?? [])
                                .map((m) => (m.option_name ? `${m.option_name}${m.price_delta ? ` (+$${Number(m.price_delta).toFixed(2)})` : ""}` : ""))
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                          ) : null}
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
                    {Number(receipt.order.discount_amount ?? 0) > 0 ? (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <div className="text-zinc-600 dark:text-zinc-400">Discount</div>
                        <div>-${Number(receipt.order.discount_amount ?? 0).toFixed(2)}</div>
                      </div>
                    ) : null}
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

      {showOpenTicketModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-[#fffdf7] p-6 shadow-xl">
            <div className="text-base font-semibold">Open ticket</div>
            <div className="mt-2 text-sm text-[var(--mp-muted)]">Customer name + staff ID verification required.</div>

            <div className="mt-4 grid gap-3">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
                className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
              />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={idVerified}
                  onChange={(e) => setIdVerified(e.target.checked)}
                  className="h-4 w-4"
                />
                <span>Driver&apos;s license verified by staff</span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowOpenTicketModal(false)}
                disabled={placing}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirmOpenTicket}
                disabled={placing}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
              >
                {placing ? "Saving..." : "Open"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showModifiersModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-[#fffdf7] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Modifiers</div>
                <div className="mt-1 text-sm text-[var(--mp-muted)]">{modifiersItemName}</div>
              </div>
              <button
                onClick={() => setShowModifiersModal(false)}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-3 text-xs font-semibold hover:bg-white"
              >
                Close
              </button>
            </div>

            {modifiersError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {modifiersError}
              </div>
            ) : null}

            <div className="mt-4 grid gap-4">
              {modifiersData.map((g) => {
                const selected = selectedModifiersByGroup[g.group.id];
                return (
                  <div key={g.link.id} className="rounded-2xl border border-[var(--mp-border)] bg-white p-4">
                    <div className="text-sm font-semibold">{g.group.name}</div>
                    {g.group.description ? (
                      <div className="mt-1 text-xs text-[var(--mp-muted)]">{g.group.description}</div>
                    ) : null}
                    <div className="mt-3 grid gap-2">
                      {g.options.map((o) => {
                        const isSelected = selected?.option_id === o.id;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() =>
                              setSelectedModifiersByGroup((prev) => ({
                                ...prev,
                                [g.group.id]: {
                                  group_id: g.group.id,
                                  option_id: o.id,
                                  option_name: o.name,
                                  qty: 1,
                                  price_delta: Number(o.price_delta),
                                },
                              }))
                            }
                            className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-medium ${
                              isSelected
                                ? "border-[var(--mp-primary)] bg-[var(--mp-primary)] text-black"
                                : "border-[var(--mp-border)] bg-white text-[var(--mp-fg)] hover:bg-black/[0.03]"
                            }`}
                          >
                            <span>{o.name}</span>
                            <span className="text-xs opacity-80">{Number(o.price_delta) ? `+$${Number(o.price_delta).toFixed(2)}` : "$0.00"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowModifiersModal(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-5 text-sm font-semibold hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!modifiersItemId) return;
                  const mods = Object.values(selectedModifiersByGroup);
                  tryAddItem(
                    modifiersItemId,
                    modifiersItemName,
                    modifiersItemPrice,
                    modifiersItemTaxType,
                    qtyToAdd,
                    mods,
                  );
                  setShowModifiersModal(false);
                }}
                disabled={modifiersLoading}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-5 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
