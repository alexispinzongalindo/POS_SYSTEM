import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "owner" | "manager" | "cashier" | "kitchen" | "maintenance" | "driver" | "security" | null;

type CreateCaseBody = {
  customerName?: string;
  customerPhone?: string;
  subject?: string;
  description?: string;
  priority?: "low" | "normal" | "high";
} | null;

type UpdateCaseBody = {
  id?: string;
  status?: "open" | "in_progress" | "closed";
  priority?: "low" | "normal" | "high";
  subject?: string;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  internalNotes?: string;
  resolution?: string;
} | null;

type DeleteCaseBody = {
  id?: string;
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

async function requireRestaurantOwnerOrManager(userId: string, userRole: Role, restaurantId: string) {
  if (userRole === "cashier" || userRole === "kitchen" || userRole === "maintenance" || userRole === "driver" || userRole === "security") {
    return { ok: false, error: new Error("Cashiers cannot access support") };
  }

  if (userRole === "manager") {
    const u = await supabaseAdmin.auth.admin.getUserById(userId);
    if (u.error) return { ok: false, error: new Error(u.error.message) };
    const meta = (u.data.user?.app_metadata ?? {}) as Record<string, unknown>;
    const assigned = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
    if (!assigned || assigned !== restaurantId) {
      return { ok: false, error: new Error("Managers can only access support for their assigned restaurant") };
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
    return { ok: false, error: new Error("Only the restaurant owner or manager can access support") };
  }

  return { ok: true, error: null as Error | null };
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

    const res = await supabaseAdmin
      .from("support_cases")
      .select("id, restaurant_id, status, priority, customer_name, customer_phone, subject, description, internal_notes, resolution, created_at, updated_at")
      .eq("restaurant_id", active.restaurantId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 400 });

    return NextResponse.json({ restaurantId: active.restaurantId, cases: res.data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load cases";
    console.error("[admin/support-cases] GET error:", msg);
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

    const body = (await req.json().catch(() => null)) as CreateCaseBody;
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    if (!subject) return NextResponse.json({ error: "Subject is required" }, { status: 400 });

    const customerName = typeof body?.customerName === "string" ? body.customerName.trim() : "";
    const customerPhone = typeof body?.customerPhone === "string" ? body.customerPhone.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const priority = body?.priority === "low" || body?.priority === "high" ? body.priority : "normal";

    const created = await supabaseAdmin
      .from("support_cases")
      .insert({
        restaurant_id: active.restaurantId,
        status: "open",
        priority,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        subject,
        description: description || null,
        created_by_user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (created.error) return NextResponse.json({ error: created.error.message }, { status: 400 });

    return NextResponse.json({ ok: true, id: created.data?.id ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create case";
    console.error("[admin/support-cases] POST error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
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

    const body = (await req.json().catch(() => null)) as UpdateCaseBody;
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body?.status === "open" || body?.status === "in_progress" || body?.status === "closed") {
      patch.status = body.status;
      if (body.status === "closed") {
        patch.closed_at = new Date().toISOString();
      }
    }

    if (body?.priority === "low" || body?.priority === "normal" || body?.priority === "high") {
      patch.priority = body.priority;
    }

    if (typeof body?.subject === "string") patch.subject = body.subject.trim() || null;
    if (typeof body?.description === "string") patch.description = body.description.trim() || null;
    if (typeof body?.customerName === "string") patch.customer_name = body.customerName.trim() || null;
    if (typeof body?.customerPhone === "string") patch.customer_phone = body.customerPhone.trim() || null;
    if (typeof body?.internalNotes === "string") patch.internal_notes = body.internalNotes.trim() || null;
    if (typeof body?.resolution === "string") patch.resolution = body.resolution.trim() || null;

    const updated = await supabaseAdmin
      .from("support_cases")
      .update(patch)
      .eq("id", id)
      .eq("restaurant_id", active.restaurantId)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update case";
    console.error("[admin/support-cases] PATCH error:", msg);
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

    const body = (await req.json().catch(() => null)) as DeleteCaseBody;
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const del = await supabaseAdmin
      .from("support_cases")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", active.restaurantId);

    if (del.error) return NextResponse.json({ error: del.error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete case";
    console.error("[admin/support-cases] DELETE error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
