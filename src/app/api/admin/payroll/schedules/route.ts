import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "owner" | "manager" | "cashier" | null;

type CreateShiftBody = {
  staffUserId?: string;
  staffPin?: string | null;
  staffLabel?: string | null;
  startsAt?: string;
  endsAt?: string;
  breakMinutes?: number;
} | null;

type DeleteShiftBody = { id?: string } | null;

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
  if (userRole === "cashier") {
    return { ok: false, error: new Error("Cashiers cannot manage payroll") };
  }

  if (userRole === "manager") {
    const u = await supabaseAdmin.auth.admin.getUserById(userId);
    if (u.error) return { ok: false, error: new Error(u.error.message) };
    const meta = (u.data.user?.app_metadata ?? {}) as Record<string, unknown>;
    const assigned = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
    if (!assigned || assigned !== restaurantId) {
      return { ok: false, error: new Error("Managers can only manage payroll for their assigned restaurant") };
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
    return { ok: false, error: new Error("Only the restaurant owner or manager can manage payroll") };
  }

  return { ok: true, error: null as Error | null };
}

function parseIsoParam(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.valueOf())) return null;
  return d.toISOString();
}

export async function GET(req: Request) {
  try {
    const { user, error } = await requireRequester(req);
    if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

    const requesterRoleRaw = (user.app_metadata as { role?: string } | undefined)?.role ?? null;
    const requesterRole: Role =
      requesterRoleRaw === "owner" || requesterRoleRaw === "manager" || requesterRoleRaw === "cashier" ? requesterRoleRaw : null;

    const userMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
    const active = await resolveRestaurantId(user.id, requesterRole, userMeta);
    if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
    if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

    const perm = await requireRestaurantOwnerOrManager(user.id, requesterRole, active.restaurantId);
    if (!perm.ok) return NextResponse.json({ error: perm.error?.message ?? "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const start = parseIsoParam(url.searchParams.get("start"));
    const end = parseIsoParam(url.searchParams.get("end"));

    let query = supabaseAdmin
      .from("payroll_schedule_shifts")
      .select("id, restaurant_id, staff_user_id, staff_pin, staff_label, starts_at, ends_at, break_minutes, created_at")
      .eq("restaurant_id", active.restaurantId)
      .order("starts_at", { ascending: true })
      .limit(5000);

    if (start) query = query.gte("starts_at", start);
    if (end) query = query.lt("starts_at", end);

    const res = await query;
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 400 });

    return NextResponse.json({ restaurantId: active.restaurantId, shifts: res.data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load schedules";
    console.error("[admin/payroll/schedules] GET error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, error } = await requireRequester(req);
    if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

    const requesterRoleRaw = (user.app_metadata as { role?: string } | undefined)?.role ?? null;
    const requesterRole: Role =
      requesterRoleRaw === "owner" || requesterRoleRaw === "manager" || requesterRoleRaw === "cashier" ? requesterRoleRaw : null;

    const userMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
    const active = await resolveRestaurantId(user.id, requesterRole, userMeta);
    if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
    if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

    const perm = await requireRestaurantOwnerOrManager(user.id, requesterRole, active.restaurantId);
    if (!perm.ok) return NextResponse.json({ error: perm.error?.message ?? "Forbidden" }, { status: 403 });

    const body = (await req.json().catch(() => null)) as CreateShiftBody;

    const staffUserId = typeof body?.staffUserId === "string" ? body.staffUserId.trim() : "";
    const startsAt = typeof body?.startsAt === "string" ? body.startsAt.trim() : "";
    const endsAt = typeof body?.endsAt === "string" ? body.endsAt.trim() : "";

    if (!staffUserId) return NextResponse.json({ error: "Missing staffUserId" }, { status: 400 });
    if (!startsAt || Number.isNaN(new Date(startsAt).valueOf())) return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
    if (!endsAt || Number.isNaN(new Date(endsAt).valueOf())) return NextResponse.json({ error: "Invalid endsAt" }, { status: 400 });
    if (new Date(endsAt) <= new Date(startsAt)) return NextResponse.json({ error: "endsAt must be after startsAt" }, { status: 400 });

    const breakMinutes = typeof body?.breakMinutes === "number" && Number.isFinite(body.breakMinutes) ? Math.floor(body.breakMinutes) : 0;
    if (breakMinutes < 0 || breakMinutes > 480) return NextResponse.json({ error: "Invalid breakMinutes" }, { status: 400 });

    const staffPin = typeof body?.staffPin === "string" ? body.staffPin.trim() : null;
    const staffLabel = typeof body?.staffLabel === "string" ? body.staffLabel.trim() : null;

    const target = await supabaseAdmin.auth.admin.getUserById(staffUserId);
    if (target.error) return NextResponse.json({ error: target.error.message }, { status: 400 });

    const meta = (target.data.user?.app_metadata ?? {}) as Record<string, unknown>;
    const rid = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
    if (rid !== active.restaurantId) {
      return NextResponse.json({ error: "User is not assigned to the active restaurant" }, { status: 400 });
    }

    const inserted = await supabaseAdmin
      .from("payroll_schedule_shifts")
      .insert({
        restaurant_id: active.restaurantId,
        staff_user_id: staffUserId,
        staff_pin: staffPin,
        staff_label: staffLabel,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        break_minutes: breakMinutes,
        created_by_user_id: user.id,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 400 });

    return NextResponse.json({ ok: true, id: inserted.data?.id ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create shift";
    console.error("[admin/payroll/schedules] POST error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { user, error } = await requireRequester(req);
    if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

    const requesterRoleRaw = (user.app_metadata as { role?: string } | undefined)?.role ?? null;
    const requesterRole: Role =
      requesterRoleRaw === "owner" || requesterRoleRaw === "manager" || requesterRoleRaw === "cashier" ? requesterRoleRaw : null;

    const userMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
    const active = await resolveRestaurantId(user.id, requesterRole, userMeta);
    if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
    if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

    const perm = await requireRestaurantOwnerOrManager(user.id, requesterRole, active.restaurantId);
    if (!perm.ok) return NextResponse.json({ error: perm.error?.message ?? "Forbidden" }, { status: 403 });

    const body = (await req.json().catch(() => null)) as DeleteShiftBody;
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const deleted = await supabaseAdmin
      .from("payroll_schedule_shifts")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", active.restaurantId)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (deleted.error) return NextResponse.json({ error: deleted.error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete shift";
    console.error("[admin/payroll/schedules] DELETE error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
