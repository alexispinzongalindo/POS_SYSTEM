import { NextResponse } from "next/server";

import * as crypto from "crypto";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CompleteBody = {
  code?: string;
  name?: string;
} | null;

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function randomSecret() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as CompleteBody;
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

    const now = new Date();
    const nowIso = now.toISOString();

    const row = await supabaseAdmin
      .from("edge_gateway_pair_codes")
      .select("code, restaurant_id, expires_at")
      .eq("code", code)
      .maybeSingle<{ code: string; restaurant_id: string; expires_at: string }>();

    if (row.error) return NextResponse.json({ error: row.error.message }, { status: 400 });
    if (!row.data) return NextResponse.json({ error: "Invalid or expired pairing code" }, { status: 401 });

    const exp = new Date(row.data.expires_at);
    if (Number.isNaN(exp.valueOf()) || exp.valueOf() < now.valueOf()) {
      await supabaseAdmin.from("edge_gateway_pair_codes").delete().eq("code", code);
      return NextResponse.json({ error: "Invalid or expired pairing code" }, { status: 401 });
    }

    const secret = randomSecret();
    const secretHash = sha256Hex(secret);

    const created = await supabaseAdmin
      .from("edge_gateways")
      .insert({
        restaurant_id: row.data.restaurant_id,
        name: name || null,
        secret_hash: secretHash,
        last_seen_at: nowIso,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (created.error) return NextResponse.json({ error: created.error.message }, { status: 400 });

    await supabaseAdmin.from("edge_gateway_pair_codes").delete().eq("code", code);

    return NextResponse.json({
      gatewayId: created.data?.id ?? null,
      restaurantId: row.data.restaurant_id,
      secret,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    console.error("[edge/pair/complete] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
