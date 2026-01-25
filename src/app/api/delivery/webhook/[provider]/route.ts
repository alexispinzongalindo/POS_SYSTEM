import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;

  const body = (await req.json().catch(() => null)) as
    | {
        orderId?: string;
        provider_delivery_id?: string;
        status?: string;
        tracking_url?: string;
      }
    | null;

  const orderId = body?.orderId?.trim();
  const status = body?.status?.trim();

  if (!orderId || !status) {
    return NextResponse.json({ error: "Missing orderId or status" }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    delivery_provider: provider,
    delivery_status: status,
  };

  if (body?.provider_delivery_id) update.delivery_provider_delivery_id = body.provider_delivery_id;
  if (body?.tracking_url) update.delivery_tracking_url = body.tracking_url;

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update(update)
    .eq("id", orderId)
    .select("id, delivery_status, delivery_provider, delivery_provider_delivery_id, delivery_tracking_url")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, order: data });
}
