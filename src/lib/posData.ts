import { supabase } from "@/lib/supabaseClient";
import {
  getSetupContext,
  getTaxConfigByRestaurant,
  listMenuCategories,
  listMenuItems,
  type MenuCategory,
  type MenuItem,
} from "@/lib/setupData";

import { DEMO_RESTAURANT_ID, getDemoMenuItemModifiers, getDemoPosMenuData } from "@/lib/demoMenu";

export type PosMenuData = {
  restaurantId: string;
  categories: MenuCategory[];
  items: MenuItem[];
  ivuRate: number;
  pricesIncludeTax: boolean;
};

export type ModifierGroup = {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
};

export type ModifierOption = {
  id: string;
  restaurant_id: string;
  group_id: string;
  name: string;
  price_delta: number;
  is_active: boolean;
  sort_order?: number | null;
};

export type MenuItemModifierGroupLink = {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  group_id: string;
  is_required: boolean;
  min_select: number;
  max_select?: number | null;
  sort_order?: number | null;
};

export type SelectedModifier = {
  group_id: string;
  option_id: string;
  option_name?: string | null;
  qty: number;
  price_delta: number;
};

export type MenuItemModifiers = Array<{
  link: MenuItemModifierGroupLink;
  group: ModifierGroup;
  options: ModifierOption[];
}>;

export type OrderType = "counter" | "pickup" | "delivery" | "dine_in";

export async function findMenuItemByCode(restaurantId: string, code: string) {
  const q = code.trim();
  if (!q) return { data: null as MenuItem | null, error: null as Error | null };

  if (restaurantId === DEMO_RESTAURANT_ID) {
    const demo = getDemoPosMenuData();
    const found = demo.items.find((it) => it.is_active && (it.barcode === q || it.sku === q)) ?? null;
    return { data: found, error: null };
  }

  const res = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .or(`barcode.eq.${q},sku.eq.${q}`)
    .maybeSingle<MenuItem>();

  if (res.error) {
    const demo = getDemoPosMenuData();
    const found = demo.items.find((it) => it.is_active && (it.barcode === q || it.sku === q)) ?? null;
    return { data: found, error: null };
  }

  return { data: res.data ?? null, error: res.error };
}

export async function loadPosMenuData(): Promise<
  | { data: PosMenuData; error: null }
  | { data: null; error: Error }
> {
  const ctx = await getSetupContext();
  if (ctx.error || !ctx.session) {
    return { data: getDemoPosMenuData(), error: null };
  }

  const restaurantId = (ctx.config?.restaurant_id as string | null) ?? null;
  if (!restaurantId) {
    return { data: getDemoPosMenuData(), error: null };
  }

  const [catsRes, itemsRes, taxRes] = await Promise.all([
    listMenuCategories(restaurantId),
    listMenuItems(restaurantId),
    getTaxConfigByRestaurant(restaurantId),
  ]);

  if (catsRes.error || itemsRes.error || taxRes.error) {
    return { data: getDemoPosMenuData(), error: null };
  }

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
  discount_amount?: number;
  discount_reason?: string | null;
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
    modifiers?: SelectedModifier[];
  }>;
};

export type OrderSummary = {
  id: string;
  ticket_no?: number | null;
  status: string;
  total: number;
  created_at: string;
  updated_at?: string;
  order_type?: OrderType | null;
  customer_name?: string | null;
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
  modifiers?: SelectedModifier[];
};

export type OrderReceipt = {
  restaurant_name: string | null;
  order: {
    id: string;
    ticket_no: number | null;
    restaurant_id: string;
    status: string;
    created_at: string;
    discount_amount?: number;
    discount_reason?: string | null;
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

export async function loadMenuItemModifiers(restaurantId: string, menuItemId: string): Promise<
  | { data: MenuItemModifiers; error: null }
  | { data: null; error: Error }
> {
  if (restaurantId === DEMO_RESTAURANT_ID) {
    return { data: getDemoMenuItemModifiers(menuItemId), error: null };
  }

  const linksRes = await supabase
    .from("menu_item_modifier_groups")
    .select("id, restaurant_id, menu_item_id, group_id, is_required, min_select, max_select, sort_order")
    .eq("restaurant_id", restaurantId)
    .eq("menu_item_id", menuItemId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<MenuItemModifierGroupLink[]>();

  if (linksRes.error) {
    return { data: getDemoMenuItemModifiers(menuItemId), error: null };
  }
  const links = linksRes.data ?? [];
  const groupIds = Array.from(new Set(links.map((l) => l.group_id)));
  if (groupIds.length === 0) return { data: [], error: null };

  const [groupsRes, optionsRes] = await Promise.all([
    supabase
      .from("modifier_groups")
      .select("id, restaurant_id, name, description, is_active")
      .eq("restaurant_id", restaurantId)
      .in("id", groupIds)
      .returns<ModifierGroup[]>(),
    supabase
      .from("modifier_options")
      .select("id, restaurant_id, group_id, name, price_delta, is_active, sort_order")
      .eq("restaurant_id", restaurantId)
      .in("group_id", groupIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<ModifierOption[]>(),
  ]);

  if (groupsRes.error || optionsRes.error) {
    return { data: getDemoMenuItemModifiers(menuItemId), error: null };
  }

  const groupById = new Map((groupsRes.data ?? []).map((g) => [g.id, g]));
  const optionsByGroup = new Map<string, ModifierOption[]>();
  for (const o of optionsRes.data ?? []) {
    const arr = optionsByGroup.get(o.group_id) ?? [];
    arr.push({ ...o, price_delta: Number(o.price_delta) });
    optionsByGroup.set(o.group_id, arr);
  }

  const structured: MenuItemModifiers = [];
  for (const link of links) {
    const group = groupById.get(link.group_id);
    if (!group) continue;
    structured.push({
      link,
      group,
      options: optionsByGroup.get(link.group_id) ?? [],
    });
  }

  return { data: structured, error: null };
}

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
      discount_amount: Number(input.discount_amount ?? 0),
      discount_reason: input.discount_reason ?? null,
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
    const itemsIns = await supabase.from("order_items").insert(
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

    if (itemsIns.error) return { data: null, error: itemsIns.error };

    const itemsRes = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true })
      .returns<Array<{ id: string }>>();

    if (itemsRes.error) return { data: null, error: itemsRes.error };

    const inserted = itemsRes.data ?? [];
    const modifierRows: Array<{
      restaurant_id: string;
      order_item_id: string;
      group_id: string;
      option_id: string;
      qty: number;
      price_delta: number;
    }> = [];

    for (let i = 0; i < input.items.length; i += 1) {
      const it = input.items[i];
      const orderItemId = inserted[i]?.id;
      if (!orderItemId) continue;
      const mods = it.modifiers ?? [];
      if (mods.length === 0) continue;
      for (const m of mods) {
        modifierRows.push({
          restaurant_id: input.restaurant_id,
          order_item_id: orderItemId,
          group_id: m.group_id,
          option_id: m.option_id,
          qty: Number(m.qty ?? 1),
          price_delta: Number(m.price_delta ?? 0),
        });
      }
    }

    if (modifierRows.length > 0) {
      const modsRes = await supabase.from("order_item_modifiers").insert(modifierRows);
      if (modsRes.error) return { data: null, error: modsRes.error };
    }
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

export type OrderStatus = "open" | "preparing" | "ready" | "paid" | "canceled" | "refunded";

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const updated = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("id, status")
    .maybeSingle<{ id: string; status: string }>();

  return { data: updated.data ?? null, error: updated.error };
}

export async function listKitchenOrders(restaurantId: string) {
  return supabase
    .from("orders")
    .select(
      "id, ticket_no, status, total, created_at, order_type, customer_name"
    )
    .eq("restaurant_id", restaurantId)
    .in("status", ["open", "preparing", "ready"])
    .order("created_at", { ascending: true })
    .returns<OrderSummary[]>();
}

export async function listAllOrders(
  restaurantId: string,
  opts?: {
    limit?: number;
    status?: OrderStatus;
    orderType?: OrderType;
    since?: string;
    until?: string;
  }
) {
  const limit = opts?.limit ?? 50;
  let q = supabase
    .from("orders")
    .select(
      "id, ticket_no, status, total, created_at, order_type, customer_name, delivery_status, delivery_provider, delivery_tracking_url, payment_method, paid_at, amount_tendered, change_due, refunded_at, refunded_by_user_id, refund_reason"
    )
    .eq("restaurant_id", restaurantId);

  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.orderType) q = q.eq("order_type", opts.orderType);
  if (opts?.since) q = q.gte("created_at", opts.since);
  if (opts?.until) q = q.lte("created_at", opts.until);

  return q.order("created_at", { ascending: false }).limit(limit).returns<OrderSummary[]>();
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
      "id, ticket_no, status, total, created_at, order_type, customer_name, delivery_status, delivery_provider, delivery_tracking_url, payment_method, paid_at, amount_tendered, change_due, refunded_at, refunded_by_user_id, refund_reason",
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

export async function getOrderItemModifiers(orderId: string) {
  const itemsRes = await supabase
    .from("order_items")
    .select("id, menu_item_id")
    .eq("order_id", orderId)
    .returns<Array<{ id: string; menu_item_id: string }>>();

  if (itemsRes.error) return { data: null as Record<string, SelectedModifier[]> | null, error: itemsRes.error };

  const rows = itemsRes.data ?? [];
  const orderItemIds = rows.map((r) => r.id);
  if (orderItemIds.length === 0) return { data: {}, error: null };

  const modsRes = await supabase
    .from("order_item_modifiers")
    .select("order_item_id, group_id, option_id, qty, price_delta, option:modifier_options(name)")
    .in("order_item_id", orderItemIds)
    .returns<
      Array<{
        order_item_id: string;
        group_id: string;
        option_id: string;
        qty: number;
        price_delta: number;
        option: { name: string } | null;
      }>
    >();

  if (modsRes.error) return { data: null, error: modsRes.error };

  const byOrderItemId: Record<string, SelectedModifier[]> = {};
  for (const r of modsRes.data ?? []) {
    byOrderItemId[r.order_item_id] = byOrderItemId[r.order_item_id] ?? [];
    byOrderItemId[r.order_item_id].push({
      group_id: r.group_id,
      option_id: r.option_id,
      option_name: r.option?.name ?? null,
      qty: Number(r.qty ?? 1),
      price_delta: Number(r.price_delta ?? 0),
    });
  }

  return { data: byOrderItemId, error: null };
}

export async function getOrderReceipt(orderId: string) {
  const orderRes = await supabase
    .from("orders")
    .select(
      "id, ticket_no, restaurant_id, status, created_at, discount_amount, discount_reason, subtotal, tax, total, order_type, customer_name, customer_phone, delivery_address1, delivery_address2, delivery_city, delivery_state, delivery_postal_code, delivery_instructions, delivery_status, delivery_provider, delivery_tracking_url, payment_method, paid_at, amount_tendered, change_due",
    )
    .eq("id", orderId)
    .maybeSingle<{
      id: string;
      ticket_no: number | null;
      restaurant_id: string;
      status: string;
      created_at: string;
      discount_amount?: number;
      discount_reason?: string | null;
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

  const [itemsRes, restaurantRes, modsRes] = await Promise.all([
    getOrderItems(orderId),
    supabase
      .from("restaurants")
      .select("name")
      .eq("id", orderRes.data.restaurant_id)
      .maybeSingle<{ name: string }>(),
    getOrderItemModifiers(orderId),
  ]);

  if (itemsRes.error) return { data: null, error: itemsRes.error };
  if (restaurantRes.error) return { data: null, error: restaurantRes.error };
  if (modsRes.error) return { data: null, error: modsRes.error };

  const modsByOrderItemId = modsRes.data ?? {};
  const itemsWithMods = (itemsRes.data ?? []).map((it) => ({
    ...it,
    modifiers: modsByOrderItemId[it.id] ?? [],
  }));

  return {
    data: {
      restaurant_name: restaurantRes.data?.name ?? null,
      order: orderRes.data,
      items: itemsWithMods,
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
      discount_amount: Number(input.discount_amount ?? 0),
      discount_reason: input.discount_reason ?? null,
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
    const itemsIns = await supabase.from("order_items").insert(
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

    if (itemsIns.error) return { data: null, error: itemsIns.error };

    const itemsRes = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true })
      .returns<Array<{ id: string }>>();

    if (itemsRes.error) return { data: null, error: itemsRes.error };

    const inserted = itemsRes.data ?? [];
    const modifierRows: Array<{
      restaurant_id: string;
      order_item_id: string;
      group_id: string;
      option_id: string;
      qty: number;
      price_delta: number;
    }> = [];

    for (let i = 0; i < input.items.length; i += 1) {
      const it = input.items[i];
      const orderItemId = inserted[i]?.id;
      if (!orderItemId) continue;
      const mods = it.modifiers ?? [];
      if (mods.length === 0) continue;
      for (const m of mods) {
        modifierRows.push({
          restaurant_id: input.restaurant_id,
          order_item_id: orderItemId,
          group_id: m.group_id,
          option_id: m.option_id,
          qty: Number(m.qty ?? 1),
          price_delta: Number(m.price_delta ?? 0),
        });
      }
    }

    if (modifierRows.length > 0) {
      const modsRes = await supabase.from("order_item_modifiers").insert(modifierRows);
      if (modsRes.error) return { data: null, error: modsRes.error };
    }
  }

  return { data: { orderId, ticketNo: updated.data?.ticket_no ?? null }, error: null };
}

export async function deleteOrders(orderIds: string[]) {
  const ids = (orderIds ?? []).filter(Boolean);
  if (ids.length === 0) return { data: { deleted: 0 }, error: null as Error | null };

  const delItems = await supabase.from("order_items").delete().in("order_id", ids);
  if (delItems.error) return { data: null as { deleted: number } | null, error: delItems.error };

  const delOrders = await supabase.from("orders").delete().in("id", ids).select("id");
  if (delOrders.error) return { data: null as { deleted: number } | null, error: delOrders.error };

  return { data: { deleted: delOrders.data?.length ?? 0 }, error: null as Error | null };
}
