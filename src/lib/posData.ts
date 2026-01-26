import { supabase } from "@/lib/supabaseClient";
import {
  getSetupContext,
  getTaxConfigByRestaurant,
  listMenuCategories,
  listMenuItems,
  type MenuCategory,
  type MenuItem,
} from "@/lib/setupData";

export type PosMenuData = {
  restaurantId: string;
  categories: MenuCategory[];
  items: MenuItem[];
  ivuRate: number;
  pricesIncludeTax: boolean;
};

export type OrderType = "counter" | "pickup" | "delivery" | "dine_in";

export async function findMenuItemByCode(restaurantId: string, code: string) {
  const q = code.trim();
  if (!q) return { data: null as MenuItem | null, error: null as Error | null };

  const res = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .or(`barcode.eq.${q},sku.eq.${q}`)
    .maybeSingle<MenuItem>();

  return { data: res.data ?? null, error: res.error };
}

export async function loadPosMenuData(): Promise<
  | { data: PosMenuData; error: null }
  | { data: null; error: Error }
> {
  const ctx = await getSetupContext();
  if (ctx.error || !ctx.session) {
    return { data: null, error: ctx.error instanceof Error ? ctx.error : new Error("Not signed in") };
  }

  const restaurantId = (ctx.config?.restaurant_id as string | null) ?? null;
  if (!restaurantId) {
    return { data: null, error: new Error("Missing restaurant_id (complete setup first)") };
  }

  const [catsRes, itemsRes, taxRes] = await Promise.all([
    listMenuCategories(restaurantId),
    listMenuItems(restaurantId),
    getTaxConfigByRestaurant(restaurantId),
  ]);

  if (catsRes.error) return { data: null, error: catsRes.error };
  if (itemsRes.error) return { data: null, error: itemsRes.error };
  if (taxRes.error) return { data: null, error: taxRes.error };

  const ivuRate = taxRes.data?.ivu_rate ?? 0;
  const pricesIncludeTax = taxRes.data?.prices_include_tax ?? false;

  return {
    data: {
      restaurantId,
      categories: catsRes.data ?? [],
      items: (itemsRes.data ?? []).filter((it) => it.is_active),
      ivuRate,
      pricesIncludeTax,
    },
    error: null,
  };
}

export type CreateOrderInput = {
  restaurant_id: string;
  created_by_user_id: string;
  offline_local_id?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  order_type?: OrderType;
  customer_name?: string | null;
  customer_phone?: string | null;
  id_verified?: boolean | null;
  id_verified_at?: string | null;
  id_verified_by_user_id?: string | null;
  delivery_address1?: string | null;
  delivery_address2?: string | null;
  delivery_city?: string | null;
  delivery_state?: string | null;
  delivery_postal_code?: string | null;
  delivery_instructions?: string | null;
  items: Array<{
    menu_item_id: string;
    name: string;
    unit_price: number;
    qty: number;
    line_total: number;
  }>;
};

export type OrderSummary = {
  id: string;
  ticket_no?: number | null;
  status: string;
  total: number;
  created_at: string;
  order_type?: OrderType | null;
  delivery_status?: string | null;
  delivery_provider?: string | null;
  delivery_tracking_url?: string | null;
  payment_method?: string | null;
  paid_at?: string | null;
  amount_tendered?: number | null;
  change_due?: number | null;
  refunded_at?: string | null;
  refunded_by_user_id?: string | null;
  refund_reason?: string | null;
};

export type DineInTableOrder = {
  id: string;
  ticket_no: number | null;
  status: string;
  total: number;
  created_at: string;
  customer_name: string | null;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  unit_price: number;
  qty: number;
  line_total: number;
};

export type OrderReceipt = {
  restaurant_name: string | null;
  order: {
    id: string;
    ticket_no: number | null;
    restaurant_id: string;
    status: string;
    created_at: string;
    subtotal: number;
    tax: number;
    total: number;
    order_type?: OrderType | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    delivery_address1?: string | null;
    delivery_address2?: string | null;
    delivery_city?: string | null;
    delivery_state?: string | null;
    delivery_postal_code?: string | null;
    delivery_instructions?: string | null;
    delivery_status?: string | null;
    delivery_provider?: string | null;
    delivery_tracking_url?: string | null;
    payment_method: string | null;
    paid_at: string | null;
    amount_tendered: number | null;
    change_due: number | null;
  };
  items: OrderItemRow[];
};

export type SalesSummaryRow = {
  id: string;
  restaurant_id: string;
  created_at: string;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string | null;
};

export async function createOrder(input: CreateOrderInput) {
  const orderRes = await supabase
    .from("orders")
    .insert({
      restaurant_id: input.restaurant_id,
      created_by_user_id: input.created_by_user_id,
      offline_local_id: input.offline_local_id ?? null,
      subtotal: input.subtotal,
      tax: input.tax,
      total: input.total,
      status: "open",
      order_type: input.order_type ?? "counter",
      customer_name: input.customer_name ?? null,
      customer_phone: input.customer_phone ?? null,
      id_verified: input.id_verified ?? null,
      id_verified_at: input.id_verified_at ?? null,
      id_verified_by_user_id: input.id_verified_by_user_id ?? null,
      delivery_address1: input.delivery_address1 ?? null,
      delivery_address2: input.delivery_address2 ?? null,
      delivery_city: input.delivery_city ?? null,
      delivery_state: input.delivery_state ?? null,
      delivery_postal_code: input.delivery_postal_code ?? null,
      delivery_instructions: input.delivery_instructions ?? null,
      delivery_status: (input.order_type ?? "counter") === "delivery" ? "needs_dispatch" : null,
    })
    .select("id, ticket_no")
    .maybeSingle<{ id: string; ticket_no: number | null }>();

  if (orderRes.error)
    return { data: null as { orderId: string; ticketNo: number | null } | null, error: orderRes.error };
  const orderId = orderRes.data?.id;
  if (!orderId) return { data: null, error: new Error("Failed to create order") };

  if (input.items.length > 0) {
    const itemsRes = await supabase.from("order_items").insert(
      input.items.map((it) => ({
        restaurant_id: input.restaurant_id,
        order_id: orderId,
        menu_item_id: it.menu_item_id,
        name: it.name,
        unit_price: it.unit_price,
        qty: it.qty,
        line_total: it.line_total,
      })),
    );

    if (itemsRes.error) return { data: null, error: itemsRes.error };
  }

  return { data: { orderId, ticketNo: orderRes.data?.ticket_no ?? null }, error: null };
}

export async function findOrderByOfflineLocalId(restaurantId: string, offlineLocalId: string) {
  const q = offlineLocalId.trim();
  if (!q) return { data: null as { id: string; ticket_no: number | null } | null, error: null as Error | null };

  const res = await supabase
    .from("orders")
    .select("id, ticket_no")
    .eq("restaurant_id", restaurantId)
    .eq("offline_local_id", q)
    .limit(1)
    .maybeSingle<{ id: string; ticket_no: number | null }>();

  return { data: res.data ?? null, error: res.error };
}

export async function updateOrderStatus(orderId: string, status: "paid" | "canceled") {
  const updated = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("id, status")
    .maybeSingle<{ id: string; status: string }>();

  return { data: updated.data ?? null, error: updated.error };
}

export async function markOrderPaid(
  orderId: string,
  input: {
    payment_method: string;
    paid_at: string;
    amount_tendered?: number | null;
    change_due?: number | null;
  },
) {
  const updated = await supabase
    .from("orders")
    .update({
      status: "paid",
      payment_method: input.payment_method,
      paid_at: input.paid_at,
      amount_tendered: input.amount_tendered ?? null,
      change_due: input.change_due ?? null,
    })
    .eq("id", orderId)
    .select("id, status")
    .maybeSingle<{ id: string; status: string }>();

  return { data: updated.data ?? null, error: updated.error };
}

export async function listRecentOrders(restaurantId: string, limit = 20) {
  return listRecentOrdersFiltered(restaurantId, { limit });
}

export function formatTableLabel(tableNumber: number) {
  return `Table ${tableNumber}`;
}

export async function listOpenDineInOrders(restaurantId: string) {
  return supabase
    .from("orders")
    .select("id, ticket_no, status, total, created_at, customer_name")
    .eq("restaurant_id", restaurantId)
    .eq("status", "open")
    .eq("order_type", "dine_in")
    .order("created_at", { ascending: false })
    .returns<DineInTableOrder[]>();
}

export async function findOpenDineInOrderByTable(restaurantId: string, tableLabel: string) {
  const q = tableLabel.trim();
  if (!q) return { data: null as DineInTableOrder | null, error: null as Error | null };

  const res = await supabase
    .from("orders")
    .select("id, ticket_no, status, total, created_at, customer_name")
    .eq("restaurant_id", restaurantId)
    .eq("status", "open")
    .eq("order_type", "dine_in")
    .eq("customer_name", q)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<DineInTableOrder>();

  return { data: res.data ?? null, error: res.error };
}

export async function listRecentOrdersFiltered(
  restaurantId: string,
  opts?: {
    limit?: number;
    status?: "open" | "paid" | "canceled" | "refunded";
    since?: string;
  },
) {
  const limit = opts?.limit ?? 20;
  let q = supabase
    .from("orders")
    .select(
      "id, ticket_no, status, total, created_at, order_type, delivery_status, delivery_provider, delivery_tracking_url, payment_method, paid_at, amount_tendered, change_due, refunded_at, refunded_by_user_id, refund_reason",
    )
    .eq("restaurant_id", restaurantId);

  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.since) q = q.gte("created_at", opts.since);

  return q.order("created_at", { ascending: false }).limit(limit).returns<OrderSummary[]>();
}

export async function refundOrder(
  orderId: string,
  input: {
    refunded_by_user_id: string;
    refund_reason?: string | null;
    refunded_at: string;
  },
) {
  const updated = await supabase
    .from("orders")
    .update({
      status: "refunded",
      refunded_at: input.refunded_at,
      refunded_by_user_id: input.refunded_by_user_id,
      refund_reason: input.refund_reason ?? null,
    })
    .eq("id", orderId)
    .select("id, status")
    .maybeSingle<{ id: string; status: string }>();

  return { data: updated.data ?? null, error: updated.error };
}

export async function listPaidOrdersForSummary(
  restaurantId: string,
  opts?: {
    since?: string;
  },
) {
  let q = supabase
    .from("orders")
    .select("id, restaurant_id, created_at, subtotal, tax, total, payment_method")
    .eq("restaurant_id", restaurantId)
    .eq("status", "paid");

  if (opts?.since) q = q.gte("created_at", opts.since);

  return q.order("created_at", { ascending: false }).returns<SalesSummaryRow[]>();
}

export async function getOrderItems(orderId: string) {
  return supabase
    .from("order_items")
    .select("id, order_id, menu_item_id, name, unit_price, qty, line_total")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .returns<OrderItemRow[]>();
}

export async function getOrderReceipt(orderId: string) {
  const orderRes = await supabase
    .from("orders")
    .select(
      "id, ticket_no, restaurant_id, status, created_at, subtotal, tax, total, order_type, customer_name, customer_phone, delivery_address1, delivery_address2, delivery_city, delivery_state, delivery_postal_code, delivery_instructions, delivery_status, delivery_provider, delivery_tracking_url, payment_method, paid_at, amount_tendered, change_due",
    )
    .eq("id", orderId)
    .maybeSingle<{
      id: string;
      ticket_no: number | null;
      restaurant_id: string;
      status: string;
      created_at: string;
      subtotal: number;
      tax: number;
      total: number;
      order_type?: OrderType | null;
      customer_name?: string | null;
      customer_phone?: string | null;
      delivery_address1?: string | null;
      delivery_address2?: string | null;
      delivery_city?: string | null;
      delivery_state?: string | null;
      delivery_postal_code?: string | null;
      delivery_instructions?: string | null;
      delivery_status?: string | null;
      delivery_provider?: string | null;
      delivery_tracking_url?: string | null;
      payment_method: string | null;
      paid_at: string | null;
      amount_tendered: number | null;
      change_due: number | null;
    }>();

  if (orderRes.error) return { data: null as OrderReceipt | null, error: orderRes.error };
  if (!orderRes.data) return { data: null, error: new Error("Order not found") };

  const [itemsRes, restaurantRes] = await Promise.all([
    getOrderItems(orderId),
    supabase
      .from("restaurants")
      .select("name")
      .eq("id", orderRes.data.restaurant_id)
      .maybeSingle<{ name: string }>(),
  ]);

  if (itemsRes.error) return { data: null, error: itemsRes.error };
  if (restaurantRes.error) return { data: null, error: restaurantRes.error };

  return {
    data: {
      restaurant_name: restaurantRes.data?.name ?? null,
      order: orderRes.data,
      items: itemsRes.data ?? [],
    },
    error: null,
  };
}

export async function getOrderDeliveryMeta(orderId: string) {
  return supabase
    .from("orders")
    .select(
      "id, order_type, customer_name, customer_phone, id_verified, id_verified_at, id_verified_by_user_id, delivery_address1, delivery_address2, delivery_city, delivery_state, delivery_postal_code, delivery_instructions, delivery_status, delivery_provider, delivery_tracking_url",
    )
    .eq("id", orderId)
    .maybeSingle<{
      id: string;
      order_type?: OrderType | null;
      customer_name?: string | null;
      customer_phone?: string | null;
      id_verified?: boolean | null;
      id_verified_at?: string | null;
      id_verified_by_user_id?: string | null;
      delivery_address1?: string | null;
      delivery_address2?: string | null;
      delivery_city?: string | null;
      delivery_state?: string | null;
      delivery_postal_code?: string | null;
      delivery_instructions?: string | null;
      delivery_status?: string | null;
      delivery_provider?: string | null;
      delivery_tracking_url?: string | null;
    }>();
}

export async function updateOrder(
  orderId: string,
  input: CreateOrderInput,
) {
  const updated = await supabase
    .from("orders")
    .update({
      subtotal: input.subtotal,
      tax: input.tax,
      total: input.total,
      order_type: input.order_type ?? "counter",
      customer_name: input.customer_name ?? null,
      customer_phone: input.customer_phone ?? null,
      id_verified: input.id_verified ?? null,
      id_verified_at: input.id_verified_at ?? null,
      id_verified_by_user_id: input.id_verified_by_user_id ?? null,
      delivery_address1: input.delivery_address1 ?? null,
      delivery_address2: input.delivery_address2 ?? null,
      delivery_city: input.delivery_city ?? null,
      delivery_state: input.delivery_state ?? null,
      delivery_postal_code: input.delivery_postal_code ?? null,
      delivery_instructions: input.delivery_instructions ?? null,
      delivery_status: (input.order_type ?? "counter") === "delivery" ? "needs_dispatch" : null,
    })
    .eq("id", orderId)
    .select("id, ticket_no")
    .maybeSingle<{ id: string; ticket_no: number | null }>();

  if (updated.error)
    return { data: null as { orderId: string; ticketNo: number | null } | null, error: updated.error };

  const del = await supabase.from("order_items").delete().eq("order_id", orderId);
  if (del.error) return { data: null, error: del.error };

  if (input.items.length > 0) {
    const itemsRes = await supabase.from("order_items").insert(
      input.items.map((it) => ({
        restaurant_id: input.restaurant_id,
        order_id: orderId,
        menu_item_id: it.menu_item_id,
        name: it.name,
        unit_price: it.unit_price,
        qty: it.qty,
        line_total: it.line_total,
      })),
    );

    if (itemsRes.error) return { data: null, error: itemsRes.error };
  }

  return { data: { orderId, ticketNo: updated.data?.ticket_no ?? null }, error: null };
}
