import { NextResponse, type NextRequest } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

type TokenRow = {
  restaurant_id: string;
  is_active: boolean;
};

type OrdersResponse = {
  restaurantId: string;
  restaurantName: string | null;
  orders: KDSOrder[];
};

type UpdateBody = {
  orderId?: string;
  action?: "bump" | "recall";
};

async function requireActiveToken(token: string) {
  const res = await supabaseAdmin
    .from("kds_tokens")
    .select("restaurant_id, is_active")
    .eq("token", token)
    .maybeSingle<TokenRow>();

  if (res.error) return { restaurantId: null as string | null, error: res.error };
  if (!res.data) return { restaurantId: null as string | null, error: new Error("Invalid or expired KDS link") };
  if (!res.data.is_active) return { restaurantId: null as string | null, error: new Error("This KDS link has been deactivated") };

  return { restaurantId: res.data.restaurant_id, error: null as Error | null };
}

async function listOrdersForRestaurant(restaurantId: string): Promise<{ data: KDSOrder[]; error: Error | null }> {
  const ordersRes = await supabaseAdmin
    .from("orders")
    .select("id, ticket_no, status, total, created_at, order_type, customer_name")
    .eq("restaurant_id", restaurantId)
    .in("status", ["open", "preparing", "ready"])
    .order("created_at", { ascending: true })
    .returns<Array<Omit<KDSOrder, "items">>>();

  if (ordersRes.error) return { data: [], error: ordersRes.error };

  const ordersData = ordersRes.data ?? [];

  const itemsRes = await supabaseAdmin
    .from("order_items")
    .select("id, order_id, name, qty")
    .in(
      "order_id",
      ordersData.map((o) => o.id),
    )
    .returns<Array<{ id: string; order_id: string; name: string; qty: number }>>();

  if (itemsRes.error) return { data: [], error: itemsRes.error };

  const byOrder: Record<string, OrderItem[]> = {};
  for (const it of itemsRes.data ?? []) {
    const arr = byOrder[it.order_id] ?? [];
    arr.push({ id: it.id, name: it.name, qty: it.qty });
    byOrder[it.order_id] = arr;
  }

  const withItems: KDSOrder[] = ordersData.map((o) => ({
    ...o,
    items: byOrder[o.id] ?? [],
  }));

  return { data: withItems, error: null };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;

    const tok = await requireActiveToken(token);
    if (tok.error || !tok.restaurantId) {
      return NextResponse.json({ error: tok.error?.message ?? "Invalid KDS token" }, { status: 401 });
    }

    const restaurantRes = await supabaseAdmin
      .from("restaurants")
      .select("name")
      .eq("id", tok.restaurantId)
      .maybeSingle<{ name: string }>();

    if (restaurantRes.error) {
      return NextResponse.json({ error: restaurantRes.error.message }, { status: 400 });
    }

    const orders = await listOrdersForRestaurant(tok.restaurantId);
    if (orders.error) {
      return NextResponse.json({ error: orders.error.message }, { status: 400 });
    }

    const payload: OrdersResponse = {
      restaurantId: tok.restaurantId,
      restaurantName: restaurantRes.data?.name ?? null,
      orders: orders.data,
    };

    return NextResponse.json(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load KDS";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;

    const tok = await requireActiveToken(token);
    if (tok.error || !tok.restaurantId) {
      return NextResponse.json({ error: tok.error?.message ?? "Invalid KDS token" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as UpdateBody | null;
    const orderId = body?.orderId?.trim() ?? "";
    const action = body?.action ?? null;

    if (!orderId || (action !== "bump" && action !== "recall")) {
      return NextResponse.json({ error: "Missing orderId or action" }, { status: 400 });
    }

    const orderRes = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("restaurant_id", tok.restaurantId)
      .maybeSingle<{ id: string; status: string }>();

    if (orderRes.error) return NextResponse.json({ error: orderRes.error.message }, { status: 400 });
    if (!orderRes.data) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const currentStatus = orderRes.data.status;

    let nextStatus: string | null = null;
    if (action === "bump") {
      if (currentStatus === "open") nextStatus = "preparing";
      else if (currentStatus === "preparing") nextStatus = "ready";
      else if (currentStatus === "ready") nextStatus = "paid";
    } else {
      if (currentStatus === "ready") nextStatus = "preparing";
      else if (currentStatus === "preparing") nextStatus = "open";
    }

    if (!nextStatus) {
      return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
    }

    const upd = await supabaseAdmin
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", orderId)
      .eq("restaurant_id", tok.restaurantId)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 400 });

    const orders = await listOrdersForRestaurant(tok.restaurantId);
    if (orders.error) return NextResponse.json({ error: orders.error.message }, { status: 400 });

    return NextResponse.json({ ok: true, orders: orders.data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
