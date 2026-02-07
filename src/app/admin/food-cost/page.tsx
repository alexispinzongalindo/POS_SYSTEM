"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { useMarketingLang } from "@/lib/useMarketingLang";
import {
  computeFoodCostReport,
  createIngredient,
  createIngredientCount,
  createIngredientPurchase,
  deleteRecipeLine,
  listIngredientCounts,
  listIngredientPurchases,
  listIngredients,
  listRecipeLinesForRestaurant,
  setIngredientActive,
  upsertRecipeLine,
  type CountRow,
  type FoodCostReport,
  type IngredientRow,
  type PurchaseRow,
  type RecipeLineRow,
} from "@/lib/foodCost";
import { getSetupContext, listMenuItems, type MenuItem } from "@/lib/setupData";

function startOfDayIso(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

function addDays(d: Date, delta: number) {
  return new Date(d.getTime() + delta * 24 * 60 * 60 * 1000);
}

export default function AdminFoodCostPage() {
  const router = useRouter();
  const { lang } = useMarketingLang();
  const isEs = lang === "es";
  const t = {
    loading: isEs ? "Cargando…" : "Loading…",
    failedLoad: isEs ? "No se pudo cargar" : "Failed to load",
    failedComputeReport: isEs ? "No se pudo calcular el reporte" : "Failed to compute report",
    ingredientAdded: isEs ? "Ingrediente agregado." : "Ingredient added.",
    failedAddIngredient: isEs ? "No se pudo agregar el ingrediente" : "Failed to add ingredient",
    failed: isEs ? "Falló" : "Failed",
    purchaseAdded: isEs ? "Compra agregada." : "Purchase added.",
    failedAddPurchase: isEs ? "No se pudo agregar la compra" : "Failed to add purchase",
    countSaved: isEs ? "Conteo guardado." : "Count saved.",
    failedSaveCount: isEs ? "No se pudo guardar el conteo" : "Failed to save count",
    recipeLineSaved: isEs ? "Línea de receta guardada." : "Recipe line saved.",
    failedSaveRecipe: isEs ? "No se pudo guardar la línea de receta" : "Failed to save recipe line",
    failedDelete: isEs ? "No se pudo eliminar" : "Failed to delete",
    title: isEs ? "Costo de alimentos" : "Food Cost",
    subtitle: isEs
      ? "Costo promedio ponderado por ingrediente. Uso real = Inicio + Compras − Final. Uso teórico = ventas × recetas."
      : "Ingredient-level weighted average cost. Actual usage = Begin + Purchases − End. Theoretical usage = sales × recipes.",
    back: isEs ? "← Volver" : "Back",
    report: isEs ? "Reporte" : "Report",
    restaurantLabel: isEs ? "Restaurante" : "Restaurant",
    today: isEs ? "Hoy" : "Today",
    days7: isEs ? "7 días" : "7 days",
    days30: isEs ? "30 días" : "30 days",
    computing: isEs ? "Calculando..." : "Computing...",
    noData: isEs
      ? "Aún no hay datos. Agrega ingredientes, recetas, compras y dos conteos (inicio/fin) para calcular el uso real."
      : "No data yet. Add ingredients, recipes, purchases, and two counts (begin/end) to compute actual usage.",
    ingredient: isEs ? "Ingrediente" : "Ingredient",
    unit: isEs ? "Unidad" : "Unit",
    avgCost: isEs ? "Costo prom." : "Avg cost",
    theoUsage: isEs ? "Uso teórico" : "Theo usage",
    actualUsage: isEs ? "Uso real" : "Actual usage",
    variance: isEs ? "Variación" : "Variance",
    theoCost: isEs ? "Costo teórico" : "Theo cost",
    actualCost: isEs ? "Costo real" : "Actual cost",
    totals: isEs ? "Totales" : "Totals",
    quickAdd: isEs ? "Agregar rápido" : "Quick add",
    ingredientSection: isEs ? "Ingrediente" : "Ingredient",
    ingredientName: isEs ? "Nombre del ingrediente" : "Ingredient name",
    unitHint: isEs ? "Unidad (lb, oz, unidad)" : "Unit (lb, oz, each)",
    addIngredient: isEs ? "Agregar ingrediente" : "Add ingredient",
    purchase: isEs ? "Compra" : "Purchase",
    selectIngredient: isEs ? "Selecciona ingrediente" : "Select ingredient",
    qtyPurchased: isEs ? "Cantidad comprada" : "Qty purchased",
    totalCost: isEs ? "Costo total ($)" : "Total cost ($)",
    vendorOptional: isEs ? "Proveedor (opcional)" : "Vendor (optional)",
    addPurchase: isEs ? "Agregar compra" : "Add purchase",
    inventoryCount: isEs ? "Conteo de inventario" : "Inventory count",
    qtyOnHand: isEs ? "Cantidad en mano (conteo)" : "Qty on hand (count)",
    saveCount: isEs ? "Guardar conteo" : "Save count",
    ingredientsTitle: isEs ? "Ingredientes" : "Ingredients",
    noIngredients: isEs ? "Sin ingredientes." : "No ingredients yet.",
    unitLabel: isEs ? "Unidad" : "Unit",
    active: isEs ? "Activo" : "Active",
    recipeBuilder: isEs ? "Constructor de recetas" : "Recipe builder",
    selectMenuItem: isEs ? "Selecciona un platillo" : "Select menu item",
    menuItemFallback: isEs ? "Platillo" : "Menu item",
    recipeLabel: isEs ? "receta" : "recipe",
    ingredientLabel: isEs ? "Ingrediente" : "Ingredient",
    qtyPerItem: isEs ? "Cantidad por platillo vendido" : "Qty per menu item sold",
    qtyPerItemPlaceholder: isEs ? "Cantidad por platillo" : "Qty per item",
    addUpdateRecipeLine: isEs ? "Agregar / actualizar línea de receta" : "Add / update recipe line",
    noRecipeLines: isEs ? "Sin líneas de receta." : "No recipe lines yet.",
    remove: isEs ? "Eliminar" : "Remove",
    selectMenuItemHint: isEs ? "Selecciona un platillo para agregar ingredientes." : "Select a menu item to add ingredient lines.",
    recentPurchases: isEs ? "Compras recientes" : "Recent purchases",
    noPurchases: isEs ? "Sin compras." : "No purchases yet.",
    recentCounts: isEs ? "Conteos recientes" : "Recent counts",
    noCounts: isEs ? "Sin conteos." : "No counts yet.",
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [recipeLines, setRecipeLines] = useState<RecipeLineRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [counts, setCounts] = useState<CountRow[]>([]);

  const [range, setRange] = useState<"today" | "7d" | "30d">("today");
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<FoodCostReport | null>(null);

  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientUnit, setNewIngredientUnit] = useState("each");

  const [purchaseIngredientId, setPurchaseIngredientId] = useState<string>("");
  const [purchaseQty, setPurchaseQty] = useState("1");
  const [purchaseTotalCost, setPurchaseTotalCost] = useState("0");
  const [purchaseVendor, setPurchaseVendor] = useState("");

  const [countIngredientId, setCountIngredientId] = useState<string>("");
  const [countQty, setCountQty] = useState("0");

  const [recipeMenuItemId, setRecipeMenuItemId] = useState<string>("");
  const [recipeIngredientId, setRecipeIngredientId] = useState<string>("");
  const [recipeQty, setRecipeQty] = useState("0");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setSuccess(null);

      const ctx = await getSetupContext();
      if (cancelled) return;

      if (ctx.error || !ctx.session) {
        router.replace("/login");
        return;
      }

      const role = (ctx.session.user.app_metadata as { role?: string } | undefined)?.role ?? null;
      if (role === "cashier" || role === "kitchen" || role === "maintenance" || role === "driver" || role === "security") {
        router.replace("/pos");
        return;
      }

      const rid = (ctx.config?.restaurant_id as string | null) ?? null;
      if (!rid) {
        router.replace("/setup/restaurant");
        return;
      }

      setRestaurantId(rid);
      setUserId(ctx.session.user.id);

      const [ingsRes, itemsRes, recipeRes, purchasesRes, countsRes] = await Promise.all([
        listIngredients(rid),
        listMenuItems(rid),
        listRecipeLinesForRestaurant(rid),
        listIngredientPurchases(rid, { limit: 200 }),
        listIngredientCounts(rid, { limit: 200 }),
      ]);

      if (cancelled) return;
      if (ingsRes.error) throw ingsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (recipeRes.error) throw recipeRes.error;
      if (purchasesRes.error) throw purchasesRes.error;
      if (countsRes.error) throw countsRes.error;

      setIngredients(ingsRes.data ?? []);
      setMenuItems((itemsRes.data ?? []).filter((it) => it.is_active));
      setRecipeLines(recipeRes.data ?? []);
      setPurchases(purchasesRes.data ?? []);
      setCounts(countsRes.data ?? []);

      setLoading(false);
    }

    void load().catch((e) => {
      setError(e instanceof Error ? e.message : t.failedLoad);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const rangeStartEnd = useMemo(() => {
    const now = new Date();
    const end = now;
    const start =
      range === "today" ? startOfDayIso(now) : range === "7d" ? startOfDayIso(addDays(now, -7)) : startOfDayIso(addDays(now, -30));
    return { startIso: start, endIso: end.toISOString() };
  }, [range]);

  useEffect(() => {
    if (!restaurantId) return;
    if (loading) return;

    const t = window.setTimeout(() => {
      void (async () => {
        setReportLoading(true);
        setError(null);
        try {
          const r = await computeFoodCostReport(restaurantId, rangeStartEnd);
          if (r.error) throw r.error;
          setReport(r.data ?? null);
        } catch (e) {
          setReport(null);
          setError(e instanceof Error ? e.message : t.failedComputeReport);
        } finally {
          setReportLoading(false);
        }
      })();
    }, 150);

    return () => window.clearTimeout(t);
  }, [loading, rangeStartEnd, restaurantId]);

  const menuItemById = useMemo(() => {
    const map: Record<string, MenuItem> = {};
    for (const it of menuItems) map[it.id] = it;
    return map;
  }, [menuItems]);

  const ingredientById = useMemo(() => {
    const map: Record<string, IngredientRow> = {};
    for (const ing of ingredients) map[ing.id] = ing;
    return map;
  }, [ingredients]);

  const recipeLinesForSelectedMenuItem = useMemo(() => {
    if (!recipeMenuItemId) return [] as RecipeLineRow[];
    return recipeLines.filter((l) => l.menu_item_id === recipeMenuItemId);
  }, [recipeLines, recipeMenuItemId]);

  async function reloadBaseData(rid: string) {
    const [ingsRes, recipeRes, purchasesRes, countsRes] = await Promise.all([
      listIngredients(rid),
      listRecipeLinesForRestaurant(rid),
      listIngredientPurchases(rid, { limit: 200 }),
      listIngredientCounts(rid, { limit: 200 }),
    ]);

    if (ingsRes.error) throw ingsRes.error;
    if (recipeRes.error) throw recipeRes.error;
    if (purchasesRes.error) throw purchasesRes.error;
    if (countsRes.error) throw countsRes.error;

    setIngredients(ingsRes.data ?? []);
    setRecipeLines(recipeRes.data ?? []);
    setPurchases(purchasesRes.data ?? []);
    setCounts(countsRes.data ?? []);
  }

  async function onAddIngredient() {
    if (!restaurantId) return;
    const name = newIngredientName.trim();
    const unit = newIngredientUnit.trim() || "each";
    if (!name) return;

    setError(null);
    setSuccess(null);
    try {
      const res = await createIngredient({ restaurant_id: restaurantId, name, unit });
      if (res.error) throw res.error;
      setNewIngredientName("");
      setNewIngredientUnit("each");
      await reloadBaseData(restaurantId);
      setSuccess(t.ingredientAdded);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failedAddIngredient);
    }
  }

  async function onToggleIngredientActive(id: string, next: boolean) {
    setError(null);
    setSuccess(null);
    try {
      const res = await setIngredientActive(id, next);
      if (res.error) throw res.error;
      if (restaurantId) await reloadBaseData(restaurantId);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failed);
    }
  }

  async function onAddPurchase() {
    if (!restaurantId) return;
    if (!userId) return;

    const ingredientId = purchaseIngredientId;
    const qty = Number(purchaseQty);
    const totalCost = Number(purchaseTotalCost);
    if (!ingredientId) return;
    if (!Number.isFinite(qty) || qty <= 0) return;
    if (!Number.isFinite(totalCost) || totalCost < 0) return;

    setError(null);
    setSuccess(null);
    try {
      const res = await createIngredientPurchase({
        restaurant_id: restaurantId,
        ingredient_id: ingredientId,
        purchased_at: new Date().toISOString(),
        qty,
        total_cost: totalCost,
        vendor: purchaseVendor.trim() || null,
        created_by_user_id: userId,
      });
      if (res.error) throw res.error;
      setPurchaseQty("1");
      setPurchaseTotalCost("0");
      setPurchaseVendor("");
      await reloadBaseData(restaurantId);
      setSuccess(t.purchaseAdded);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failedAddPurchase);
    }
  }

  async function onAddCount() {
    if (!restaurantId) return;
    if (!userId) return;

    const ingredientId = countIngredientId;
    const qty = Number(countQty);
    if (!ingredientId) return;
    if (!Number.isFinite(qty)) return;

    setError(null);
    setSuccess(null);
    try {
      const res = await createIngredientCount({
        restaurant_id: restaurantId,
        ingredient_id: ingredientId,
        counted_at: new Date().toISOString(),
        qty,
        created_by_user_id: userId,
      });
      if (res.error) throw res.error;
      setCountQty("0");
      await reloadBaseData(restaurantId);
      setSuccess(t.countSaved);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failedSaveCount);
    }
  }

  async function onUpsertRecipeLine() {
    if (!restaurantId) return;

    const menuItemId = recipeMenuItemId;
    const ingredientId = recipeIngredientId;
    const qty = Number(recipeQty);
    if (!menuItemId || !ingredientId) return;
    if (!Number.isFinite(qty) || qty <= 0) return;

    setError(null);
    setSuccess(null);
    try {
      const res = await upsertRecipeLine({ restaurant_id: restaurantId, menu_item_id: menuItemId, ingredient_id: ingredientId, qty });
      if (res.error) throw res.error;
      setRecipeQty("0");
      await reloadBaseData(restaurantId);
      setSuccess(t.recipeLineSaved);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failedSaveRecipe);
    }
  }

  async function onDeleteRecipeLine(id: string) {
    if (!restaurantId) return;

    setError(null);
    setSuccess(null);
    try {
      const res = await deleteRecipeLine(id);
      if (res.error) throw res.error;
      await reloadBaseData(restaurantId);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failedDelete);
    }
  }

  if (loading) {
    return (
      <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
            <p className="text-sm text-[var(--mp-muted)]">{t.subtitle}</p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-5 text-sm font-semibold hover:bg-white"
          >
            {t.back}
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {success}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm lg:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{t.report}</h2>
                <div className="mt-1 text-sm text-[var(--mp-muted)]">
                  {t.restaurantLabel}: {restaurantId ?? "-"}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setRange("today")}
                  className={`inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-semibold ${
                    range === "today"
                      ? "border-[var(--mp-primary)] bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                      : "border-[var(--mp-border)] bg-white hover:bg-white"
                  }`}
                >
                  {t.today}
                </button>
                <button
                  onClick={() => setRange("7d")}
                  className={`inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-semibold ${
                    range === "7d"
                      ? "border-[var(--mp-primary)] bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                      : "border-[var(--mp-border)] bg-white hover:bg-white"
                  }`}
                >
                  {t.days7}
                </button>
                <button
                  onClick={() => setRange("30d")}
                  className={`inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-semibold ${
                    range === "30d"
                      ? "border-[var(--mp-primary)] bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                      : "border-[var(--mp-border)] bg-white hover:bg-white"
                  }`}
                >
                  {t.days30}
                </button>
              </div>
            </div>

            {reportLoading ? <div className="mt-4 text-sm text-[var(--mp-muted)]">{t.computing}</div> : null}

            {!report || report.rows.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm text-[var(--mp-muted)]">
                {t.noData}
              </div>
            ) : (
              <div className="mt-5 overflow-auto rounded-2xl border border-[var(--mp-border)] bg-white">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-[var(--mp-border)] bg-white">
                    <tr className="text-left text-xs text-[var(--mp-muted)]">
                      <th className="px-4 py-3">{t.ingredient}</th>
                      <th className="px-4 py-3">{t.unit}</th>
                      <th className="px-4 py-3">{t.avgCost}</th>
                      <th className="px-4 py-3">{t.theoUsage}</th>
                      <th className="px-4 py-3">{t.actualUsage}</th>
                      <th className="px-4 py-3">{t.variance}</th>
                      <th className="px-4 py-3">{t.theoCost}</th>
                      <th className="px-4 py-3">{t.actualCost}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--mp-border)]">
                    {report.rows.map((r) => (
                      <tr key={r.ingredient_id}>
                        <td className="px-4 py-3 font-medium">{r.ingredient_name}</td>
                        <td className="px-4 py-3 text-[var(--mp-muted)]">{r.unit}</td>
                        <td className="px-4 py-3 tabular-nums">{r.avg_unit_cost == null ? "-" : `$${r.avg_unit_cost.toFixed(4)}`}</td>
                        <td className="px-4 py-3 tabular-nums">{r.theoretical_usage_qty.toFixed(3)}</td>
                        <td className="px-4 py-3 tabular-nums">{r.actual_usage_qty == null ? "-" : r.actual_usage_qty.toFixed(3)}</td>
                        <td className="px-4 py-3 tabular-nums">{r.variance_qty == null ? "-" : r.variance_qty.toFixed(3)}</td>
                        <td className="px-4 py-3 tabular-nums">${r.theoretical_cost.toFixed(2)}</td>
                        <td className="px-4 py-3 tabular-nums">{r.actual_cost == null ? "-" : `$${r.actual_cost.toFixed(2)}`}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-[var(--mp-border)] bg-white">
                    <tr>
                      <td className="px-4 py-3 text-xs font-semibold text-[var(--mp-muted)]" colSpan={6}>
                        {t.totals}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold tabular-nums">${report.totals.theoretical_cost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-semibold tabular-nums">
                        {report.totals.actual_cost == null ? "-" : `$${report.totals.actual_cost.toFixed(2)}`}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">{t.quickAdd}</h2>
            <div className="mt-4 grid gap-4">
              <div className="rounded-2xl border border-[var(--mp-border)] bg-white p-4">
                <div className="text-xs font-semibold text-[var(--mp-muted)]">{t.ingredientSection}</div>
                <div className="mt-2 grid gap-2">
                  <div className="text-xs text-[var(--mp-muted)]">{t.ingredientName}</div>
                  <input
                    value={newIngredientName}
                    onChange={(e) => setNewIngredientName(e.target.value)}
                    placeholder={isEs ? "Res" : "Beef"}
                    className="h-10 w-full rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm outline-none focus:border-[var(--mp-primary)]"
                  />
                  <div className="text-xs text-[var(--mp-muted)]">{t.unitHint}</div>
                  <input
                    value={newIngredientUnit}
                    onChange={(e) => setNewIngredientUnit(e.target.value)}
                    placeholder="lb"
                    className="h-10 w-full rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm outline-none focus:border-[var(--mp-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => void onAddIngredient()}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
                  >
                    {t.addIngredient}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--mp-border)] bg-white p-4">
                <div className="text-xs font-semibold text-[var(--mp-muted)]">{t.purchase}</div>
                <div className="mt-2 grid gap-2">
                  <div className="text-xs text-[var(--mp-muted)]">{t.ingredientLabel}</div>
                  <select
                    value={purchaseIngredientId}
                    onChange={(e) => setPurchaseIngredientId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm outline-none focus:border-[var(--mp-primary)]"
                  >
                    <option value="">{t.selectIngredient}</option>
                    {ingredients
                      .filter((i) => i.is_active)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.unit})
                        </option>
                      ))}
                  </select>
                  <div className="text-xs text-[var(--mp-muted)]">{t.qtyPurchased}</div>
                  <input
                    inputMode="decimal"
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                    placeholder={isEs ? "Cant." : "Qty"}
                    className="h-10 w-full rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm outline-none focus:border-[var(--mp-primary)]"
                  />
                  <div className="text-xs text-[var(--mp-muted)]">{t.totalCost}</div>
                  <input
                    inputMode="decimal"
                    value={purchaseTotalCost}
                    onChange={(e) => setPurchaseTotalCost(e.target.value)}
                    placeholder={isEs ? "Costo total" : "Total cost"}
                    className="h-10 w-full rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm outline-none focus:border-[var(--mp-primary)]"
                  />
                  <div className="text-xs text-[var(--mp-muted)]">{t.vendorOptional}</div>
                  <input
                    value={purchaseVendor}
                    onChange={(e) => setPurchaseVendor(e.target.value)}
                    placeholder={t.vendorOptional}
                    className="h-10 w-full rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm outline-none focus:border-[var(--mp-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => void onAddPurchase()}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm font-semibold hover:bg-white"
                  >
                    {t.addPurchase}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--mp-border)] bg-white p-4">
                <div className="text-xs font-semibold text-[var(--mp-muted)]">{t.inventoryCount}</div>
                <div className="mt-2 grid gap-2">
                  <div className="text-xs text-[var(--mp-muted)]">{t.ingredientLabel}</div>
                  <select
                    value={countIngredientId}
                    onChange={(e) => setCountIngredientId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm outline-none focus:border-[var(--mp-primary)]"
                  >
                    <option value="">{t.selectIngredient}</option>
                    {ingredients
                      .filter((i) => i.is_active)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.unit})
                        </option>
                      ))}
                  </select>
                  <div className="text-xs text-[var(--mp-muted)]">{t.qtyOnHand}</div>
                  <input
                    inputMode="decimal"
                    value={countQty}
                    onChange={(e) => setCountQty(e.target.value)}
                    placeholder={isEs ? "Cant. en mano" : "Qty on hand"}
                    className="h-10 w-full rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm outline-none focus:border-[var(--mp-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => void onAddCount()}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm font-semibold hover:bg-white"
                  >
                    {t.saveCount}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">{t.ingredientsTitle}</h2>
            <div className="mt-4 flex flex-col gap-2">
              {ingredients.length === 0 ? (
                <div className="text-sm text-[var(--mp-muted)]">{t.noIngredients}</div>
              ) : (
                ingredients.map((ing) => (
                  <div
                    key={ing.id}
                    className="flex flex-col gap-2 rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{ing.name}</div>
                      <div className="text-xs text-[var(--mp-muted)]">
                        {t.unitLabel}: {ing.unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={ing.is_active}
                          onChange={(e) => void onToggleIngredientActive(ing.id, e.target.checked)}
                        />
                        {t.active}
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">{t.recipeBuilder}</h2>
            <div className="mt-4 grid gap-3">
              <select
                value={recipeMenuItemId}
                onChange={(e) => setRecipeMenuItemId(e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm outline-none focus:border-[var(--mp-primary)]"
              >
                <option value="">{t.selectMenuItem}</option>
                {menuItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </select>

              {recipeMenuItemId ? (
                <div className="rounded-2xl border border-[var(--mp-border)] bg-white p-4">
                  <div className="text-xs font-semibold text-[var(--mp-muted)]">
                    {(menuItemById[recipeMenuItemId]?.name ?? t.menuItemFallback) + ` ${t.recipeLabel}`}
                  </div>

                  <div className="mt-3 grid gap-2">
                    <div className="text-xs text-[var(--mp-muted)]">{t.ingredientLabel}</div>
                    <select
                      value={recipeIngredientId}
                      onChange={(e) => setRecipeIngredientId(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm outline-none focus:border-[var(--mp-primary)]"
                    >
                      <option value="">{t.selectIngredient}</option>
                      {ingredients
                        .filter((i) => i.is_active)
                        .map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.unit})
                          </option>
                        ))}
                    </select>
                    <div className="text-xs text-[var(--mp-muted)]">{t.qtyPerItem}</div>
                    <input
                      inputMode="decimal"
                      value={recipeQty}
                      onChange={(e) => setRecipeQty(e.target.value)}
                      placeholder={t.qtyPerItemPlaceholder}
                      className="h-10 w-full rounded-xl border border-[var(--mp-border)] bg-white px-3 text-sm outline-none focus:border-[var(--mp-primary)]"
                    />
                    <button
                      type="button"
                      onClick={() => void onUpsertRecipeLine()}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)]"
                    >
                      {t.addUpdateRecipeLine}
                    </button>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    {recipeLinesForSelectedMenuItem.length === 0 ? (
                      <div className="text-sm text-[var(--mp-muted)]">{t.noRecipeLines}</div>
                    ) : (
                      recipeLinesForSelectedMenuItem.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {ingredientById[l.ingredient_id]?.name ?? t.ingredient}
                            </div>
                            <div className="text-xs text-[var(--mp-muted)]">{Number(l.qty).toFixed(4)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void onDeleteRecipeLine(l.id)}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white px-3 text-xs font-semibold hover:bg-white"
                          >
                            {t.remove}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-[var(--mp-muted)]">{t.selectMenuItemHint}</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">{t.recentPurchases}</h2>
            <div className="mt-4 flex flex-col gap-2">
              {purchases.length === 0 ? (
                <div className="text-sm text-[var(--mp-muted)]">{t.noPurchases}</div>
              ) : (
                purchases.slice(0, 20).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {ingredientById[p.ingredient_id]?.name ?? t.ingredient}
                      </div>
                      <div className="text-xs text-[var(--mp-muted)]">
                        {new Date(p.purchased_at).toLocaleString()} • {Number(p.qty).toFixed(3)} • ${Number(p.total_cost).toFixed(2)}
                        {p.vendor ? ` • ${p.vendor}` : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-7 shadow-sm">
            <h2 className="text-base font-semibold">{t.recentCounts}</h2>
            <div className="mt-4 flex flex-col gap-2">
              {counts.length === 0 ? (
                <div className="text-sm text-[var(--mp-muted)]">{t.noCounts}</div>
              ) : (
                counts.slice(0, 20).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {ingredientById[c.ingredient_id]?.name ?? t.ingredient}
                      </div>
                      <div className="text-xs text-[var(--mp-muted)]">{new Date(c.counted_at).toLocaleString()} • {Number(c.qty).toFixed(3)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
