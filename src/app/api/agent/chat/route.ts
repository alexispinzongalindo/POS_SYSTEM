import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function safeTrim(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Missing Authorization token" }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: userError?.message ?? "Unauthorized" }, { status: 401 });
    }

    const requester = userData.user;
    const requesterRole = (requester.app_metadata as { role?: string } | undefined)?.role ?? null;
    if (requesterRole === "cashier" || requesterRole === "kitchen" || requesterRole === "maintenance" || requesterRole === "driver" || requesterRole === "security") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as
      | {
          message?: string;
          history?: ChatMessage[];
          context?: { gatewayUrl?: string; restaurantId?: string };
        }
      | null;

    const message = safeTrim(body?.message);
    const history = Array.isArray(body?.history) ? body?.history : [];

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const apiKey = safeTrim(process.env.OPENAI_API_KEY);
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: true,
          reply:
            "AI is not configured yet. Add OPENAI_API_KEY to your environment and restart the Next.js server. After that, this chat will work.",
        },
        { status: 200 },
      );
    }

    const gatewayUrl = safeTrim(body?.context?.gatewayUrl);
    const restaurantId = safeTrim(body?.context?.restaurantId);

    const system =
      "You are IslaPOS Support AI. You help restaurant owners/managers troubleshoot printers, Edge Gateway pairing/sync, and KDS issues. " +
      "Be concise, step-by-step, and ask only one clarifying question at a time when needed. " +
      "When suggesting actions, prefer safe checks (health endpoints, test prints) before risky changes.";

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: system },
    ];

    if (gatewayUrl || restaurantId) {
      const ctxLine = `Context: gatewayUrl=${gatewayUrl || "(unknown)"} restaurantId=${restaurantId || "(unknown)"}`;
      messages.push({ role: "system", content: ctxLine });
    }

    for (const m of history) {
      if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
      const c = safeTrim(m.content);
      if (!c) continue;
      messages.push({ role: m.role, content: c });
    }

    messages.push({ role: "user", content: message });

    const model = safeTrim(process.env.OPENAI_MODEL) || "gpt-4o-mini";

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages,
      }),
    });

    const json = (await r.json().catch(() => null)) as
      | {
          error?: { message?: string };
          choices?: Array<{ message?: { content?: string } }>;
        }
      | null;

    if (!r.ok) {
      return NextResponse.json(
        { error: json?.error?.message ?? `OpenAI error (${r.status})` },
        { status: 400 },
      );
    }

    const reply = safeTrim(json?.choices?.[0]?.message?.content) || "";
    return NextResponse.json({ ok: true, reply }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
