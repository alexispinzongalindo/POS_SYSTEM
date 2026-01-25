export type InventoryItemState = {
  tracked: boolean;
  stock: number;
  updatedAt: string;
};

export type InventoryState = Record<string, InventoryItemState>; // key: menu_item_id

function storageKey(restaurantId: string) {
  return `pos.inventory.${restaurantId}`;
}

export function loadInventory(restaurantId: string): InventoryState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(restaurantId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as InventoryState;
  } catch {
    return {};
  }
}

export function saveInventory(restaurantId: string, state: InventoryState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(restaurantId), JSON.stringify(state));
}

export function setInventoryItem(
  restaurantId: string,
  menuItemId: string,
  patch: Partial<InventoryItemState> & { tracked?: boolean; stock?: number },
) {
  const existing = loadInventory(restaurantId);
  const prev = existing[menuItemId] ?? { tracked: false, stock: 0, updatedAt: new Date(0).toISOString() };

  const nextItem: InventoryItemState = {
    tracked: patch.tracked ?? prev.tracked,
    stock: patch.stock ?? prev.stock,
    updatedAt: new Date().toISOString(),
  };

  const next: InventoryState = { ...existing, [menuItemId]: nextItem };
  saveInventory(restaurantId, next);
  return next;
}

export function applyInventoryDelta(
  restaurantId: string,
  deltas: Array<{ menu_item_id: string; qty: number }>,
): InventoryState {
  const state = loadInventory(restaurantId);
  let changed = false;

  const next: InventoryState = { ...state };
  for (const d of deltas) {
    const cur = next[d.menu_item_id];
    if (!cur?.tracked) continue;

    const qty = Number(d.qty);
    if (!Number.isFinite(qty) || qty <= 0) continue;

    const stock = Number(cur.stock);
    const updatedStock = Number.isFinite(stock) ? stock - qty : -qty;

    next[d.menu_item_id] = {
      tracked: true,
      stock: updatedStock,
      updatedAt: new Date().toISOString(),
    };
    changed = true;
  }

  if (changed) saveInventory(restaurantId, next);
  return next;
}
