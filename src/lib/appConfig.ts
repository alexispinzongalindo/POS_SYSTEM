import { supabase } from "@/lib/supabaseClient";

function normalizeError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === "string") return new Error(err);
  if (err && typeof err === "object") {
    const maybeMsg = (err as { message?: unknown }).message;
    if (typeof maybeMsg === "string" && maybeMsg.trim().length > 0) return new Error(maybeMsg);
    try {
      return new Error(JSON.stringify(err));
    } catch {
      return new Error("Unknown error");
    }
  }
  return new Error("Unknown error");
}

export type AppConfig = {
  id: number;
  owner_user_id: string;
  restaurant_id: string | null;
  setup_complete: boolean;
};

export async function getOrCreateAppConfig(userId: string) {
  const existing = await supabase
    .from("app_config")
    .select("id, owner_user_id, restaurant_id, setup_complete")
    .eq("owner_user_id", userId)
    .maybeSingle<AppConfig>();

  if (existing.error) return { data: null as AppConfig | null, error: normalizeError(existing.error) };

  if (existing.data) return { data: existing.data, error: null };

  const created = await supabase
    .from("app_config")
    .insert({ owner_user_id: userId, restaurant_id: null, setup_complete: false })
    .select("id, owner_user_id, restaurant_id, setup_complete")
    .maybeSingle<AppConfig>();

  return { data: created.data ?? null, error: created.error ? normalizeError(created.error) : null };
}

export async function setSetupComplete(value: boolean) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) {
    return { data: null as AppConfig | null, error: new Error("Not signed in") };
  }

  const cfg = await getOrCreateAppConfig(userId);
  if (cfg.error || !cfg.data) return { data: null as AppConfig | null, error: cfg.error ?? new Error("Missing app config") };

  const updated = await supabase
    .from("app_config")
    .update({ setup_complete: value })
    .eq("id", cfg.data.id)
    .select("id, owner_user_id, restaurant_id, setup_complete")
    .maybeSingle<AppConfig>();

  return { data: updated.data ?? null, error: updated.error ? normalizeError(updated.error) : null };
}

export async function setRestaurantId(restaurantId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) {
    return { data: null as AppConfig | null, error: new Error("Not signed in") };
  }

  const session = sessionData.session;
  const meta = (session?.user.app_metadata ?? {}) as { role?: string; restaurant_id?: string | null };
  const role = meta.role ?? null;
  const assignedRestaurantId = typeof meta.restaurant_id === "string" ? meta.restaurant_id : null;

  if (role === "cashier" || role === "manager" || role === "kitchen" || role === "maintenance" || role === "driver" || role === "security") {
    if (!assignedRestaurantId) {
      return { data: null as AppConfig | null, error: new Error("No restaurant assigned") };
    }
    if (assignedRestaurantId !== restaurantId) {
      return { data: null as AppConfig | null, error: new Error("Forbidden: cannot switch restaurants") };
    }
  } else {
    const owned = await supabase
      .from("restaurants")
      .select("id, owner_user_id")
      .eq("id", restaurantId)
      .maybeSingle<{ id: string; owner_user_id: string }>();

    if (owned.error) return { data: null as AppConfig | null, error: normalizeError(owned.error) };
    if (!owned.data) return { data: null as AppConfig | null, error: new Error("Restaurant not found") };
    if (owned.data.owner_user_id !== userId) {
      return { data: null as AppConfig | null, error: new Error("Forbidden: not restaurant owner") };
    }
  }

  const cfg = await getOrCreateAppConfig(userId);
  if (cfg.error || !cfg.data) return { data: null as AppConfig | null, error: cfg.error ?? new Error("Missing app config") };

  const updated = await supabase
    .from("app_config")
    .update({ restaurant_id: restaurantId })
    .eq("id", cfg.data.id)
    .select("id, owner_user_id, restaurant_id, setup_complete")
    .maybeSingle<AppConfig>();

  return { data: updated.data ?? null, error: updated.error ? normalizeError(updated.error) : null };
}
