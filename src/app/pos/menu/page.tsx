"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabaseClient";
import {
  addMenuCategory,
  addMenuItem,
  deleteMenuCategory,
  deleteMenuItem,
  getRestaurant,
  getSetupContext,
  listMenuCategories,
  listMenuItems,
  updateMenuCategory,
  updateMenuItem,
  type MenuCategory,
  type MenuItem,
} from "@/lib/setupData";

type Role = "owner" | "manager" | "cashier" | null;

export default function PosMenuManagerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("0.00");
  const [newItemCategoryId, setNewItemCategoryId] = useState<string | "">("");
  const [newItemSku, setNewItemSku] = useState("");
  const [newItemBarcode, setNewItemBarcode] = useState("");
  const [newItemDepartment, setNewItemDepartment] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemIsWeighted, setNewItemIsWeighted] = useState(false);
  const [newItemImageFile, setNewItemImageFile] = useState<File | null>(null);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState<string>("");

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState<string>("");
  const [editingItemDescription, setEditingItemDescription] = useState<string>("");
  const [editingItemPrice, setEditingItemPrice] = useState<string>("0.00");
  const [editingItemCategoryId, setEditingItemCategoryId] = useState<string | "">("");
  const [editingItemSku, setEditingItemSku] = useState<string>("");
  const [editingItemBarcode, setEditingItemBarcode] = useState<string>("");
  const [editingItemDepartment, setEditingItemDepartment] = useState<string>("");
  const [editingItemUnit, setEditingItemUnit] = useState<string>("");
  const [editingItemIsWeighted, setEditingItemIsWeighted] = useState<boolean>(false);
  const [editingItemIsActive, setEditingItemIsActive] = useState<boolean>(true);
  const [editingItemImageFile, setEditingItemImageFile] = useState<File | null>(null);
  const [editingItemImagePath, setEditingItemImagePath] = useState<string | null>(null);

  const canEdit = role === "owner" || role === "manager";

  function getMenuImageUrl(path: string) {
    const { data } = supabase.storage.from("menu").getPublicUrl(path);
    return data.publicUrl;
  }

  async function uploadMenuImage(params: {
    restaurantId: string;
    menuItemId: string;
    file: File;
  }): Promise<{ path: string } | { error: Error }> {
    const safe = params.file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${params.restaurantId}/items/${params.menuItemId}/${Date.now()}-${safe}`;
    const res = await supabase.storage
      .from("menu")
      .upload(path, params.file, { upsert: true, contentType: params.file.type || undefined });
    if (res.error) return { error: new Error(res.error.message) };
    return { path };
  }

  const categoryOptions = useMemo(() => {
    const opts: Array<{ id: string; name: string }> = [{ id: "", name: "(No category)" }];
    for (const c of categories) opts.push({ id: c.id, name: c.name });
    return opts;
  }, [categories]);

  async function refresh(rid: string) {
    const [catsRes, itemsRes] = await Promise.all([listMenuCategories(rid), listMenuItems(rid)]);
    if (catsRes.error) throw catsRes.error;
    if (itemsRes.error) throw itemsRes.error;
    setCategories(catsRes.data ?? []);
    setItems(itemsRes.data ?? []);
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

      const rawRole = (ctx.session.user.app_metadata as { role?: string } | undefined)?.role ?? null;
      const resolvedRole: Role = rawRole === "owner" || rawRole === "manager" || rawRole === "cashier" ? rawRole : null;
      setRole(resolvedRole);

      const rid = (ctx.config?.restaurant_id as string | null) ?? null;
      if (!rid) {
        router.replace("/setup/restaurant");
        return;
      }

      setRestaurantId(rid);

      if (resolvedRole === "cashier") {
        router.replace("/pos");
        return;
      }

      if (!resolvedRole) {
        const restaurantRes = await getRestaurant(rid);
        if (cancelled) return;
        if (restaurantRes.error) {
          setError(restaurantRes.error.message);
        } else if (restaurantRes.data?.owner_user_id === ctx.session.user.id) {
          setRole("owner");
        }
      }

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
    if (!restaurantId || !canEdit) return;
    setError(null);

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

  async function onSaveCategory() {
    if (!restaurantId || !canEdit) return;
    if (!editingCategoryId) return;
    setError(null);

    const name = editingCategoryName.trim();
    if (!name) return;

    const res = await updateMenuCategory({ id: editingCategoryId, name });
    if (res.error) {
      setError(res.error.message);
      return;
    }

    setEditingCategoryId(null);
    setEditingCategoryName("");
    await refresh(restaurantId);
  }

  async function onDeleteCategory(categoryId: string) {
    if (!restaurantId || !canEdit) return;
    setError(null);

    const res = await deleteMenuCategory(categoryId);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    await refresh(restaurantId);
  }

  async function onAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId || !canEdit) return;
    setError(null);

    const name = newItemName.trim();
    if (!name) return;

    const price = Number(newItemPrice);
    if (!Number.isFinite(price) || price < 0) {
      setError("Price must be a valid number");
      return;
    }

    const categoryId = newItemCategoryId === "" ? null : newItemCategoryId;

    let imagePath: string | undefined;
    if (newItemImageFile) {
      const tmpId = crypto.randomUUID();
      const uploaded = await uploadMenuImage({ restaurantId, menuItemId: tmpId, file: newItemImageFile });
      if ("error" in uploaded) {
        setError(uploaded.error.message);
        return;
      }
      imagePath = uploaded.path;
    }

    const res = await addMenuItem({
      restaurant_id: restaurantId,
      category_id: categoryId,
      name,
      description: newItemDescription,
      price,
      image_path: imagePath,
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
    setNewItemDescription("");
    setNewItemPrice("0.00");
    setNewItemCategoryId("");
    setNewItemSku("");
    setNewItemBarcode("");
    setNewItemDepartment("");
    setNewItemUnit("");
    setNewItemIsWeighted(false);
    setNewItemImageFile(null);

    await refresh(restaurantId);
  }

  function beginEditItem(it: MenuItem) {
    setEditingItemId(it.id);
    setEditingItemName(it.name);
    setEditingItemDescription((it.description ?? "") as string);
    setEditingItemPrice(Number(it.price).toFixed(2));
    setEditingItemCategoryId(it.category_id ?? "");
    setEditingItemSku(it.sku ?? "");
    setEditingItemBarcode(it.barcode ?? "");
    setEditingItemDepartment(it.department ?? "");
    setEditingItemUnit(it.unit ?? "");
    setEditingItemIsWeighted(!!it.is_weighted);
    setEditingItemIsActive(!!it.is_active);
    setEditingItemImagePath((it.image_path ?? null) as string | null);
    setEditingItemImageFile(null);
  }

  function cancelEditItem() {
    setEditingItemId(null);
    setEditingItemName("");
    setEditingItemDescription("");
    setEditingItemPrice("0.00");
    setEditingItemCategoryId("");
    setEditingItemSku("");
    setEditingItemBarcode("");
    setEditingItemDepartment("");
    setEditingItemUnit("");
    setEditingItemIsWeighted(false);
    setEditingItemIsActive(true);
    setEditingItemImageFile(null);
    setEditingItemImagePath(null);
  }

  async function onSaveItem() {
    if (!restaurantId || !canEdit) return;
    if (!editingItemId) return;
    setError(null);

    const name = editingItemName.trim();
    if (!name) return;

    const price = Number(editingItemPrice);
    if (!Number.isFinite(price) || price < 0) {
      setError("Price must be a valid number");
      return;
    }

    const categoryId = editingItemCategoryId === "" ? null : editingItemCategoryId;

    let imagePath = editingItemImagePath ?? undefined;
    if (editingItemImageFile) {
      const uploaded = await uploadMenuImage({ restaurantId, menuItemId: editingItemId, file: editingItemImageFile });
      if ("error" in uploaded) {
        setError(uploaded.error.message);
        return;
      }
      imagePath = uploaded.path;
    }

    const res = await updateMenuItem({
      id: editingItemId,
      category_id: categoryId,
      name,
      description: editingItemDescription,
      price,
      image_path: imagePath,
      sku: editingItemSku,
      barcode: editingItemBarcode,
      department: editingItemDepartment,
      unit: editingItemUnit,
      is_weighted: editingItemIsWeighted,
      is_active: editingItemIsActive,
    });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    cancelEditItem();
    await refresh(restaurantId);
  }

  async function onDeleteItem(itemId: string) {
    if (!restaurantId || !canEdit) return;
    setError(null);

    const res = await deleteMenuItem(itemId);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    await refresh(restaurantId);
  }

  if (loading) {
    return (
      <div className="islapos-marketing flex min-h-screen items-center justify-center bg-[var(--mp-bg)] text-[var(--mp-fg)]">
        <div className="text-sm text-[var(--mp-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">POS: Menu Manager</h1>
            <p className="text-sm text-[var(--mp-muted)]">Create and edit categories and items.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/pos")}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-4 text-sm font-semibold hover:bg-white"
            >
              Back
            </button>
          </div>
        </div>

        {!canEdit ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Your role does not allow editing the menu.
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Categories</div>
            </div>

            <form onSubmit={onAddCategory} className="mt-4 flex gap-2">
              <input
                className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                placeholder="New category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                disabled={!canEdit}
              />
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
                disabled={!canEdit || !newCategoryName.trim()}
              >
                Add
              </button>
            </form>

            {editingCategoryId ? (
              <div className="mt-4 rounded-2xl border border-[var(--mp-border)] bg-white p-4">
                <div className="text-xs font-semibold text-[var(--mp-muted)]">Editing category</div>
                <div className="mt-2 flex gap-2">
                  <input
                    className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                    value={editingCategoryName}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => void onSaveCategory()}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
                    disabled={!editingCategoryName.trim()}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategoryId(null);
                      setEditingCategoryName("");
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-4 text-sm font-semibold hover:bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-2">
              {categories.length === 0 ? (
                <div className="text-sm text-[var(--mp-muted)]">No categories yet.</div>
              ) : (
                categories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3"
                  >
                    <div className="text-sm font-semibold">{c.name}</div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(c.id);
                          setEditingCategoryName(c.name);
                        }}
                        disabled={!canEdit}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-3 text-xs font-semibold hover:bg-white disabled:opacity-60"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteCategory(c.id)}
                        disabled={!canEdit}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-3 text-xs font-semibold hover:bg-white disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--mp-border)] bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Items</div>
            </div>

            <form onSubmit={onAddItem} className="mt-4 flex flex-col gap-3">
              <input
                className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                placeholder="New item name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                disabled={!canEdit}
              />

              <textarea
                className="min-h-[96px] w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                placeholder="Description (optional)"
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                disabled={!canEdit}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                  placeholder="Price"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  inputMode="decimal"
                  disabled={!canEdit}
                />

                <select
                  className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                  value={newItemCategoryId}
                  onChange={(e) => setNewItemCategoryId(e.target.value)}
                  disabled={!canEdit}
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
                  className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                  placeholder="SKU (optional)"
                  value={newItemSku}
                  onChange={(e) => setNewItemSku(e.target.value)}
                  disabled={!canEdit}
                />
                <input
                  className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                  placeholder="Barcode (optional)"
                  value={newItemBarcode}
                  onChange={(e) => setNewItemBarcode(e.target.value)}
                  disabled={!canEdit}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                  placeholder="Department (optional)"
                  value={newItemDepartment}
                  onChange={(e) => setNewItemDepartment(e.target.value)}
                  disabled={!canEdit}
                />
                <input
                  className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                  placeholder="Unit (optional, e.g. each, lb, oz)"
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  disabled={!canEdit}
                />
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={newItemIsWeighted}
                  onChange={(e) => setNewItemIsWeighted(e.target.checked)}
                  disabled={!canEdit}
                />
                <span className="text-sm">Weighted item (sold by weight)</span>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Image (optional)</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={!canEdit}
                  onChange={(e) => setNewItemImageFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm"
                />
              </label>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
                disabled={!canEdit || !newItemName.trim()}
              >
                Add item
              </button>
            </form>

            {editingItemId ? (
              <div className="mt-6 rounded-3xl border border-[var(--mp-border)] bg-white p-5">
                <div className="text-sm font-semibold">Edit item</div>

                <div className="mt-3 flex flex-col gap-3">
                  <input
                    className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                    value={editingItemName}
                    onChange={(e) => setEditingItemName(e.target.value)}
                  />

                  <textarea
                    className="min-h-[96px] w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                    placeholder="Description (optional)"
                    value={editingItemDescription}
                    onChange={(e) => setEditingItemDescription(e.target.value)}
                  />

                  {editingItemImagePath ? (
                    <div className="rounded-2xl border border-[var(--mp-border)] bg-white p-3">
                      <div className="text-xs font-semibold text-[var(--mp-muted)]">Current image</div>
                      <img
                        alt="Menu item"
                        src={getMenuImageUrl(editingItemImagePath)}
                        className="mt-2 h-32 w-32 rounded-xl object-cover"
                      />
                    </div>
                  ) : null}

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Replace image (optional)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditingItemImageFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      value={editingItemPrice}
                      onChange={(e) => setEditingItemPrice(e.target.value)}
                      inputMode="decimal"
                    />
                    <select
                      className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      value={editingItemCategoryId}
                      onChange={(e) => setEditingItemCategoryId(e.target.value)}
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
                      className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      placeholder="SKU"
                      value={editingItemSku}
                      onChange={(e) => setEditingItemSku(e.target.value)}
                    />
                    <input
                      className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      placeholder="Barcode"
                      value={editingItemBarcode}
                      onChange={(e) => setEditingItemBarcode(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      placeholder="Department"
                      value={editingItemDepartment}
                      onChange={(e) => setEditingItemDepartment(e.target.value)}
                    />
                    <input
                      className="h-11 w-full rounded-xl border border-[var(--mp-border)] bg-white px-4 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      placeholder="Unit"
                      value={editingItemUnit}
                      onChange={(e) => setEditingItemUnit(e.target.value)}
                    />
                  </div>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={editingItemIsWeighted}
                      onChange={(e) => setEditingItemIsWeighted(e.target.checked)}
                    />
                    <span className="text-sm">Weighted item</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={editingItemIsActive}
                      onChange={(e) => setEditingItemIsActive(e.target.checked)}
                    />
                    <span className="text-sm">Active (available for sale)</span>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void onSaveItem()}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--mp-primary)] px-4 text-sm font-semibold text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] disabled:opacity-60"
                      disabled={!editingItemName.trim()}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditItem}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-4 text-sm font-semibold hover:bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-2">
              {items.length === 0 ? (
                <div className="text-sm text-[var(--mp-muted)]">No items yet.</div>
              ) : (
                items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--mp-border)] bg-white px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {it.image_path ? (
                        <img
                          alt={it.name}
                          src={getMenuImageUrl(it.image_path)}
                          className="h-12 w-12 flex-none rounded-xl object-cover"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{it.name}</div>
                        {it.description ? (
                          <div className="mt-1 line-clamp-2 text-xs text-[var(--mp-muted)]">
                            {it.description}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-[var(--mp-muted)]">
                            ${Number(it.price).toFixed(2)}{it.is_active ? "" : " • inactive"}
                          </div>
                        )}
                        {!it.description ? null : (
                          <div className="mt-1 text-xs text-[var(--mp-muted)]">
                            ${Number(it.price).toFixed(2)}{it.is_active ? "" : " • inactive"}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => beginEditItem(it)}
                        disabled={!canEdit}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-3 text-xs font-semibold hover:bg-white disabled:opacity-60"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteItem(it.id)}
                        disabled={!canEdit}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--mp-border)] bg-white/90 px-3 text-xs font-semibold hover:bg-white disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-[var(--mp-border)] bg-white/70 p-5">
          <div className="text-sm font-semibold">Modifiers</div>
          <div className="mt-2 text-sm text-[var(--mp-muted)]">
            Modifiers are not configured in this project yet. Tell me what modifier tables you want (e.g. modifier groups + options + item links),
            and I’ll add the DB schema + UI next.
          </div>
        </div>
      </div>
    </div>
  );
}
