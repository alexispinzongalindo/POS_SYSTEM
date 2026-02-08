import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "owner" | "manager" | "cashier" | "kitchen" | "maintenance" | "driver" | "security" | null;

type CreateBody = {
  name?: string;
  email?: string;
  phone?: string;
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
  if (role === "cashier" || role === "manager" || role === "kitchen" || role === "maintenance" || role === "driver" || role === "security") {
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function GET(req: Request) {
  try {
    const { user, error } = await requireRequester(req);
    if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

    const roleRaw = (user.app_metadata as { role?: string } | undefined)?.role ?? null;
    const role: Role =
      roleRaw === "owner" ||
      roleRaw === "manager" ||
      roleRaw === "cashier" ||
      roleRaw === "kitchen" ||
      roleRaw === "maintenance" ||
      roleRaw === "driver" ||
      roleRaw === "security"
        ? roleRaw
        : null;

    const userMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
    const active = await resolveRestaurantId(user.id, role, userMeta);
    if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
    if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() ?? "";

    let q = supabaseAdmin
      .from("customers")
      .select("id, name, email, phone, birthday, notes, address_line1, address_line2, city, state, postal_code")
      .eq("restaurant_id", active.restaurantId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (query) {
      const like = `%${query}%`;
      q = q.or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
    }

    const res = await q;
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 400 });
    return NextResponse.json({ customers: res.data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load customers";
    console.error("[pos/customers] GET error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, error } = await requireRequester(req);
    if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

    const roleRaw = (user.app_metadata as { role?: string } | undefined)?.role ?? null;
    const role: Role =
      roleRaw === "owner" ||
      roleRaw === "manager" ||
      roleRaw === "cashier" ||
      roleRaw === "kitchen" ||
      roleRaw === "maintenance" ||
      roleRaw === "driver" ||
      roleRaw === "security"
        ? roleRaw
        : null;

    const userMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
    const active = await resolveRestaurantId(user.id, role, userMeta);
    if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
    if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

    const body = (await req.json().catch(() => null)) as CreateBody;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!phone) return NextResponse.json({ error: "Phone is required" }, { status: 400 });

    const existing = await supabaseAdmin
      .from("customers")
      .select("id, name, email, phone")
      .eq("restaurant_id", active.restaurantId)
      .eq("email", email)
      .maybeSingle<{ id: string; name: string; email: string; phone: string }>();

    if (existing.error && existing.error.code !== "PGRST116") {
      return NextResponse.json({ error: existing.error.message }, { status: 400 });
    }

    if (existing.data?.id) {
      const updated = await supabaseAdmin
        .from("customers")
        .update({
          name,
          phone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.data.id)
        .eq("restaurant_id", active.restaurantId)
        .select("id, name, email, phone")
        .maybeSingle<{ id: string; name: string; email: string; phone: string }>();

      if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 400 });
      return NextResponse.json({ customer: updated.data ?? null });
    }

    const inserted = await supabaseAdmin
      .from("customers")
      .insert({
        restaurant_id: active.restaurantId,
        name,
        email,
        phone,
        updated_at: new Date().toISOString(),
      })
      .select("id, name, email, phone")
      .maybeSingle<{ id: string; name: string; email: string; phone: string }>();

    if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 400 });
    return NextResponse.json({ customer: inserted.data ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save customer";
    console.error("[pos/customers] POST error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
