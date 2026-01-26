import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StaffRole = "manager" | "cashier";

type StaffRow = {
  id: string;
  email: string | null;
  role: StaffRole;
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
    return { ok: false, error: new Error("Cashiers cannot manage staff") };
  }

  // Managers are allowed (they belong to the restaurant), owners are allowed if they own it.
  if (userRole === "manager") {
    const u = await supabaseAdmin.auth.admin.getUserById(userId);
    if (u.error) return { ok: false, error: new Error(u.error.message) };
    const meta = (u.data.user?.app_metadata ?? {}) as Record<string, unknown>;
    const assigned = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
    if (!assigned || assigned !== restaurantId) {
      return { ok: false, error: new Error("Managers can only manage staff for their assigned restaurant") };
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
    return { ok: false, error: new Error("Only the restaurant owner or manager can manage staff") };
  }

  return { ok: true, error: null as Error | null };
}

async function listUsersForRestaurant(restaurantId: string): Promise<{ data: StaffRow[]; error: Error | null }> {
  const rows: StaffRow[] = [];

  let page = 1;
  const perPage = 1000;

  while (true) {
    const res = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (res.error) return { data: [], error: new Error(res.error.message) };

    const users = res.data?.users ?? [];
    for (const u of users) {
      const meta = (u.app_metadata ?? {}) as Record<string, unknown>;
      const rid = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
      if (rid !== restaurantId) continue;

      const role = (typeof meta.role === "string" ? meta.role : "cashier") as StaffRole;
      rows.push({ id: u.id, email: u.email ?? null, role: role === "manager" ? "manager" : "cashier" });
    }

    if (users.length < perPage) break;
    page += 1;
  }

  rows.sort((a, b) => {
    const ea = (a.email ?? "").toLowerCase();
    const eb = (b.email ?? "").toLowerCase();
    return ea.localeCompare(eb);
  });

  return { data: rows, error: null };
}

export async function GET(req: Request) {
  const { user, error } = await requireRequester(req);
  if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

  const requesterRole = (user.app_metadata as { role?: string } | undefined)?.role ?? null;

  const active = await getActiveRestaurantId(user.id);
  if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
  if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

  const perm = await requireRestaurantOwnerOrManager(user.id, requesterRole, active.restaurantId);
  if (!perm.ok) return NextResponse.json({ error: perm.error?.message ?? "Forbidden" }, { status: 403 });

  const staff = await listUsersForRestaurant(active.restaurantId);
  if (staff.error) return NextResponse.json({ error: staff.error.message }, { status: 400 });

  return NextResponse.json({ staff: staff.data });
}

export async function PATCH(req: Request) {
  const { user, error } = await requireRequester(req);
  if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

  const requesterRole = (user.app_metadata as { role?: string } | undefined)?.role ?? null;

  const active = await getActiveRestaurantId(user.id);
  if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
  if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

  const perm = await requireRestaurantOwnerOrManager(user.id, requesterRole, active.restaurantId);
  if (!perm.ok) return NextResponse.json({ error: perm.error?.message ?? "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as
    | { userId?: string; role?: StaffRole }
    | null;

  const userId = body?.userId?.trim();
  const role = body?.role;

  if (!userId || !role) return NextResponse.json({ error: "Missing userId or role" }, { status: 400 });
  if (role !== "cashier" && role !== "manager") return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const target = await supabaseAdmin.auth.admin.getUserById(userId);
  if (target.error) return NextResponse.json({ error: target.error.message }, { status: 400 });

  const meta = (target.data.user?.app_metadata ?? {}) as Record<string, unknown>;
  const rid = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;

  if (rid !== active.restaurantId) {
    return NextResponse.json({ error: "User is not assigned to the active restaurant" }, { status: 400 });
  }

  const updated = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...meta,
      role,
      restaurant_id: active.restaurantId,
    },
  });

  if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, error } = await requireRequester(req);
  if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

  const requesterRole = (user.app_metadata as { role?: string } | undefined)?.role ?? null;

  const active = await getActiveRestaurantId(user.id);
  if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
  if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

  const perm = await requireRestaurantOwnerOrManager(user.id, requesterRole, active.restaurantId);
  if (!perm.ok) return NextResponse.json({ error: perm.error?.message ?? "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as
    | { userId?: string }
    | null;

  const userId = body?.userId?.trim();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const target = await supabaseAdmin.auth.admin.getUserById(userId);
  if (target.error) return NextResponse.json({ error: target.error.message }, { status: 400 });

  const meta = (target.data.user?.app_metadata ?? {}) as Record<string, unknown>;
  const rid = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;

  if (rid !== active.restaurantId) {
    return NextResponse.json({ error: "User is not assigned to the active restaurant" }, { status: 400 });
  }

  // Remove access by clearing restaurant assignment and forcing cashier role.
  const updated = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...meta,
      role: "cashier",
      restaurant_id: null,
    },
  });

  if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 400 });

  // Also clear app_config restaurant_id so the account can't operate.
  const cfgUpdated = await supabaseAdmin
    .from("app_config")
    .update({ restaurant_id: null, setup_complete: false })
    .eq("owner_user_id", userId);

  if (cfgUpdated.error) return NextResponse.json({ error: cfgUpdated.error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
