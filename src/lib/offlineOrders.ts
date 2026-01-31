import type { CreateOrderInput, OrderSummary } from "@/lib/posData";

export type OfflineOrderPayment = {
  payment_method: string;
  paid_at: string;
  amount_tendered: number | null;
  change_due: number | null;
};

export type OfflineOrder = {
  local_id: string;
  restaurant_id: string;
  created_by_user_id: string;
  created_at: string;
  status: "open" | "paid" | "canceled";
  payload: CreateOrderInput;
  payment: OfflineOrderPayment | null;
};

function storageKey(restaurantId: string) {
  return `pos.offlineOrders.${restaurantId}`;
}

function syncKey(restaurantId: string) {
  return `pos.offlineOrdersSynced.${restaurantId}`;
}

export function isOfflineOrderId(id: string) {
  return id.startsWith("local_");
}

export function loadOfflineOrders(restaurantId: string): OfflineOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(restaurantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as OfflineOrder[];
  } catch {
    return [];
  }
}

export function saveOfflineOrders(restaurantId: string, orders: OfflineOrder[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(restaurantId), JSON.stringify(orders));
  } catch {
    // ignore storage failures (Safari Private / quota)
  }
}

export function loadOfflineSyncedMap(restaurantId: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(syncKey(restaurantId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export function markOfflineOrderSynced(restaurantId: string, localId: string, orderId: string) {
  if (typeof window === "undefined") return;
  const prev = loadOfflineSyncedMap(restaurantId);
  const next = { ...prev, [localId]: orderId };
  try {
    window.localStorage.setItem(syncKey(restaurantId), JSON.stringify(next));
  } catch {
    // ignore storage failures (Safari Private / quota)
  }
  return next;
}

export function getSyncedCloudOrderId(restaurantId: string, localId: string) {
  const map = loadOfflineSyncedMap(restaurantId);
  return map[localId] ?? null;
}

export function upsertOfflineOrder(
  restaurantId: string,
  input: {
    local_id?: string;
    created_by_user_id: string;
    payload: CreateOrderInput;
    status?: OfflineOrder["status"];
    payment?: OfflineOrderPayment | null;
    created_at?: string;
  },
) {
  const prev = loadOfflineOrders(restaurantId);
  const localId = input.local_id ?? `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const createdAt = input.created_at ?? new Date().toISOString();

  const existingIndex = prev.findIndex((o) => o.local_id === localId);

  const nextOrder: OfflineOrder = {
    local_id: localId,
    restaurant_id: restaurantId,
    created_by_user_id: input.created_by_user_id,
    created_at: existingIndex >= 0 ? prev[existingIndex]?.created_at ?? createdAt : createdAt,
    status: input.status ?? (existingIndex >= 0 ? prev[existingIndex]?.status ?? "open" : "open"),
    payload: input.payload,
    payment: input.payment ?? (existingIndex >= 0 ? prev[existingIndex]?.payment ?? null : null),
  };

  const next = [...prev];
  if (existingIndex >= 0) next[existingIndex] = nextOrder;
  else next.unshift(nextOrder);

  saveOfflineOrders(restaurantId, next);
  return { orders: next, local_id: localId };
}

export function removeOfflineOrder(restaurantId: string, localId: string) {
  const prev = loadOfflineOrders(restaurantId);
  const next = prev.filter((o) => o.local_id !== localId);
  saveOfflineOrders(restaurantId, next);
  return next;
}

export function getOfflineOrder(restaurantId: string, localId: string) {
  const prev = loadOfflineOrders(restaurantId);
  return prev.find((o) => o.local_id === localId) ?? null;
}

export function listOfflineOrderSummaries(restaurantId: string): OrderSummary[] {
  const rows = loadOfflineOrders(restaurantId);
  return rows.map((o) => ({
    id: o.local_id,
    ticket_no: null,
    status: o.status,
    total: Number(o.payload.total),
    created_at: o.created_at,
    order_type: o.payload.order_type ?? "counter",
    payment_method: o.payment?.payment_method ?? null,
    paid_at: o.payment?.paid_at ?? null,
    amount_tendered: o.payment?.amount_tendered ?? null,
    change_due: o.payment?.change_due ?? null,
  }));
}
