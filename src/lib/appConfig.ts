import { supabase } from "@/lib/supabaseClient";

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

  if (existing.error) return { data: null as AppConfig | null, error: existing.error };

  if (existing.data) return { data: existing.data, error: null };

  const created = await supabase
    .from("app_config")
    .insert({ owner_user_id: userId, restaurant_id: null, setup_complete: false })
    .select("id, owner_user_id, restaurant_id, setup_complete")
    .maybeSingle<AppConfig>();

  return { data: created.data ?? null, error: created.error };
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

  return { data: updated.data ?? null, error: updated.error };
}

export async function setRestaurantId(restaurantId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) {
    return { data: null as AppConfig | null, error: new Error("Not signed in") };
  }

  const cfg = await getOrCreateAppConfig(userId);
  if (cfg.error || !cfg.data) return { data: null as AppConfig | null, error: cfg.error ?? new Error("Missing app config") };

  const updated = await supabase
    .from("app_config")
    .update({ restaurant_id: restaurantId })
    .eq("id", cfg.data.id)
    .select("id, owner_user_id, restaurant_id, setup_complete")
    .maybeSingle<AppConfig>();

  return { data: updated.data ?? null, error: updated.error };
}
