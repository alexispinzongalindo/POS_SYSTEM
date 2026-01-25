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

  if (userError || !userData.user) {
    return NextResponse.json({ error: userError?.message ?? "Unauthorized" }, { status: 401 });
  }

  const requester = userData.user;
  const requesterEmail = requester.email;
  const isSystemOwner = !!requesterEmail && requesterEmail.toLowerCase() === ownerEmail.toLowerCase();

  const body = (await req.json().catch(() => null)) as
    | { email?: string; role?: "manager" | "cashier" }
    | null;

  const email = body?.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const role = body?.role ?? "cashier";
  if (role !== "manager" && role !== "cashier") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // If not system owner, enforce that the requester is a restaurant owner
  // inviting staff into their currently active restaurant.
  let restaurantId: string | null = null;

  if (!isSystemOwner) {
    const cfgRes = await supabaseAdmin
      .from("app_config")
      .select("id, owner_user_id, restaurant_id, setup_complete")
      .eq("owner_user_id", requester.id)
      .maybeSingle<{ id: number; owner_user_id: string; restaurant_id: string | null; setup_complete: boolean }>();

    if (cfgRes.error) {
      return NextResponse.json({ error: cfgRes.error.message }, { status: 400 });
    }

    restaurantId = cfgRes.data?.restaurant_id ?? null;
    if (!restaurantId) {
      return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });
    }

    const restaurantRes = await supabaseAdmin
      .from("restaurants")
      .select("id, owner_user_id")
      .eq("id", restaurantId)
      .maybeSingle<{ id: string; owner_user_id: string }>();

    if (restaurantRes.error) {
      return NextResponse.json({ error: restaurantRes.error.message }, { status: 400 });
    }

    if (!restaurantRes.data || restaurantRes.data.owner_user_id !== requester.id) {
      return NextResponse.json({ error: "Only the restaurant owner can invite staff" }, { status: 403 });
    }
  }

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const invitedUser = data.user;
  if (!invitedUser) {
    return NextResponse.json({ error: "Invite succeeded but user record missing" }, { status: 500 });
  }

  // If the inviter is a restaurant owner, assign the invited user to that restaurant.
  if (!isSystemOwner && restaurantId) {
    const upsertCfg = await supabaseAdmin
      .from("app_config")
      .upsert(
        {
          owner_user_id: invitedUser.id,
          restaurant_id: restaurantId,
          setup_complete: true,
        },
        { onConflict: "owner_user_id" },
      )
      .select("id, owner_user_id, restaurant_id, setup_complete")
      .maybeSingle();

    if (upsertCfg.error) {
      return NextResponse.json({ error: upsertCfg.error.message }, { status: 400 });
    }

    const updated = await supabaseAdmin.auth.admin.updateUserById(invitedUser.id, {
      app_metadata: {
        role,
        restaurant_id: restaurantId,
      },
    });

    if (updated.error) {
      return NextResponse.json({ error: updated.error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ invited: true, user: data.user });
}
