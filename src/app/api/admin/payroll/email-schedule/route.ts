import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "owner" | "manager" | "cashier" | "kitchen" | "maintenance" | "driver" | "security" | null;

type Body = {
  staffUserId?: string;
  start?: string;
  end?: string;
} | null;

type ShiftRow = {
  starts_at: string;
  ends_at: string;
  break_minutes: number | null;
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
  if (userRole === "cashier" || userRole === "kitchen" || userRole === "maintenance" || userRole === "driver" || userRole === "security") {
    return { ok: false, error: new Error("Cashiers cannot email schedules") };
  }

  if (userRole === "manager") {
    const u = await supabaseAdmin.auth.admin.getUserById(userId);
    if (u.error) return { ok: false, error: new Error(u.error.message) };
    const meta = (u.data.user?.app_metadata ?? {}) as Record<string, unknown>;
    const assigned = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
    if (!assigned || assigned !== restaurantId) {
      return { ok: false, error: new Error("Managers can only email schedules for their assigned restaurant") };
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
    return { ok: false, error: new Error("Only the restaurant owner or manager can email schedules") };
  }

  return { ok: true, error: null as Error | null };
}

function safeText(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function fmtLocal(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return iso;
  return d.toLocaleString();
}

export async function POST(req: Request) {
  try {
    const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
    const emailFrom = (process.env.EMAIL_FROM ?? "").trim();
    if (!apiKey || !emailFrom) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY or EMAIL_FROM" }, { status: 500 });
    }

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

    const body = (await req.json().catch(() => null)) as Body;
    const staffUserId = safeText(body?.staffUserId);
    const start = safeText(body?.start);
    const end = safeText(body?.end);

    if (!staffUserId) return NextResponse.json({ error: "Missing staffUserId" }, { status: 400 });
    if (!start || Number.isNaN(new Date(start).valueOf())) return NextResponse.json({ error: "Invalid start" }, { status: 400 });
    if (!end || Number.isNaN(new Date(end).valueOf())) return NextResponse.json({ error: "Invalid end" }, { status: 400 });

    const target = await supabaseAdmin.auth.admin.getUserById(staffUserId);
    if (target.error) return NextResponse.json({ error: target.error.message }, { status: 400 });

    const targetEmail = target.data.user?.email ?? null;
    if (!targetEmail) return NextResponse.json({ error: "Staff user has no email" }, { status: 400 });

    const meta = (target.data.user?.app_metadata ?? {}) as Record<string, unknown>;
    const rid = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
    if (rid !== active.restaurantId) {
      return NextResponse.json({ error: "User is not assigned to the active restaurant" }, { status: 400 });
    }

    const shiftsRes = await supabaseAdmin
      .from("payroll_schedule_shifts")
      .select("starts_at, ends_at, break_minutes")
      .eq("restaurant_id", active.restaurantId)
      .eq("staff_user_id", staffUserId)
      .gte("starts_at", new Date(start).toISOString())
      .lt("starts_at", new Date(end).toISOString())
      .order("starts_at", { ascending: true })
      .limit(200)
      .returns<ShiftRow[]>();

    if (shiftsRes.error) return NextResponse.json({ error: shiftsRes.error.message }, { status: 400 });

    const shifts = shiftsRes.data ?? [];

    const subject = `Your schedule (${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()})`;

    const rowsHtml = shifts.length
      ? shifts
          .map((s) => {
            const startAt = fmtLocal(s.starts_at);
            const endAt = fmtLocal(s.ends_at);
            const br = Number(s.break_minutes ?? 0);
            return `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${startAt}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${endAt}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${br}m</td></tr>`;
          })
          .join("")
      : `<tr><td colspan="3" style="padding:8px;border-bottom:1px solid #e5e7eb;">No shifts scheduled.</td></tr>`;

    const html = `
      <div style="font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
        <h2 style="margin:0 0 8px 0;">IslaPOS Schedule</h2>
        <div style="color:#374151;margin:0 0 12px 0;">Week: ${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}</div>
        <table style="border-collapse:collapse;width:100%;max-width:720px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Start</th>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">End</th>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Break</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: targetEmail,
        subject,
        html,
      }),
    });

    const resendJson = (await resendRes.json().catch(() => null)) as unknown;
    if (!resendRes.ok) {
      const msg =
        typeof resendJson === "object" &&
        resendJson !== null &&
        "message" in resendJson &&
        typeof (resendJson as { message?: unknown }).message === "string"
          ? (resendJson as { message?: string }).message
          : "Failed to send email";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to send schedule";
    console.error("[admin/payroll/email-schedule] POST error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
