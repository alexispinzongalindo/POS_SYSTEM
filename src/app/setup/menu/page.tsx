"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  addMenuCategory,
  addMenuItem,
  deleteMenuCategory,
  deleteMenuItem,
  getLocationByRestaurant,
  getSetupContext,
  getTaxConfigByRestaurant,
  listMenuCategories,
  listMenuItems,
  type MenuCategory,
  type MenuItem,
} from "@/lib/setupData";
import { setSetupComplete } from "@/lib/appConfig";

export default function SetupMenuPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);

  const [hasLocation, setHasLocation] = useState(false);
  const [hasTaxConfig, setHasTaxConfig] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("0.00");
  const [newItemCategoryId, setNewItemCategoryId] = useState<string | "">("");
  const [newItemSku, setNewItemSku] = useState("");
  const [newItemBarcode, setNewItemBarcode] = useState("");
  const [newItemDepartment, setNewItemDepartment] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemIsWeighted, setNewItemIsWeighted] = useState(false);

  const categoryOptions = useMemo(() => {
    const opts: Array<{ id: string; name: string }> = [{ id: "", name: "(No category)" }];
    for (const c of categories) {
      opts.push({ id: c.id, name: c.name });
    }
    return opts;
  }, [categories]);

  async function refresh(rid: string) {
    const cats = await listMenuCategories(rid);
    if (cats.error) throw cats.error;

    const its = await listMenuItems(rid);
    if (its.error) throw its.error;

    const [locationRes, taxRes] = await Promise.all([
      getLocationByRestaurant(rid),
      getTaxConfigByRestaurant(rid),
    ]);
    if (locationRes.error) throw locationRes.error;
    if (taxRes.error) throw taxRes.error;

    setCategories(cats.data ?? []);
    setItems(its.data ?? []);
    setHasLocation(!!locationRes.data);
    setHasTaxConfig(!!taxRes.data);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      const ctx = await getSetupContext();
      if (cancelled) return;

      if (ctx.error || !ctx.session) {
        router.replace("/login");
        return;
      }

      const role = (ctx.session.user.app_metadata as { role?: string } | undefined)?.role ?? null;
      if (role === "cashier") {
        router.replace("/pos");
        return;
      }

      const rid = (ctx.config?.restaurant_id as string | null) ?? null;
      if (!rid) {
        router.replace("/setup/restaurant");
        return;
      }

      setRestaurantId(rid);

      try {
        await refresh(rid);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load menu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!restaurantId) return;

    const name = newCategoryName.trim();
    if (!name) return;

    const res = await addMenuCategory({ restaurant_id: restaurantId, name });
    if (res.error) {
      setError(res.error.message);
      return;
    }

    setNewCategoryName("");
    await refresh(restaurantId);
  }

  async function onAddItem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!restaurantId) return;

    const name = newItemName.trim();
    if (!name) return;

    const price = Number(newItemPrice);
    if (!Number.isFinite(price) || price < 0) {
      setError("Price must be a valid number");
      return;
    }

    const categoryId = newItemCategoryId === "" ? null : newItemCategoryId;

    const res = await addMenuItem({
      restaurant_id: restaurantId,
      category_id: categoryId,
      name,
      price,
      sku: newItemSku,
      barcode: newItemBarcode,
      department: newItemDepartment,
      unit: newItemUnit,
      is_weighted: newItemIsWeighted,
    });
    if (res.error) {
      setError(res.error.message);
      return;
    }

    setNewItemName("");
    setNewItemPrice("0.00");
    setNewItemCategoryId("");
    setNewItemSku("");
    setNewItemBarcode("");
    setNewItemDepartment("");
    setNewItemUnit("");
    setNewItemIsWeighted(false);
    await refresh(restaurantId);
  }

  async function onDeleteCategory(categoryId: string) {
    setError(null);
    if (!restaurantId) return;

    const res = await deleteMenuCategory(categoryId);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    await refresh(restaurantId);
  }

  async function onDeleteItem(itemId: string) {
    setError(null);
    if (!restaurantId) return;

    const res = await deleteMenuItem(itemId);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    await refresh(restaurantId);
  }

  async function onFinish() {
    setError(null);

    if (!restaurantId) {
      router.replace("/setup/restaurant");
      return;
    }

    if (!hasLocation) {
      setError("Missing location. Please complete the Location step first.");
      router.push("/setup/location");
      return;
    }

    if (!hasTaxConfig) {
      setError("Missing tax settings. Please complete the Puerto Rico taxes step first.");
      router.push("/setup/taxes");
      return;
    }

    if (items.length === 0) {
      setError("Please add at least one menu item before finishing setup.");
      return;
    }

    const res = await setSetupComplete(true);
    if (res.error) {
      setError(res.error instanceof Error ? res.error.message : "Failed to mark setup complete");
      return;
    }

    router.replace("/admin");
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
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Setup: Products</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Add categories and products.</p>
          </div>
          <button
            onClick={() => router.push("/setup")}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
          >
            Back
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold">Categories</h2>

            <form onSubmit={onAddCategory} className="mt-4 flex gap-2">
              <input
                className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                placeholder="New category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                disabled={!newCategoryName.trim()}
              >
                Add
              </button>
            </form>

            <div className="mt-4 flex flex-col gap-2">
              {categories.length === 0 ? (
                <div className="text-sm text-zinc-600 dark:text-zinc-400">No categories yet.</div>
              ) : (
                categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    <div className="text-sm font-medium">{c.name}</div>
                    <button
                      onClick={() => onDeleteCategory(c.id)}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold">Items</h2>

            <form onSubmit={onAddItem} className="mt-4 flex flex-col gap-3">
              <input
                className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                placeholder="New product name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                  placeholder="Price"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  inputMode="decimal"
                />

                <select
                  className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                  value={newItemCategoryId}
                  onChange={(e) => setNewItemCategoryId(e.target.value)}
                >
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                  placeholder="SKU (optional)"
                  value={newItemSku}
                  onChange={(e) => setNewItemSku(e.target.value)}
                />
                <input
                  className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                  placeholder="Barcode (optional)"
                  value={newItemBarcode}
                  onChange={(e) => setNewItemBarcode(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                  placeholder="Department (optional)"
                  value={newItemDepartment}
                  onChange={(e) => setNewItemDepartment(e.target.value)}
                />
                <input
                  className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-black"
                  placeholder="Unit (optional, e.g. each, lb, oz)"
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                />
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={newItemIsWeighted}
                  onChange={(e) => setNewItemIsWeighted(e.target.checked)}
                />
                <span className="text-sm">Weighted product (sold by weight)</span>
              </label>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                disabled={!newItemName.trim()}
              >
                Add product
              </button>
            </form>

            <div className="mt-4 flex flex-col gap-2">
              {items.length === 0 ? (
                <div className="text-sm text-zinc-600 dark:text-zinc-400">No items yet.</div>
              ) : (
                items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    <div>
                      <div className="text-sm font-medium">{it.name}</div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">${it.price.toFixed(2)}</div>
                    </div>
                    <button
                      onClick={() => onDeleteItem(it.id)}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onFinish}
            disabled={!hasLocation || !hasTaxConfig || items.length === 0}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
          >
            Finish setup
          </button>
        </div>
      </div>
    </div>
  );
}
