import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "owner" | "manager" | "cashier" | "kitchen" | "maintenance" | "driver" | "security" | null;

type CreateBody = {
  name?: string;
  email?: string;
  phone?: string;
  birthday?: string;
  notes?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
} | null;

type UpdateBody = CreateBody & { id?: string };

type DeleteBody = { id?: string } | null;

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

async function resolveRestaurantId(userId: string, role: Role, userAppMeta: Record<string, unknown>) {
  if (role === "manager") {
    const fromMeta = typeof userAppMeta.restaurant_id === "string" ? userAppMeta.restaurant_id : null;
    if (fromMeta) return { restaurantId: fromMeta, error: null as Error | null };

    const u = await supabaseAdmin.auth.admin.getUserById(userId);
    if (u.error) return { restaurantId: null as string | null, error: new Error(u.error.message) };
    const meta = (u.data.user?.app_metadata ?? {}) as Record<string, unknown>;
    const assigned = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
    if (!assigned) return { restaurantId: null as string | null, error: new Error("Manager has no assigned restaurant") };
    return { restaurantId: assigned, error: null as Error | null };
  }

  return getActiveRestaurantId(userId);
}

async function requireRestaurantOwnerOrManager(userId: string, userRole: Role, restaurantId: string) {
  if (userRole === "cashier" || userRole === "kitchen" || userRole === "maintenance" || userRole === "driver" || userRole === "security") {
    return { ok: false, error: new Error("Access denied") };
  }

  if (userRole === "manager") {
    const u = await supabaseAdmin.auth.admin.getUserById(userId);
    if (u.error) return { ok: false, error: new Error(u.error.message) };
    const meta = (u.data.user?.app_metadata ?? {}) as Record<string, unknown>;
    const assigned = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
    if (!assigned || assigned !== restaurantId) {
      return { ok: false, error: new Error("Managers can only access their assigned restaurant") };
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
  if (restaurantRes.data.owner_user_id !== userId) return { ok: false, error: new Error("Only owner or manager can access customers") };
  return { ok: true, error: null as Error | null };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function GET(req: Request) {
  try {
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

    const userMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
    const active = await resolveRestaurantId(user.id, requesterRole, userMeta);
    if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
    if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

    const perm = await requireRestaurantOwnerOrManager(user.id, requesterRole, active.restaurantId);
    if (!perm.ok) return NextResponse.json({ error: perm.error?.message ?? "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() ?? "";

    let q = supabaseAdmin
      .from("customers")
      .select("id, name, email, phone, birthday, notes, address_line1, address_line2, city, state, postal_code, created_at, updated_at")
      .eq("restaurant_id", active.restaurantId)
      .order("created_at", { ascending: false })
      .limit(300);

    if (query) {
      const like = `%${query}%`;
      q = q.or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
    }

    const res = await q;
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 400 });
    return NextResponse.json({ restaurantId: active.restaurantId, customers: res.data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load customers";
    console.error("[admin/customers] GET error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, error } = await requireRequester(req);
    if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

    const requesterRoleRaw = (user.app_metadata as { role?: string } | undefined)?.role ?? null;
    const requesterRole: Role =
      requesterRoleRaw === "owner" || requesterRoleRaw === "manager" ? requesterRoleRaw : null;

    const userMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
    const active = await resolveRestaurantId(user.id, requesterRole, userMeta);
    if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
    if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

    const perm = await requireRestaurantOwnerOrManager(user.id, requesterRole, active.restaurantId);
    if (!perm.ok) return NextResponse.json({ error: perm.error?.message ?? "Forbidden" }, { status: 403 });

    const body = (await req.json().catch(() => null)) as CreateBody;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!phone) return NextResponse.json({ error: "Phone is required" }, { status: 400 });

    const inserted = await supabaseAdmin
      .from("customers")
      .insert({
        restaurant_id: active.restaurantId,
        name,
        email,
        phone,
        birthday: body?.birthday ?? null,
        notes: body?.notes ?? null,
        address_line1: body?.addressLine1 ?? null,
        address_line2: body?.addressLine2 ?? null,
        city: body?.city ?? null,
        state: body?.state ?? null,
        postal_code: body?.postalCode ?? null,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: inserted.data?.id ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create customer";
    console.error("[admin/customers] POST error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { user, error } = await requireRequester(req);
    if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

    const requesterRoleRaw = (user.app_metadata as { role?: string } | undefined)?.role ?? null;
    const requesterRole: Role =
      requesterRoleRaw === "owner" || requesterRoleRaw === "manager" ? requesterRoleRaw : null;

    const userMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
    const active = await resolveRestaurantId(user.id, requesterRole, userMeta);
    if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
    if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

    const perm = await requireRestaurantOwnerOrManager(user.id, requesterRole, active.restaurantId);
    if (!perm.ok) return NextResponse.json({ error: perm.error?.message ?? "Forbidden" }, { status: 403 });

    const body = (await req.json().catch(() => null)) as UpdateBody;
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body?.name === "string") patch.name = body.name.trim();
    if (typeof body?.email === "string") patch.email = normalizeEmail(body.email);
    if (typeof body?.phone === "string") patch.phone = body.phone.trim();
    if (typeof body?.birthday === "string") patch.birthday = body.birthday;
    if (typeof body?.notes === "string") patch.notes = body.notes;
    if (typeof body?.addressLine1 === "string") patch.address_line1 = body.addressLine1;
    if (typeof body?.addressLine2 === "string") patch.address_line2 = body.addressLine2;
    if (typeof body?.city === "string") patch.city = body.city;
    if (typeof body?.state === "string") patch.state = body.state;
    if (typeof body?.postalCode === "string") patch.postal_code = body.postalCode;

    const updated = await supabaseAdmin
      .from("customers")
      .update(patch)
      .eq("id", id)
      .eq("restaurant_id", active.restaurantId)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: updated.data?.id ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update customer";
    console.error("[admin/customers] PATCH error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { user, error } = await requireRequester(req);
    if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

    const requesterRoleRaw = (user.app_metadata as { role?: string } | undefined)?.role ?? null;
    const requesterRole: Role =
      requesterRoleRaw === "owner" || requesterRoleRaw === "manager" ? requesterRoleRaw : null;

    const userMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
    const active = await resolveRestaurantId(user.id, requesterRole, userMeta);
    if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
    if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

    const perm = await requireRestaurantOwnerOrManager(user.id, requesterRole, active.restaurantId);
    if (!perm.ok) return NextResponse.json({ error: perm.error?.message ?? "Forbidden" }, { status: 403 });

    const body = (await req.json().catch(() => null)) as DeleteBody;
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const del = await supabaseAdmin.from("customers").delete().eq("id", id).eq("restaurant_id", active.restaurantId);
    if (del.error) return NextResponse.json({ error: del.error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete customer";
    console.error("[admin/customers] DELETE error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
