import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type DeleteOrdersBody = {
  orderIds?: string[];
};

async function requireRequester(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { user: null as null, error: new Error("Missing Authorization token") };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { user: null as null, error: new Error(error?.message ?? "Unauthorized") };

  return { user: data.user, error: null as Error | null };
}

async function getActiveRestaurantId(userId: string) {
  const cfgRes = await supabaseAdmin
    .from("app_config")
    .select("restaurant_id")
    .eq("owner_user_id", userId)
    .maybeSingle<{ restaurant_id: string | null }>();

  if (cfgRes.error) return { restaurantId: null as string | null, error: cfgRes.error };
  return { restaurantId: cfgRes.data?.restaurant_id ?? null, error: null as Error | null };
}

async function requireRestaurantOwnerOrManager(userId: string, userRole: string | null, restaurantId: string) {
  if (userRole === "cashier") {
    return { ok: false, error: new Error("Cashiers cannot delete transactions") };
  }

  // Managers are allowed (they belong to the restaurant), owners are allowed if they own it.
  if (userRole === "manager") {
    const u = await supabaseAdmin.auth.admin.getUserById(userId);
    if (u.error) return { ok: false, error: new Error(u.error.message) };
    const meta = (u.data.user?.app_metadata ?? {}) as Record<string, unknown>;
    const assigned = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
    if (!assigned || assigned !== restaurantId) {
      return { ok: false, error: new Error("Managers can only delete transactions for their assigned restaurant") };
    }
    return { ok: true, error: null as Error | null };
  }

  // Default/unknown role: treat as owner only if restaurant owner matches.
  const restaurantRes = await supabaseAdmin
    .from("restaurants")
    .select("id, owner_user_id")
    .eq("id", restaurantId)
    .maybeSingle<{ id: string; owner_user_id: string }>();

  if (restaurantRes.error) return { ok: false, error: restaurantRes.error };
  if (!restaurantRes.data) return { ok: false, error: new Error("Restaurant not found") };

  if (restaurantRes.data.owner_user_id !== userId) {
    return { ok: false, error: new Error("Only the restaurant owner or manager can delete transactions") };
  }

  return { ok: true, error: null as Error | null };
}

export async function DELETE(req: Request) {
  try {
    const { user, error } = await requireRequester(req);
    if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

    const requesterRole = (user.app_metadata as { role?: string } | undefined)?.role ?? null;

    const active = await getActiveRestaurantId(user.id);
    if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
    if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

    const perm = await requireRestaurantOwnerOrManager(user.id, requesterRole, active.restaurantId);
    if (!perm.ok) return NextResponse.json({ error: perm.error?.message ?? "Forbidden" }, { status: 403 });

    const body = (await req.json().catch(() => null)) as DeleteOrdersBody | null;
    const ids = (body?.orderIds ?? []).map((s) => s.trim()).filter(Boolean);

    if (ids.length === 0) return NextResponse.json({ error: "No orderIds provided" }, { status: 400 });

    // Ensure all orders belong to active restaurant.
    const owned = await supabaseAdmin
      .from("orders")
      .select("id")
      .in("id", ids)
      .eq("restaurant_id", active.restaurantId)
      .returns<Array<{ id: string }>>();

    if (owned.error) return NextResponse.json({ error: owned.error.message }, { status: 400 });

    const ownedIds = (owned.data ?? []).map((r) => r.id);
    if (ownedIds.length === 0) return NextResponse.json({ deleted: 0 });

    // Delete items first (safe regardless of FK cascade settings)
    const delItems = await supabaseAdmin.from("order_items").delete().in("order_id", ownedIds);
    if (delItems.error) return NextResponse.json({ error: delItems.error.message }, { status: 400 });

    const delOrders = await supabaseAdmin.from("orders").delete().in("id", ownedIds).select("id");
    if (delOrders.error) return NextResponse.json({ error: delOrders.error.message }, { status: 400 });

    return NextResponse.json({ deleted: delOrders.data?.length ?? 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    console.error("[admin/orders] Unexpected error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
