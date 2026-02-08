import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Role = "owner" | "manager" | "cashier" | "kitchen" | "maintenance" | "driver" | "security" | null;

type Body = {
  orderId?: string;
  email?: string;
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

function formatMoney(n: number | null | undefined) {
  return `$${Number(n ?? 0).toFixed(2)}`;
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

    const body = (await req.json().catch(() => null)) as Body;
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";

    if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const userMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
    const active = await resolveRestaurantId(user.id, role, userMeta);
    if (active.error) return NextResponse.json({ error: active.error.message }, { status: 400 });
    if (!active.restaurantId) return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });

    const orderRes = await supabaseAdmin
      .from("orders")
      .select("id, restaurant_id, ticket_no, created_at, subtotal, tax, total, discount_amount, payment_method")
      .eq("id", orderId)
      .maybeSingle<{
        id: string;
        restaurant_id: string;
        ticket_no: number | null;
        created_at: string;
        subtotal: number;
        tax: number;
        total: number;
        discount_amount: number | null;
        payment_method: string | null;
      }>();

    if (orderRes.error) return NextResponse.json({ error: orderRes.error.message }, { status: 400 });
    if (!orderRes.data) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (orderRes.data.restaurant_id !== active.restaurantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const restaurantRes = await supabaseAdmin
      .from("restaurants")
      .select("name, email, phone")
      .eq("id", orderRes.data.restaurant_id)
      .maybeSingle<{ name: string | null; email: string | null; phone: string | null }>();

    if (restaurantRes.error) return NextResponse.json({ error: restaurantRes.error.message }, { status: 400 });

    const itemsRes = await supabaseAdmin
      .from("order_items")
      .select("name, qty, unit_price, line_total")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (itemsRes.error) return NextResponse.json({ error: itemsRes.error.message }, { status: 400 });

    const restaurantName = restaurantRes.data?.name ?? "IslaPOS";
    const subject = `Your receipt from ${restaurantName}`;
    const createdAt = new Date(orderRes.data.created_at).toLocaleString();

    const itemLines = (itemsRes.data ?? []).map((it) => `• ${it.qty} x ${it.name} — ${formatMoney(it.line_total ?? it.unit_price)}`);

    const textLines = [
      restaurantName,
      restaurantRes.data?.phone ? `Phone: ${restaurantRes.data.phone}` : null,
      restaurantRes.data?.email ? `Email: ${restaurantRes.data.email}` : null,
      "",
      orderRes.data.ticket_no != null ? `Ticket #${orderRes.data.ticket_no}` : "Receipt",
      `Date: ${createdAt}`,
      orderRes.data.payment_method ? `Payment: ${orderRes.data.payment_method.replace("_", " ")}` : null,
      "",
      "Items:",
      ...(itemLines.length ? itemLines : ["(No items)"]),
      "",
      `Subtotal: ${formatMoney(orderRes.data.subtotal)}`,
      orderRes.data.discount_amount && orderRes.data.discount_amount > 0 ? `Discount: -${formatMoney(orderRes.data.discount_amount)}` : null,
      `Tax: ${formatMoney(orderRes.data.tax)}`,
      `Total: ${formatMoney(orderRes.data.total)}`,
    ].filter((line): line is string => Boolean(line));

    const htmlItems = (itemsRes.data ?? [])
      .map(
        (it) =>
          `<tr><td style="padding:6px 0;">${it.qty} x ${it.name}</td><td style="padding:6px 0; text-align:right;">${formatMoney(
            it.line_total ?? it.unit_price,
          )}</td></tr>`,
      )
      .join("");

    const html = `
      <div style="font-family:Arial, sans-serif; color:#111;">
        <h2 style="margin:0 0 6px;">${restaurantName}</h2>
        ${restaurantRes.data?.phone ? `<div style="font-size:12px;">Phone: ${restaurantRes.data.phone}</div>` : ""}
        ${restaurantRes.data?.email ? `<div style="font-size:12px;">Email: ${restaurantRes.data.email}</div>` : ""}
        <div style="margin-top:12px; font-size:13px;">${orderRes.data.ticket_no != null ? `Ticket #${orderRes.data.ticket_no}` : "Receipt"}</div>
        <div style="font-size:12px; color:#444;">${createdAt}</div>
        ${orderRes.data.payment_method ? `<div style="font-size:12px; color:#444;">Payment: ${orderRes.data.payment_method.replace("_", " ")}</div>` : ""}
        <table style="width:100%; margin-top:14px; border-collapse:collapse; font-size:13px;">
          <tbody>
            ${htmlItems || `<tr><td>(No items)</td><td></td></tr>`}
          </tbody>
        </table>
        <div style="margin-top:12px; border-top:1px solid #eee; padding-top:10px; font-size:13px;">
          <div style="display:flex; justify-content:space-between;"><span>Subtotal</span><span>${formatMoney(orderRes.data.subtotal)}</span></div>
          ${orderRes.data.discount_amount && orderRes.data.discount_amount > 0 ? `<div style="display:flex; justify-content:space-between;"><span>Discount</span><span>-${formatMoney(orderRes.data.discount_amount)}</span></div>` : ""}
          <div style="display:flex; justify-content:space-between;"><span>Tax</span><span>${formatMoney(orderRes.data.tax)}</span></div>
          <div style="display:flex; justify-content:space-between; font-weight:700;"><span>Total</span><span>${formatMoney(orderRes.data.total)}</span></div>
        </div>
      </div>
    `;

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey) return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    if (!from) return NextResponse.json({ error: "Missing EMAIL_FROM" }, { status: 500 });

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject,
        text: textLines.join("\n"),
        html,
      }),
    });

    const sendJson = (await sendRes.json().catch(() => null)) as { error?: { message?: string } | string } | null;
    if (!sendRes.ok) {
      const msg =
        typeof sendJson?.error === "string"
          ? sendJson.error
          : typeof sendJson?.error === "object" && sendJson?.error?.message
            ? sendJson.error.message
            : "Failed to send email";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to send receipt";
    console.error("[pos/send-receipt] POST error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
