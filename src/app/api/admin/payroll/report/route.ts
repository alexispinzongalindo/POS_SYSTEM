import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "owner" | "manager" | "cashier" | null;

type DifferentialRow = {
  staffUserId: string | null;
  staffPin: string | null;
  staffLabel: string | null;
  scheduledMinutes: number;
  actualMinutes: number;
  varianceMinutes: number;
};

type ShiftRow = {
  staff_user_id: string;
  staff_pin: string | null;
  staff_label: string | null;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
};

type TimeClockRow = {
  staff_user_id: string | null;
  staff_pin: string | null;
  staff_label: string | null;
  action: "clock_in" | "break_out" | "break_in" | "clock_out";
  at: string;
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
    return { ok: false, error: new Error("Cashiers cannot view payroll reports") };
  }

  if (userRole === "manager") {
    const u = await supabaseAdmin.auth.admin.getUserById(userId);
    if (u.error) return { ok: false, error: new Error(u.error.message) };
    const meta = (u.data.user?.app_metadata ?? {}) as Record<string, unknown>;
    const assigned = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
    if (!assigned || assigned !== restaurantId) {
      return { ok: false, error: new Error("Managers can only view payroll reports for their assigned restaurant") };
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
    return { ok: false, error: new Error("Only the restaurant owner or manager can view payroll reports") };
  }

  return { ok: true, error: null as Error | null };
}

function parseIsoParam(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.valueOf())) return null;
  return d.toISOString();
}

function diffMinutes(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

function computeActualMinutes(entries: TimeClockRow[], startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const sorted = [...entries].sort((x, y) => x.at.localeCompare(y.at));

  let clockIn: Date | null = null;
  let breakOut: Date | null = null;
  let workMinutes = 0;

  for (const e of sorted) {
    const at = new Date(e.at);
    if (Number.isNaN(at.valueOf())) continue;
    if (at < start || at >= end) continue;

    if (e.action === "clock_in") {
      clockIn = at;
      breakOut = null;
      continue;
    }

    if (e.action === "break_out") {
      if (clockIn) breakOut = at;
      continue;
    }

    if (e.action === "break_in") {
      if (clockIn && breakOut) {
        workMinutes += diffMinutes(clockIn, breakOut);
        clockIn = at;
        breakOut = null;
      }
      continue;
    }

    if (e.action === "clock_out") {
      if (clockIn) {
        const endAt = breakOut ?? at;
        workMinutes += diffMinutes(clockIn, endAt);
      }
      clockIn = null;
      breakOut = null;
      continue;
    }
  }

  if (clockIn) {
    const endAt = breakOut ?? end;
    workMinutes += diffMinutes(clockIn, endAt);
  }

  return workMinutes;
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
    if (!start || !end) return NextResponse.json({ error: "Missing start/end" }, { status: 400 });

    const shiftsRes = await supabaseAdmin
      .from("payroll_schedule_shifts")
      .select("staff_user_id, staff_pin, staff_label, starts_at, ends_at, break_minutes")
      .eq("restaurant_id", active.restaurantId)
      .gte("starts_at", start)
      .lt("starts_at", end)
      .limit(5000);

    if (shiftsRes.error) return NextResponse.json({ error: shiftsRes.error.message }, { status: 400 });

    const timeRes = await supabaseAdmin
      .from("time_clock_entries")
      .select("staff_user_id, staff_pin, staff_label, action, at")
      .eq("restaurant_id", active.restaurantId)
      .gte("at", start)
      .lt("at", end)
      .limit(20000);

    if (timeRes.error) return NextResponse.json({ error: timeRes.error.message }, { status: 400 });

    const shifts = (shiftsRes.data ?? []) as ShiftRow[];
    const punches = (timeRes.data ?? []) as TimeClockRow[];

    const keyFor = (userId: string | null, pin: string | null) => `${userId ?? ""}::${pin ?? ""}`;

    const staffMeta = new Map<string, { staffUserId: string | null; staffPin: string | null; staffLabel: string | null }>();

    const scheduled = new Map<string, number>();
    for (const s of shifts) {
      const startAt = new Date(s.starts_at);
      const endAt = new Date(s.ends_at);
      if (Number.isNaN(startAt.valueOf()) || Number.isNaN(endAt.valueOf())) continue;
      const minutes = Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60000) - (s.break_minutes ?? 0));
      const k = keyFor(s.staff_user_id ?? null, s.staff_pin ?? null);
      scheduled.set(k, (scheduled.get(k) ?? 0) + minutes);
      staffMeta.set(k, { staffUserId: s.staff_user_id ?? null, staffPin: s.staff_pin ?? null, staffLabel: s.staff_label ?? null });
    }

    const byStaff = new Map<string, TimeClockRow[]>();
    for (const p of punches) {
      const k = keyFor(p.staff_user_id ?? null, p.staff_pin ?? null);
      if (!byStaff.has(k)) byStaff.set(k, []);
      byStaff.get(k)!.push(p);
      if (!staffMeta.has(k)) {
        staffMeta.set(k, { staffUserId: p.staff_user_id ?? null, staffPin: p.staff_pin ?? null, staffLabel: p.staff_label ?? null });
      }
    }

    const keys = new Set<string>([...scheduled.keys(), ...byStaff.keys()]);

    const rows: DifferentialRow[] = [];
    for (const k of keys) {
      const meta = staffMeta.get(k) ?? { staffUserId: null, staffPin: null, staffLabel: null };
      const scheduledMinutes = scheduled.get(k) ?? 0;
      const entries = byStaff.get(k) ?? [];
      const actualMinutes = computeActualMinutes(entries, start, end);
      rows.push({
        staffUserId: meta.staffUserId,
        staffPin: meta.staffPin,
        staffLabel: meta.staffLabel,
        scheduledMinutes,
        actualMinutes,
        varianceMinutes: actualMinutes - scheduledMinutes,
      });
    }

    rows.sort((a, b) => {
      const an = (a.staffLabel ?? a.staffPin ?? "").toLowerCase();
      const bn = (b.staffLabel ?? b.staffPin ?? "").toLowerCase();
      return an.localeCompare(bn);
    });

    return NextResponse.json({ rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load report";
    console.error("[admin/payroll/report] GET error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
