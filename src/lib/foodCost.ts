import { supabase } from "@/lib/supabaseClient";

export type IngredientRow = {
  id: string;
  restaurant_id: string;
  name: string;
  unit: string;
  is_active: boolean;
  created_at: string;
};

export type RecipeLineRow = {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  ingredient_id: string;
  qty: number;
  created_at: string;
};

export type PurchaseRow = {
  id: string;
  restaurant_id: string;
  ingredient_id: string;
  purchased_at: string;
  vendor: string | null;
  qty: number;
  total_cost: number;
  created_by_user_id: string | null;
  created_at: string;
};

export type CountRow = {
  id: string;
  restaurant_id: string;
  ingredient_id: string;
  counted_at: string;
  qty: number;
  created_by_user_id: string | null;
  created_at: string;
};

export type FoodCostIngredientReportRow = {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;

  avg_unit_cost: number | null;

  theoretical_usage_qty: number;
  theoretical_cost: number;

  begin_qty: number | null;
  end_qty: number | null;
  purchases_qty: number;
  purchases_cost: number;
  actual_usage_qty: number | null;
  actual_cost: number | null;

  variance_qty: number | null;
  variance_cost: number | null;
};

export type FoodCostReport = {
  startIso: string;
  endIso: string;
  rows: FoodCostIngredientReportRow[];
  totals: {
    theoretical_cost: number;
    actual_cost: number | null;
    purchases_cost: number;
  };
};

function clampLimit(n: number, min = 1, max = 5000) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export async function listIngredients(restaurantId: string) {
  return supabase
    .from("ingredients")
    .select("id, restaurant_id, name, unit, is_active, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true })
    .returns<IngredientRow[]>();
}

export async function createIngredient(input: { restaurant_id: string; name: string; unit: string; is_active?: boolean }) {
  const payload = {
    restaurant_id: input.restaurant_id,
    name: input.name.trim(),
    unit: input.unit.trim() || "each",
    is_active: input.is_active ?? true,
  };

  return supabase.from("ingredients").insert(payload).select("*").maybeSingle<IngredientRow>();
}

export async function setIngredientActive(ingredientId: string, is_active: boolean) {
  return supabase.from("ingredients").update({ is_active }).eq("id", ingredientId).select("id").maybeSingle<{ id: string }>();
}

export async function listRecipeLinesForRestaurant(restaurantId: string) {
  return supabase
    .from("menu_item_recipe_lines")
    .select("id, restaurant_id, menu_item_id, ingredient_id, qty, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true })
    .returns<RecipeLineRow[]>();
}

export async function upsertRecipeLine(input: {
  restaurant_id: string;
  menu_item_id: string;
  ingredient_id: string;
  qty: number;
}) {
  const payload = {
    restaurant_id: input.restaurant_id,
    menu_item_id: input.menu_item_id,
    ingredient_id: input.ingredient_id,
    qty: Number(input.qty),
  };

  return supabase
    .from("menu_item_recipe_lines")
    .upsert(payload, { onConflict: "menu_item_id,ingredient_id" })
    .select("*")
    .maybeSingle<RecipeLineRow>();
}

export async function deleteRecipeLine(id: string) {
  return supabase.from("menu_item_recipe_lines").delete().eq("id", id);
}

export async function createIngredientPurchase(input: {
  restaurant_id: string;
  ingredient_id: string;
  purchased_at: string;
  vendor?: string | null;
  qty: number;
  total_cost: number;
  created_by_user_id?: string | null;
}) {
  const payload = {
    restaurant_id: input.restaurant_id,
    ingredient_id: input.ingredient_id,
    purchased_at: input.purchased_at,
    vendor: input.vendor?.trim() || null,
    qty: Number(input.qty),
    total_cost: Number(input.total_cost),
    created_by_user_id: input.created_by_user_id ?? null,
  };

  return supabase.from("ingredient_purchases").insert(payload).select("*").maybeSingle<PurchaseRow>();
}

export async function listIngredientPurchases(
  restaurantId: string,
  opts?: { since?: string; until?: string; limit?: number },
) {
  let q = supabase
    .from("ingredient_purchases")
    .select("id, restaurant_id, ingredient_id, purchased_at, vendor, qty, total_cost, created_by_user_id, created_at")
    .eq("restaurant_id", restaurantId);

  if (opts?.since) q = q.gte("purchased_at", opts.since);
  if (opts?.until) q = q.lte("purchased_at", opts.until);

  const limit = clampLimit(opts?.limit ?? 200, 1, 5000);
  return q.order("purchased_at", { ascending: false }).limit(limit).returns<PurchaseRow[]>();
}

export async function createIngredientCount(input: {
  restaurant_id: string;
  ingredient_id: string;
  counted_at: string;
  qty: number;
  created_by_user_id?: string | null;
}) {
  const payload = {
    restaurant_id: input.restaurant_id,
    ingredient_id: input.ingredient_id,
    counted_at: input.counted_at,
    qty: Number(input.qty),
    created_by_user_id: input.created_by_user_id ?? null,
  };

  return supabase.from("ingredient_counts").insert(payload).select("*").maybeSingle<CountRow>();
}

export async function listIngredientCounts(
  restaurantId: string,
  opts?: { since?: string; until?: string; limit?: number },
) {
  let q = supabase
    .from("ingredient_counts")
    .select("id, restaurant_id, ingredient_id, counted_at, qty, created_by_user_id, created_at")
    .eq("restaurant_id", restaurantId);

  if (opts?.since) q = q.gte("counted_at", opts.since);
  if (opts?.until) q = q.lte("counted_at", opts.until);

  const limit = clampLimit(opts?.limit ?? 200, 1, 5000);
  return q.order("counted_at", { ascending: false }).limit(limit).returns<CountRow[]>();
}

async function getLatestCountAtOrBefore(restaurantId: string, cutoffIso: string) {
  const res = await supabase
    .from("ingredient_counts")
    .select("ingredient_id, counted_at, qty")
    .eq("restaurant_id", restaurantId)
    .lte("counted_at", cutoffIso)
    .order("counted_at", { ascending: false })
    .limit(5000)
    .returns<Array<{ ingredient_id: string; counted_at: string; qty: number }>>();

  if (res.error) return { data: null as Record<string, { counted_at: string; qty: number }> | null, error: res.error };

  const map: Record<string, { counted_at: string; qty: number }> = {};
  for (const r of res.data ?? []) {
    if (!r.ingredient_id) continue;
    if (map[r.ingredient_id]) continue;
    map[r.ingredient_id] = { counted_at: r.counted_at, qty: Number(r.qty ?? 0) };
  }

  return { data: map, error: null as Error | null };
}

export async function computeFoodCostReport(
  restaurantId: string,
  opts: {
    startIso: string;
    endIso: string;
  },
): Promise<{ data: FoodCostReport | null; error: Error | null }> {
  try {
    const startIso = opts.startIso;
    const endIso = opts.endIso;

    const [ingredientsRes, recipeRes, purchasesRes, beginCountsRes, endCountsRes, orderItemsRes] = await Promise.all([
      listIngredients(restaurantId),
      listRecipeLinesForRestaurant(restaurantId),
      listIngredientPurchases(restaurantId, { since: startIso, until: endIso, limit: 5000 }),
      getLatestCountAtOrBefore(restaurantId, startIso),
      getLatestCountAtOrBefore(restaurantId, endIso),
      supabase
        .from("order_items")
        .select("menu_item_id, qty, order:orders!inner(id, restaurant_id, status, created_at)")
        .eq("order.restaurant_id", restaurantId)
        .eq("order.status", "paid")
        .gte("order.created_at", startIso)
        .lte("order.created_at", endIso)
        .returns<
          Array<{
            menu_item_id: string;
            qty: number;
            order: { id: string; restaurant_id: string; status: string; created_at: string } | null;
          }>
        >(),
    ]);

    if (ingredientsRes.error) throw ingredientsRes.error;
    if (recipeRes.error) throw recipeRes.error;
    if (purchasesRes.error) throw purchasesRes.error;
    if (beginCountsRes.error) throw beginCountsRes.error;
    if (endCountsRes.error) throw endCountsRes.error;
    if (orderItemsRes.error) throw orderItemsRes.error;

    const ingredients = (ingredientsRes.data ?? []).filter((i) => i.is_active);
    const recipeLines = recipeRes.data ?? [];
    const purchases = purchasesRes.data ?? [];
    const beginCounts = beginCountsRes.data ?? {};
    const endCounts = endCountsRes.data ?? {};

    const soldQtyByMenuItemId: Record<string, number> = {};
    for (const r of orderItemsRes.data ?? []) {
      if (!r?.menu_item_id) continue;
      const qty = Number(r.qty ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      soldQtyByMenuItemId[r.menu_item_id] = (soldQtyByMenuItemId[r.menu_item_id] ?? 0) + qty;
    }

    const recipeByMenuItemId: Record<string, RecipeLineRow[]> = {};
    for (const rl of recipeLines) {
      recipeByMenuItemId[rl.menu_item_id] = recipeByMenuItemId[rl.menu_item_id] ?? [];
      recipeByMenuItemId[rl.menu_item_id].push(rl);
    }

    const purchasesByIngredientId: Record<string, { qty: number; cost: number }> = {};
    for (const p of purchases) {
      const qty = Number(p.qty ?? 0);
      const cost = Number(p.total_cost ?? 0);
      if (!p.ingredient_id) continue;
      if (!Number.isFinite(qty) || qty <= 0) continue;
      if (!Number.isFinite(cost) || cost < 0) continue;
      purchasesByIngredientId[p.ingredient_id] = purchasesByIngredientId[p.ingredient_id] ?? { qty: 0, cost: 0 };
      purchasesByIngredientId[p.ingredient_id].qty += qty;
      purchasesByIngredientId[p.ingredient_id].cost += cost;
    }

    const theoreticalUsageByIngredientId: Record<string, number> = {};
    for (const [menuItemId, soldQty] of Object.entries(soldQtyByMenuItemId)) {
      const lines = recipeByMenuItemId[menuItemId] ?? [];
      for (const l of lines) {
        const perItem = Number(l.qty ?? 0);
        if (!Number.isFinite(perItem) || perItem <= 0) continue;
        theoreticalUsageByIngredientId[l.ingredient_id] = (theoreticalUsageByIngredientId[l.ingredient_id] ?? 0) + soldQty * perItem;
      }
    }

    const rows: FoodCostIngredientReportRow[] = [];
    for (const ing of ingredients) {
      const purchasesAgg = purchasesByIngredientId[ing.id] ?? { qty: 0, cost: 0 };
      const avgUnitCost = purchasesAgg.qty > 0 ? purchasesAgg.cost / purchasesAgg.qty : null;

      const begin = beginCounts[ing.id]?.qty;
      const end = endCounts[ing.id]?.qty;
      const beginQty = typeof begin === "number" && Number.isFinite(begin) ? begin : null;
      const endQty = typeof end === "number" && Number.isFinite(end) ? end : null;

      const theoreticalUsageQty = Number(theoreticalUsageByIngredientId[ing.id] ?? 0);
      const theoreticalCost = avgUnitCost != null ? theoreticalUsageQty * avgUnitCost : 0;

      const actualUsageQty = beginQty != null && endQty != null ? beginQty + purchasesAgg.qty - endQty : null;
      const actualCost = actualUsageQty != null && avgUnitCost != null ? actualUsageQty * avgUnitCost : null;

      const varianceQty = actualUsageQty != null ? actualUsageQty - theoreticalUsageQty : null;
      const varianceCost = actualCost != null ? actualCost - theoreticalCost : null;

      rows.push({
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        unit: ing.unit,
        avg_unit_cost: avgUnitCost,
        theoretical_usage_qty: theoreticalUsageQty,
        theoretical_cost: theoreticalCost,
        begin_qty: beginQty,
        end_qty: endQty,
        purchases_qty: purchasesAgg.qty,
        purchases_cost: purchasesAgg.cost,
        actual_usage_qty: actualUsageQty,
        actual_cost: actualCost,
        variance_qty: varianceQty,
        variance_cost: varianceCost,
      });
    }

    rows.sort((a, b) => (b.actual_cost ?? b.theoretical_cost) - (a.actual_cost ?? a.theoretical_cost));

    const totals = {
      theoretical_cost: rows.reduce((sum, r) => sum + Number(r.theoretical_cost ?? 0), 0),
      actual_cost: rows.every((r) => r.actual_cost != null) ? rows.reduce((sum, r) => sum + Number(r.actual_cost ?? 0), 0) : null,
      purchases_cost: rows.reduce((sum, r) => sum + Number(r.purchases_cost ?? 0), 0),
    };

    return { data: { startIso, endIso, rows, totals }, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error("Failed") };
  }
}
