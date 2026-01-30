import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StaffRole = "manager" | "cashier";

export async function POST(req: Request) {
  try {
    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
      console.error("[invite-user] Missing OWNER_EMAIL env var");
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
      console.error("[invite-user] Auth error:", userError?.message ?? "No user");
      return NextResponse.json({ error: userError?.message ?? "Unauthorized" }, { status: 401 });
    }

    const requester = userData.user;
    const requesterEmail = requester.email;
    const isSystemOwner = !!requesterEmail && requesterEmail.toLowerCase() === ownerEmail.toLowerCase();
    const requesterRole = (requester.app_metadata as { role?: string } | undefined)?.role ?? null;

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

    let restaurantId: string | null = null;

    if (!isSystemOwner) {
      const cfgRes = await supabaseAdmin
        .from("app_config")
        .select("id, owner_user_id, restaurant_id, setup_complete")
        .eq("owner_user_id", requester.id)
        .maybeSingle<{ id: number; owner_user_id: string; restaurant_id: string | null; setup_complete: boolean }>();

      if (cfgRes.error) {
        console.error("[invite-user] app_config error:", cfgRes.error.message);
        return NextResponse.json({ error: cfgRes.error.message }, { status: 400 });
      }

      restaurantId = cfgRes.data?.restaurant_id ?? null;
      if (!restaurantId) {
        console.error("[invite-user] No active restaurant selected");
        return NextResponse.json({ error: "No active restaurant selected" }, { status: 400 });
      }

      if (requesterRole === "cashier") {
        return NextResponse.json({ error: "Cashiers cannot invite staff" }, { status: 403 });
      }

      if (requesterRole === "manager") {
        const meta = (requester.app_metadata ?? {}) as Record<string, unknown>;
        const assigned = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;
        if (!assigned || assigned !== restaurantId) {
          return NextResponse.json(
            { error: "Managers can only invite staff for their assigned restaurant" },
            { status: 403 },
          );
        }
      } else {
        const restaurantRes = await supabaseAdmin
          .from("restaurants")
          .select("id, owner_user_id")
          .eq("id", restaurantId)
          .maybeSingle<{ id: string; owner_user_id: string }>();

        if (restaurantRes.error) {
          return NextResponse.json({ error: restaurantRes.error.message }, { status: 400 });
        }

        if (!restaurantRes.data || restaurantRes.data.owner_user_id !== requester.id) {
          console.error("[invite-user] Not restaurant owner. requester:", requester.id, "owner:", restaurantRes.data?.owner_user_id);
          return NextResponse.json({ error: "Only the restaurant owner or manager can invite staff" }, { status: 403 });
        }
      }
    }

    const explicitBaseUrl = process.env.APP_BASE_URL?.trim() || "";
    const url = new URL(req.url);
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const proto = (forwardedProto || url.protocol.replace(/:$/, "") || "http").toLowerCase();
    const forwardedHost = req.headers.get("x-forwarded-host");
    const host = forwardedHost || req.headers.get("host") || url.host || "";
    const inferredBaseUrl = host ? `${proto}://${host}` : "";
    const origin = req.headers.get("origin") || "";
    const baseUrl = (explicitBaseUrl || inferredBaseUrl || origin || "").replace(/\/$/, "");
    const redirectTo = baseUrl ? `${baseUrl}/auth/callback` : undefined;

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error("[invite-user] Supabase invite error:", error.message, "redirectTo:", redirectTo);
      return NextResponse.json(
        { error: error.message, baseUrl: baseUrl || null, redirectTo: redirectTo || null },
        { status: 400 },
      );
    }

    const invitedUser = data.user;
    if (!invitedUser) {
      return NextResponse.json({ error: "Invite succeeded but user record missing" }, { status: 500 });
    }

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

    return NextResponse.json({ invited: true, user: data.user, baseUrl: baseUrl || null, redirectTo: redirectTo || null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invite failed";
    console.error("[invite-user] Unexpected error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
