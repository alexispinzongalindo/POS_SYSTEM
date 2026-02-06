import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

import * as crypto from "crypto";

type Role = "owner" | "manager" | "cashier" | "kitchen" | "maintenance" | "driver" | "security" | null;

type PairStartBody = {
  name?: string;
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

async function requireRestaurantOwnerOrManager(userId: string, role: Role, restaurantId: string) {
  if (role === "cashier" || role === "kitchen" || role === "maintenance" || role === "driver" || role === "security") {
    return { ok: false, error: new Error("Forbidden") };
  }

  if (role === "manager") {
    const u = await supabaseAdmin.auth.admin.getUserById(userId);
    if (u.error) return { ok: false, error: new Error(u.error.message) };
    const meta = (u.data.user?.app_metadata ?? {}) as Record<string, unknown>;
    const assigned = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
    if (!assigned || assigned !== restaurantId) {
      return { ok: false, error: new Error("Forbidden") };
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
    return { ok: false, error: new Error("Forbidden") };
  }

  return { ok: true, error: null as Error | null };
}

function generatePairCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export async function POST(req: Request) {
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

    const body = (await req.json().catch(() => null)) as PairStartBody;
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    let code = "";
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      code = generatePairCode();
      const ins = await supabaseAdmin.from("edge_gateway_pair_codes").insert({
        code,
        restaurant_id: active.restaurantId,
        created_by_user_id: user.id,
        expires_at: expiresAt,
      });

      if (!ins.error) {
        return NextResponse.json({
          code,
          restaurantId: active.restaurantId,
          name: name || null,
          expiresAt,
        });
      }

      lastErr = new Error(ins.error.message);
    }

    return NextResponse.json({ error: lastErr?.message ?? "Failed to create pairing code" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    console.error("[edge/pair/start] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
