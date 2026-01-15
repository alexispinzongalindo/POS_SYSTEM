import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) {
    return NextResponse.json(
      { error: "Missing OWNER_EMAIL env var" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization token" },
      { status: 401 },
    );
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(
    token,
  );

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 401 });
  }

  const requesterEmail = userData.user?.email;
  if (!requesterEmail || requesterEmail.toLowerCase() !== ownerEmail.toLowerCase()) {
    return NextResponse.json(
      { error: "Only the system owner can create users" },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { email?: string }
    | null;

  const email = body?.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ invited: true, user: data.user });
}
