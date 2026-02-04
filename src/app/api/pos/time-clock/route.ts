import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "owner" | "manager" | "cashier" | null;

type Body = {
  restaurantId?: string;
  staffUserId?: string | null;
  staffPin?: string | null;
  staffLabel?: string | null;
  action?: "clock_in" | "break_out" | "break_in" | "clock_out";
  at?: string;
} | null;

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
  if (role === "cashier" || role === "manager") {
    const fromMeta = typeof userAppMeta.restaurant_id === "string" ? userAppMeta.restaurant_id : null;
    if (fromMeta) return { restaurantId: fromMeta, error: null as Error | null };

    const u = await supabaseAdmin.auth.admin.getUserById(userId);
    if (u.error) return { restaurantId: null as string | null, error: new Error(u.error.message) };
    const meta = (u.data.user?.app_metadata ?? {}) as Record<string, unknown>;
    const assigned = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
    if (!assigned) return { restaurantId: null as string | null, error: new Error("No restaurant assigned") };
    return { restaurantId: assigned, error: null as Error | null };
  }

  return getActiveRestaurantId(userId);
}

export async function POST(req: Request) {
  try {
    const { user, error } = await requireRequester(req);
    if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

    const roleRaw = (user.app_metadata as { role?: string } | undefined)?.role ?? null;
    const role: Role = roleRaw === "owner" || roleRaw === "manager" || roleRaw === "cashier" ? roleRaw : null;

    const body = (await req.json().catch(() => null)) as Body;
    const action = body?.action;
    const at = typeof body?.at === "string" ? body.at.trim() : "";

    if (action !== "clock_in" && action !== "break_out" && action !== "break_in" && action !== "clock_out") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    if (!at || Number.isNaN(new Date(at).valueOf())) return NextResponse.json({ error: "Invalid at" }, { status: 400 });

    const userMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
    const active = await resolveRestaurantId(user.id, role, userMeta);
    if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
    if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

    const requestedRestaurantId = typeof body?.restaurantId === "string" ? body.restaurantId.trim() : "";
    if (requestedRestaurantId && requestedRestaurantId !== active.restaurantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const staffUserId = typeof body?.staffUserId === "string" ? body.staffUserId.trim() : null;
    const staffPin = typeof body?.staffPin === "string" ? body.staffPin.trim() : null;
    const staffLabel = typeof body?.staffLabel === "string" ? body.staffLabel.trim() : null;

    if (staffUserId) {
      const staffUser = await supabaseAdmin.auth.admin.getUserById(staffUserId);
      if (staffUser.error) return NextResponse.json({ error: staffUser.error.message }, { status: 400 });
      const staffMeta = (staffUser.data.user?.app_metadata ?? {}) as Record<string, unknown>;
      const staffRid = typeof staffMeta.restaurant_id === "string" ? staffMeta.restaurant_id : null;
      if (!staffRid || staffRid !== active.restaurantId) {
        return NextResponse.json({ error: "Staff user is not assigned to the active restaurant" }, { status: 400 });
      }
    }

    const inserted = await supabaseAdmin
      .from("time_clock_entries")
      .insert({
        restaurant_id: active.restaurantId,
        staff_user_id: staffUserId,
        staff_pin: staffPin,
        staff_label: staffLabel,
        action,
        at: new Date(at).toISOString(),
        recorded_by_user_id: user.id,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 400 });

    return NextResponse.json({ ok: true, id: inserted.data?.id ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save time clock";
    console.error("[pos/time-clock] POST error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
