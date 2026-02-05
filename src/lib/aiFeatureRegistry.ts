import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AiFeatureRegistryEntryRow = {
  id: string;
  restaurant_id: string | null;
  key: string;
  title: string;
  body: string;
  tags: string[];
  is_active: boolean;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

function safeTrim(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function builtInFeatureRegistry(): Array<{ key: string; title: string; body: string; tags: string[] }> {
  return [
    {
      key: "pos.core",
      title: "POS core",
      body:
        "Create tickets, add items, apply modifiers, split tickets, accept payments, print receipts, and manage dine-in tables. Paid tickets are stored in Supabase orders/order_items.",
      tags: ["pos", "orders", "payments"],
    },
    {
      key: "pos.offline",
      title: "Offline POS mode",
      body:
        "POS supports an offline mode (device-local storage). Offline tickets can be closed as paid locally and later synced.",
      tags: ["pos", "offline"],
    },
    {
      key: "edge_gateway.printing",
      title: "Edge Gateway printing",
      body:
        "A Windows Edge Gateway can manage printers and a durable print queue. Endpoints include GET /health, GET /printers, POST /print/enqueue, GET /print/jobs. POS can enqueue a receipt print job after Close (Paid).",
      tags: ["edge_gateway", "printing"],
    },
    {
      key: "food_cost.1a",
      title: "Food Cost (ingredient-level, weighted average)",
      body:
        "Admin > Food Cost calculates theoretical vs actual usage and cost. Theoretical usage = paid sales (order_items) × recipes (menu_item_recipe_lines). Actual usage = begin count + purchases − end count. Weighted avg cost = purchases_cost/purchases_qty in range.",
      tags: ["food_cost", "inventory", "recipes"],
    },
    {
      key: "inventory.device_stock",
      title: "Device inventory (menu-item stock)",
      body:
        "Admin > Inventory tracks per-menu-item stock on the device (localStorage) and decrements when tickets are marked paid. This is separate from ingredient-level food cost.",
      tags: ["inventory"],
    },
    {
      key: "admin.reports",
      title: "Sales reports",
      body:
        "Admin > Reports shows sales totals, taxes, ticket count, and payment method breakdown for selected ranges.",
      tags: ["admin", "reports"],
    },
    {
      key: "roles.permissions",
      title: "Roles & permissions",
      body:
        "Roles include owner/admin/manager and restricted roles: cashier, kitchen, maintenance, driver, security. Restricted roles are redirected away from admin pages and AI.",
      tags: ["security", "roles"],
    },
  ];
}

export async function loadAiFeatureRegistryText(input?: { restaurantId?: string | null }) {
  const restaurantId = safeTrim(input?.restaurantId);

  try {
    let q = supabaseAdmin
      .from("ai_feature_registry_entries")
      .select("id, restaurant_id, key, title, body, tags, is_active, created_by_user_id, updated_by_user_id, created_at, updated_at")
      .eq("is_active", true);

    if (restaurantId) {
      q = q.or(`restaurant_id.eq.${restaurantId},restaurant_id.is.null`);
    } else {
      q = q.is("restaurant_id", null);
    }

    const res = await q.order("updated_at", { ascending: false }).limit(200).returns<AiFeatureRegistryEntryRow[]>();

    const rows = (res.data ?? []).filter((r) => r.is_active);

    const fallback = builtInFeatureRegistry();

    const sorted = rows
      .slice()
      .sort((a, b) => {
        const aSpecific = restaurantId && a.restaurant_id === restaurantId ? 1 : 0;
        const bSpecific = restaurantId && b.restaurant_id === restaurantId ? 1 : 0;
        if (aSpecific !== bSpecific) return bSpecific - aSpecific;
        return String(b.updated_at).localeCompare(String(a.updated_at));
      });

    const merged: Array<{ key: string; title: string; body: string; tags: string[] }> = [];
    const seen = new Set<string>();

    for (const r of sorted) {
      const k = safeTrim(r.key);
      if (!k) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push({ key: k, title: safeTrim(r.title) || k, body: safeTrim(r.body), tags: Array.isArray(r.tags) ? r.tags : [] });
    }

    for (const f of fallback) {
      if (seen.has(f.key)) continue;
      seen.add(f.key);
      merged.push(f);
    }

    const lines: string[] = [];
    lines.push("IslaPOS Feature Registry (use this as the authoritative list of what the app can do):");
    if (restaurantId) lines.push(`Restaurant scope: ${restaurantId}`);
    for (const it of merged) {
      lines.push(`- [${it.key}] ${it.title}: ${it.body}`);
    }
    lines.push("If a user asks about a feature not listed, ask a clarifying question and suggest the closest existing feature.");

    return { text: lines.join("\n"), error: null as Error | null };
  } catch (e) {
    const fallback = builtInFeatureRegistry();
    const lines: string[] = [];
    lines.push("IslaPOS Feature Registry (fallback):");
    for (const it of fallback) {
      lines.push(`- [${it.key}] ${it.title}: ${it.body}`);
    }
    return { text: lines.join("\n"), error: e instanceof Error ? e : new Error("Failed") };
  }
}
