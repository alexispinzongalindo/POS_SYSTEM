"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import { getSetupContext, listMenuItems, type MenuItem } from "@/lib/setupData";
import { loadInventory, saveInventory, type InventoryState } from "@/lib/inventory";

export default function AdminInventoryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [inv, setInv] = useState<InventoryState>({});

  const [search, setSearch] = useState("");

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

      const res = await listMenuItems(rid);
      if (cancelled) return;
      if (res.error) {
        setError(res.error.message);
        setLoading(false);
        return;
      }

      setItems((res.data ?? []).filter((it) => it.is_active));

      const loaded = loadInventory(rid);
      setInv(loaded);

      setLoading(false);
    }

    void load();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.name.toLowerCase().includes(q) || (it.sku ?? "").toLowerCase().includes(q));
  }, [items, search]);

  function persist(next: InventoryState) {
    if (!restaurantId) return;
    setInv(next);
    saveInventory(restaurantId, next);
  }

  function setTracked(itemId: string, tracked: boolean) {
    if (!restaurantId) return;
    setError(null);
    setSuccess(null);

    const prev = inv[itemId] ?? { tracked: false, stock: 0, updatedAt: new Date(0).toISOString() };
    const next: InventoryState = {
      ...inv,
      [itemId]: { ...prev, tracked, updatedAt: new Date().toISOString() },
    };

    persist(next);
  }

  function setStock(itemId: string, value: string) {
    if (!restaurantId) return;
    setError(null);
    setSuccess(null);

    const asNumber = Number(value);
    if (!Number.isFinite(asNumber)) return;

    const prev = inv[itemId] ?? { tracked: false, stock: 0, updatedAt: new Date(0).toISOString() };
    const next: InventoryState = {
      ...inv,
      [itemId]: { ...prev, stock: asNumber, updatedAt: new Date().toISOString() },
    };

    persist(next);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Track stock per item (stored on this device). Stock will decrement when tickets are marked paid.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
          >
            Back
          </button>
        </div>

        {/* {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null} */}

        {success ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            {success}
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Items</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Active restaurant: {restaurantId ?? "-"}</p>
            </div>

            <input
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 sm:w-72 dark:border-zinc-800 dark:bg-black"
              placeholder="Search items"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {filteredItems.length === 0 ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">No items found.</div>
            ) : (
              filteredItems.map((it) => {
                const state = inv[it.id] ?? { tracked: false, stock: 0, updatedAt: new Date(0).toISOString() };
                const low = state.tracked && Number(state.stock) <= 0;

                return (
                  <div
                    key={it.id}
                    className={`flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 ${
                      low ? "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20" : "border-zinc-200"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{it.name}</div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        {it.sku ? `SKU: ${it.sku}` : ""}
                        {it.barcode ? ` • Barcode: ${it.barcode}` : ""}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={state.tracked}
                          onChange={(e) => setTracked(it.id, e.target.checked)}
                        />
                        Track
                      </label>

                      <input
                        inputMode="numeric"
                        disabled={!state.tracked}
                        value={String(state.stock)}
                        onChange={(e) => setStock(it.id, e.target.value)}
                        className="h-9 w-28 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 disabled:opacity-60 dark:border-zinc-800 dark:bg-black"
                      />

                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        {state.tracked ? (low ? "Out of stock" : "In stock") : "Not tracked"}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
