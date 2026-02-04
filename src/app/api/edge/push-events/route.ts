import { NextResponse } from "next/server";

import * as crypto from "crypto";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PushBody = {
  events?: Array<{
    id?: string;
    deviceId?: string | null;
    type?: string;
    payload?: unknown;
    createdAt?: string;
  }>;
} | null;

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

async function requireGateway(req: Request) {
  const gatewayId = req.headers.get("x-gateway-id")?.trim() ?? "";
  const gatewaySecret = req.headers.get("x-gateway-secret")?.trim() ?? "";

  if (!gatewayId || !gatewaySecret) {
    return { ok: false as const, error: new Error("Missing gateway credentials"), gateway: null as null };
  }

  const row = await supabaseAdmin
    .from("edge_gateways")
    .select("id, restaurant_id, secret_hash")
    .eq("id", gatewayId)
    .maybeSingle<{ id: string; restaurant_id: string; secret_hash: string }>();

  if (row.error) return { ok: false as const, error: new Error(row.error.message), gateway: null as null };
  if (!row.data) return { ok: false as const, error: new Error("Unauthorized"), gateway: null as null };

  const computed = sha256Hex(gatewaySecret);
  if (computed !== row.data.secret_hash) {
    return { ok: false as const, error: new Error("Unauthorized"), gateway: null as null };
  }

  const nowIso = new Date().toISOString();
  await supabaseAdmin.from("edge_gateways").update({ last_seen_at: nowIso }).eq("id", row.data.id);

  return {
    ok: true as const,
    error: null as Error | null,
    gateway: {
      id: row.data.id,
      restaurantId: row.data.restaurant_id,
    },
  };
}

export async function POST(req: Request) {
  try {
    const gw = await requireGateway(req);
    if (!gw.ok || !gw.gateway) {
      return NextResponse.json({ error: gw.error?.message ?? "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as PushBody;
    const events = Array.isArray(body?.events) ? body?.events ?? [] : [];

    if (events.length === 0) return NextResponse.json({ ok: true, accepted: 0, duplicate: 0, ids: [] as string[] });

    const nowIso = new Date().toISOString();

    const mapped = events
      .map((e) => {
        const id = typeof e?.id === "string" ? e.id.trim() : "";
        const type = typeof e?.type === "string" ? e.type.trim() : "";
        const deviceId = typeof e?.deviceId === "string" ? e.deviceId.trim() : null;
        const createdAtRaw = typeof e?.createdAt === "string" ? e.createdAt.trim() : "";
        const createdAt = createdAtRaw && !Number.isNaN(new Date(createdAtRaw).valueOf()) ? new Date(createdAtRaw).toISOString() : nowIso;

        if (!id || !type) return null;

        const payload = e?.payload ?? {};

        return {
          id,
          restaurant_id: gw.gateway.restaurantId,
          gateway_id: gw.gateway.id,
          device_id: deviceId,
          type,
          payload_json: payload,
          created_at: createdAt,
          received_at: nowIso,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    if (mapped.length === 0) {
      return NextResponse.json({ error: "No valid events" }, { status: 400 });
    }

    const ids = mapped.map((m) => m.id);

    const existing = await supabaseAdmin.from("edge_events").select("id").in("id", ids).returns<Array<{ id: string }>>();
    if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 400 });

    const existingIds = new Set((existing.data ?? []).map((r) => r.id));
    const toInsert = mapped.filter((m) => !existingIds.has(m.id));

    if (toInsert.length > 0) {
      const ins = await supabaseAdmin.from("edge_events").insert(toInsert);
      if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      accepted: toInsert.length,
      duplicate: mapped.length - toInsert.length,
      ids,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    console.error("[edge/push-events] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
