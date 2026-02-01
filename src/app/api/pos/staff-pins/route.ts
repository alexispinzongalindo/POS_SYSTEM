import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StaffRole = "manager" | "cashier";

type StaffPinRow = {
  id: string;
  email: string | null;
  role: StaffRole;
  name: string | null;
  pin: string | null;
};

function normalizePin(pin: unknown) {
  if (typeof pin !== "string") return null;
  const p = pin.trim();
  if (!/^\d{4}$/.test(p)) return null;
  return p;
}

async function requireRequester(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { user: null as null, error: new Error("Missing Authorization token") };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { user: null as null, error: new Error(error?.message ?? "Unauthorized") };

  return { user: data.user, error: null as Error | null };
}

async function getActiveRestaurantIdForUser(userId: string, role: string | null) {
  if (role === "cashier" || role === "manager") {
    const u = await supabaseAdmin.auth.admin.getUserById(userId);
    if (u.error) return { restaurantId: null as string | null, error: new Error(u.error.message) };
    const meta = (u.data.user?.app_metadata ?? {}) as Record<string, unknown>;
    const rid = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
    if (!rid) return { restaurantId: null as string | null, error: new Error("No restaurant assigned") };
    return { restaurantId: rid, error: null as Error | null };
  }

  const cfgRes = await supabaseAdmin
    .from("app_config")
    .select("restaurant_id")
    .eq("owner_user_id", userId)
    .maybeSingle<{ restaurant_id: string | null }>();

  if (cfgRes.error) return { restaurantId: null as string | null, error: cfgRes.error };
  return { restaurantId: cfgRes.data?.restaurant_id ?? null, error: null as Error | null };
}

async function listUsersForRestaurant(restaurantId: string): Promise<{ data: StaffPinRow[]; error: Error | null }> {
  const rows: StaffPinRow[] = [];

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
      const name = typeof meta.staff_name === "string" ? meta.staff_name : null;
      const pin = normalizePin(meta.staff_pin);

      rows.push({
        id: u.id,
        email: u.email ?? null,
        role: role === "manager" ? "manager" : "cashier",
        name,
        pin,
      });
    }

    if (users.length < perPage) break;
    page += 1;
  }

  rows.sort((a, b) => {
    const an = (a.name ?? a.email ?? "").toLowerCase();
    const bn = (b.name ?? b.email ?? "").toLowerCase();
    return an.localeCompare(bn);
  });

  return { data: rows, error: null };
}

export async function GET(req: Request) {
  const { user, error } = await requireRequester(req);
  if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

  const role = (user.app_metadata as { role?: string } | undefined)?.role ?? null;

  const active = await getActiveRestaurantIdForUser(user.id, role);
  if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
  if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

  const staff = await listUsersForRestaurant(active.restaurantId);
  if (staff.error) return NextResponse.json({ error: staff.error.message }, { status: 400 });

  return NextResponse.json({ restaurantId: active.restaurantId, staff: staff.data });
}
