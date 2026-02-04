import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "owner" | "manager" | "cashier" | "kitchen" | "maintenance" | "driver" | "security" | null;

type DeleteBody =
  | { kind?: "table"; id?: string }
  | { kind?: "object"; id?: string }
  | { kind?: "area"; id?: string }
  | null;

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

async function requireRestaurantOwnerOrManager(userId: string, userRole: Role, restaurantId: string) {
  if (userRole === "cashier" || userRole === "kitchen" || userRole === "maintenance" || userRole === "driver" || userRole === "security") {
    return { ok: false, error: new Error("Cashiers cannot edit the floor plan") };
  }

  if (userRole === "manager") {
    const u = await supabaseAdmin.auth.admin.getUserById(userId);
    if (u.error) return { ok: false, error: new Error(u.error.message) };
    const meta = (u.data.user?.app_metadata ?? {}) as Record<string, unknown>;
    const assigned = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
    if (!assigned || assigned !== restaurantId) {
      return { ok: false, error: new Error("Managers can only edit the floor plan for their assigned restaurant") };
    }
    return { ok: true, error: null as Error | null };
  }

  const restaurantRes = await supabaseAdmin
    .from("restaurants")
    .select("id, owner_user_id")
    .eq("id", restaurantId)
    .maybeSingle<{ id: string; owner_user_id: string }>();

  if (restaurantRes.error) return { ok: false, error: restaurantRes.error };
  if (!restaurantRes.data) return { ok: false, error: new Error("Restaurant not found") };

  if (restaurantRes.data.owner_user_id !== userId) {
    return { ok: false, error: new Error("Only the restaurant owner or manager can edit the floor plan") };
  }

  return { ok: true, error: null as Error | null };
}

export async function DELETE(req: Request) {
  const { user, error } = await requireRequester(req);
  if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

  const requesterRoleRaw = (user.app_metadata as { role?: string } | undefined)?.role ?? null;
  const requesterRole: Role =
    requesterRoleRaw === "owner" ||
    requesterRoleRaw === "manager" ||
    requesterRoleRaw === "cashier" ||
    requesterRoleRaw === "kitchen" ||
    requesterRoleRaw === "maintenance" ||
    requesterRoleRaw === "driver" ||
    requesterRoleRaw === "security"
      ? requesterRoleRaw
      : null;

  const active = await getActiveRestaurantId(user.id);
  if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
  if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

  const perm = await requireRestaurantOwnerOrManager(user.id, requesterRole, active.restaurantId);
  if (!perm.ok) return NextResponse.json({ error: perm.error?.message ?? "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as DeleteBody;
  const kind = body?.kind ?? null;
  const id = body?.id?.trim() ?? null;

  if (!kind) return NextResponse.json({ error: "Missing kind" }, { status: 400 });
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (kind === "table") {
    const row = await supabaseAdmin
      .from("floor_tables")
      .select("id, restaurant_id")
      .eq("id", id)
      .maybeSingle<{ id: string; restaurant_id: string }>();
    if (row.error) return NextResponse.json({ error: row.error.message }, { status: 400 });
    if (!row.data) return NextResponse.json({ error: "Table not found" }, { status: 404 });
    if (row.data.restaurant_id !== active.restaurantId) {
      return NextResponse.json({ error: "Table does not belong to the active restaurant" }, { status: 403 });
    }

    const del = await supabaseAdmin.from("floor_tables").delete().eq("id", id);
    if (del.error) return NextResponse.json({ error: del.error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (kind === "object") {
    const row = await supabaseAdmin
      .from("floor_objects")
      .select("id, restaurant_id")
      .eq("id", id)
      .maybeSingle<{ id: string; restaurant_id: string }>();
    if (row.error) return NextResponse.json({ error: row.error.message }, { status: 400 });
    if (!row.data) return NextResponse.json({ error: "Object not found" }, { status: 404 });
    if (row.data.restaurant_id !== active.restaurantId) {
      return NextResponse.json({ error: "Object does not belong to the active restaurant" }, { status: 403 });
    }

    const del = await supabaseAdmin.from("floor_objects").delete().eq("id", id);
    if (del.error) return NextResponse.json({ error: del.error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const row = await supabaseAdmin
    .from("floor_areas")
    .select("id, restaurant_id")
    .eq("id", id)
    .maybeSingle<{ id: string; restaurant_id: string }>();
  if (row.error) return NextResponse.json({ error: row.error.message }, { status: 400 });
  if (!row.data) return NextResponse.json({ error: "Area not found" }, { status: 404 });
  if (row.data.restaurant_id !== active.restaurantId) {
    return NextResponse.json({ error: "Area does not belong to the active restaurant" }, { status: 403 });
  }

  const del = await supabaseAdmin.from("floor_areas").delete().eq("id", id);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
