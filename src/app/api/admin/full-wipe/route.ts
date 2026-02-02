import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "owner" | "manager" | "cashier" | null;

type WipeBody =
  | {
      confirm?: string;
    }
  | null;

const REQUIRED_CONFIRM = "WIPE";

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

async function requireRestaurantOwner(userId: string, restaurantId: string) {
  const restaurantRes = await supabaseAdmin
    .from("restaurants")
    .select("id, owner_user_id")
    .eq("id", restaurantId)
    .maybeSingle<{ id: string; owner_user_id: string }>();

  if (restaurantRes.error) return { ok: false, error: restaurantRes.error };
  if (!restaurantRes.data) return { ok: false, error: new Error("Restaurant not found") };

  if (restaurantRes.data.owner_user_id !== userId) {
    return { ok: false, error: new Error("Only the restaurant owner can perform a full wipe") };
  }

  return { ok: true, error: null as Error | null };
}

async function listUserIdsAssignedToRestaurant(restaurantId: string) {
  const ids: string[] = [];

  let page = 1;
  const perPage = 1000;

  while (true) {
    const res = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (res.error) throw new Error(res.error.message);

    const users = res.data?.users ?? [];
    for (const u of users) {
      const meta = (u.app_metadata ?? {}) as Record<string, unknown>;
      const rid = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
      if (rid !== restaurantId) continue;
      ids.push(u.id);
    }

    if (users.length < perPage) break;
    page += 1;
  }

  // Always include the owner app_config user even if metadata got messed up.
  return Array.from(new Set(ids));
}

export async function POST(req: Request) {
  const { user, error } = await requireRequester(req);
  if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

  const requesterRoleRaw = (user.app_metadata as { role?: string } | undefined)?.role ?? null;
  const requesterRole: Role =
    requesterRoleRaw === "owner" || requesterRoleRaw === "manager" || requesterRoleRaw === "cashier" ? requesterRoleRaw : null;

  if (requesterRole === "cashier" || requesterRole === "manager") {
    return NextResponse.json({ error: "Only the restaurant owner can perform a full wipe" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as WipeBody;
  const confirm = typeof body?.confirm === "string" ? body.confirm.trim().toUpperCase() : "";
  if (confirm !== REQUIRED_CONFIRM) {
    return NextResponse.json({ error: `Confirmation required. Type ${REQUIRED_CONFIRM} to continue.` }, { status: 400 });
  }

  const active = await getActiveRestaurantId(user.id);
  if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
  if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

  const perm = await requireRestaurantOwner(user.id, active.restaurantId);
  if (!perm.ok) return NextResponse.json({ error: perm.error?.message ?? "Forbidden" }, { status: 403 });

  // 1) Find all users assigned to restaurant (including staff)
  let userIds: string[] = [];
  try {
    userIds = await listUserIdsAssignedToRestaurant(active.restaurantId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list users";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Ensure the requester is included
  if (!userIds.includes(user.id)) userIds.push(user.id);

  // 2) Delete the restaurant row. If your schema uses FK ON DELETE CASCADE, this wipes all related data.
  const delRestaurant = await supabaseAdmin.from("restaurants").delete().eq("id", active.restaurantId);
  if (delRestaurant.error) return NextResponse.json({ error: delRestaurant.error.message }, { status: 400 });

  // 3) Clear app_config rows for these users (best-effort)
  const cfgDel = await supabaseAdmin.from("app_config").delete().in("owner_user_id", userIds);
  if (cfgDel.error) {
    // Not fatal; continue.
  }

  // 4) Delete auth users (best-effort). This will log everyone out.
  const failures: Array<{ userId: string; error: string }> = [];
  for (const uid of userIds) {
    const delUser = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (delUser.error) failures.push({ userId: uid, error: delUser.error.message });
  }

  if (failures.length > 0) {
    return NextResponse.json({
      ok: true,
      warning: "Restaurant deleted, but some user accounts could not be deleted. You can delete them from Supabase Auth -> Users.",
      failures,
    });
  }

  return NextResponse.json({ ok: true });
}
