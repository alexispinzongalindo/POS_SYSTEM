import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function requireRequester(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { user: null as null, error: new Error("Missing Authorization token") };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { user: null as null, error: new Error(error?.message ?? "Unauthorized") };

  return { user: data.user, error: null as Error | null };
}

export async function GET(req: Request) {
  try {
    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
      return NextResponse.json({ error: "Missing OWNER_EMAIL env var" }, { status: 500 });
    }

    const { user, error } = await requireRequester(req);
    if (error || !user) return NextResponse.json({ error: error?.message ?? "Unauthorized" }, { status: 401 });

    const email = (user.email ?? "").toLowerCase();
    const isSystemOwner = !!email && email === ownerEmail.toLowerCase();

    return NextResponse.json({ isSystemOwner });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    console.error("[admin/system-owner] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
