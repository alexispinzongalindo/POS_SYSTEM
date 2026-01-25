import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Missing Authorization token" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: userError?.message ?? "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { orderId?: string; provider?: string }
    | null;

  const orderId = body?.orderId?.trim();
  const requestedProvider = body?.provider?.trim() ?? null;

  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  const orderRes = await supabaseAdmin
    .from("orders")
    .select("id, restaurant_id, order_type, delivery_status")
    .eq("id", orderId)
    .maybeSingle<{ id: string; restaurant_id: string; order_type: string; delivery_status: string | null }>();

  if (orderRes.error) {
    return NextResponse.json({ error: orderRes.error.message }, { status: 400 });
  }
  if (!orderRes.data) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (orderRes.data.order_type !== "delivery") {
    return NextResponse.json({ error: "Only delivery orders can be dispatched" }, { status: 400 });
  }

  const integrationsRes = await supabaseAdmin
    .from("delivery_integrations")
    .select("provider, enabled")
    .eq("restaurant_id", orderRes.data.restaurant_id)
    .eq("enabled", true);

  if (integrationsRes.error) {
    return NextResponse.json({ error: integrationsRes.error.message }, { status: 400 });
  }

  const enabledProviders = (integrationsRes.data ?? []).map((r) => String(r.provider));

  const provider =
    (requestedProvider && enabledProviders.includes(requestedProvider) ? requestedProvider : null) ??
    enabledProviders[0] ??
    null;

  if (!provider) {
    return NextResponse.json(
      { error: "No enabled delivery provider for this restaurant. Configure it in Admin → Integrations." },
      { status: 400 },
    );
  }

  const providerDeliveryId = `stub_${Date.now()}`;
  const trackingUrl = `https://track.islapos.local/${provider}/${providerDeliveryId}`;

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({
      delivery_status: "dispatched",
      delivery_provider: provider,
      delivery_provider_delivery_id: providerDeliveryId,
      delivery_tracking_url: trackingUrl,
      delivery_dispatched_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("id, delivery_status, delivery_provider, delivery_provider_delivery_id, delivery_tracking_url")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ dispatched: true, order: data });
}
