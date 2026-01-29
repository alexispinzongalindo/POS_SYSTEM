import { supabase } from "@/lib/supabaseClient";
import { getOrCreateAppConfig, type AppConfig } from "@/lib/appConfig";
import { setRestaurantId } from "@/lib/appConfig";

export type Restaurant = {
  id: string;
  owner_user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export type Location = {
  id: string;
  restaurant_id: string;
  name: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  timezone: string;
};

export type TaxConfig = {
  id: string;
  restaurant_id: string;
  ivu_rate: number;
  prices_include_tax: boolean;
};

export type MenuCategory = {
  id: string;
  restaurant_id: string;
  name: string;
  color?: string | null;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description?: string | null;
  price: number;
  image_path?: string | null;
  sku: string | null;
  barcode: string | null;
  department: string | null;
  unit: string | null;
  is_weighted: boolean;
  is_active: boolean;
  sort_order?: number | null;
};

export type DeliveryProvider = "uber_direct" | "doordash_drive" | "aggregator";

export type DeliveryIntegration = {
  id: string;
  restaurant_id: string;
  provider: DeliveryProvider;
  enabled: boolean;
  credentials_json: Record<string, unknown> | null;
  settings_json: Record<string, unknown> | null;
};

export async function requireSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return { session: null, error };
  if (!data.session) return { session: null, error: new Error("Not signed in") };
  return { session: data.session, error: null };
}

export type SetupContext =
  | { session: null; config: null; error: Error }
  | { session: NonNullable<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>; config: AppConfig; error: null }
  | { session: NonNullable<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>; config: null; error: Error };

export async function getSetupContext() {
  const { session, error } = await requireSession();
  if (error || !session) {
    return { session: null, config: null, error: error instanceof Error ? error : new Error("Not signed in") };
  }

  const cfg = await getOrCreateAppConfig(session.user.id);
  if (cfg.error || !cfg.data) return { session, config: null, error: cfg.error ?? new Error("Missing app config") };

  return { session, config: cfg.data, error: null };
}

export async function getRestaurant(restaurantId: string) {
  return supabase.from("restaurants").select("*").eq("id", restaurantId).maybeSingle<Restaurant>();
}

export async function listRestaurantsByOwner(userId: string) {
  return supabase
    .from("restaurants")
    .select("*")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true })
    .returns<Restaurant[]>();
}

export async function upsertRestaurant(input: {
  id?: string;
  owner_user_id: string;
  name: string;
  phone?: string;
  email?: string;
}) {
  const payload = {
    id: input.id,
    owner_user_id: input.owner_user_id,
    name: input.name,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
  };

  const res = await supabase
    .from("restaurants")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .maybeSingle<Restaurant>();

  if (res.data?.id) {
    await setRestaurantId(res.data.id);
  }

  return res;
}

export async function upsertLocation(input: {
  id?: string;
  restaurant_id: string;
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  timezone: string;
}) {
  const payload = {
    id: input.id,
    restaurant_id: input.restaurant_id,
    name: input.name,
    address1: input.address1,
    address2: input.address2?.trim() || null,
    city: input.city,
    state: input.state,
    postal_code: input.postal_code,
    country: input.country,
    timezone: input.timezone,
  };

  return supabase
    .from("locations")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .maybeSingle<Location>();
}

export async function getLocationByRestaurant(restaurantId: string) {
  return supabase
    .from("locations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<Location>();
}

export async function upsertTaxConfig(input: {
  id?: string;
  restaurant_id: string;
  ivu_rate: number;
  prices_include_tax: boolean;
}) {
  const payload = {
    id: input.id,
    restaurant_id: input.restaurant_id,
    ivu_rate: input.ivu_rate,
    prices_include_tax: input.prices_include_tax,
  };

  return supabase
    .from("tax_config")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .maybeSingle<TaxConfig>();
}

export async function getTaxConfigByRestaurant(restaurantId: string) {
  return supabase
    .from("tax_config")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<TaxConfig>();
}

export async function listMenuCategories(restaurantId: string) {
  return supabase
    .from("menu_categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true })
    .returns<MenuCategory[]>();
}

export async function addMenuCategory(input: { restaurant_id: string; name: string; color?: string | null }) {
  const payloadWithColor = {
    restaurant_id: input.restaurant_id,
    name: input.name,
    color: Object.prototype.hasOwnProperty.call(input, "color") ? input.color ?? null : null,
  };

  const payloadWithoutColor = {
    restaurant_id: input.restaurant_id,
    name: input.name,
  };

  const res = await supabase
    .from("menu_categories")
    .insert(payloadWithColor)
    .select("*")
    .maybeSingle<MenuCategory>();

  if (res.error && res.error.message.toLowerCase().includes("color")) {
    return supabase
      .from("menu_categories")
      .insert(payloadWithoutColor)
      .select("*")
      .maybeSingle<MenuCategory>();
  }

  return res;
}

export async function updateMenuCategory(input: { id: string; name: string; color?: string | null }) {
  const updateWithMaybeColor = {
    name: input.name,
    ...(Object.prototype.hasOwnProperty.call(input, "color") ? { color: input.color ?? null } : {}),
  };

  const res = await supabase
    .from("menu_categories")
    .update(updateWithMaybeColor)
    .eq("id", input.id)
    .select("*")
    .maybeSingle<MenuCategory>();

  if (res.error && Object.prototype.hasOwnProperty.call(input, "color") && res.error.message.toLowerCase().includes("color")) {
    return supabase
      .from("menu_categories")
      .update({ name: input.name })
      .eq("id", input.id)
      .select("*")
      .maybeSingle<MenuCategory>();
  }

  return res;
}

export async function deleteMenuCategory(categoryId: string) {
  return supabase.from("menu_categories").delete().eq("id", categoryId);
}

export async function listMenuItems(restaurantId: string) {
  return supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true })
    .returns<MenuItem[]>();
}

export async function addMenuItem(input: {
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description?: string;
  price: number;
  image_path?: string;
  sku?: string;
  barcode?: string;
  department?: string;
  unit?: string;
  is_weighted?: boolean;
  sort_order?: number;
}) {
  return supabase
    .from("menu_items")
    .insert({
      restaurant_id: input.restaurant_id,
      category_id: input.category_id,
      name: input.name,
      description: input.description?.trim() || null,
      price: input.price,
      image_path: input.image_path?.trim() || null,
      sku: input.sku?.trim() || null,
      barcode: input.barcode?.trim() || null,
      department: input.department?.trim() || null,
      unit: input.unit?.trim() || null,
      is_weighted: input.is_weighted ?? false,
      is_active: true,
      sort_order: typeof input.sort_order === "number" ? input.sort_order : null,
    })
    .select("*")
    .maybeSingle<MenuItem>();
}

export async function updateMenuItem(input: {
  id: string;
  category_id: string | null;
  name: string;
  description?: string;
  price: number;
  image_path?: string;
  sku?: string;
  barcode?: string;
  department?: string;
  unit?: string;
  is_weighted?: boolean;
  is_active?: boolean;
  sort_order?: number;
}) {
  return supabase
    .from("menu_items")
    .update({
      category_id: input.category_id,
      name: input.name,
      description: input.description?.trim() || null,
      price: input.price,
      image_path: input.image_path?.trim() || null,
      sku: input.sku?.trim() || null,
      barcode: input.barcode?.trim() || null,
      department: input.department?.trim() || null,
      unit: input.unit?.trim() || null,
      is_weighted: input.is_weighted ?? false,
      is_active: input.is_active ?? true,
      sort_order: typeof input.sort_order === "number" ? input.sort_order : null,
    })
    .eq("id", input.id)
    .select("*")
    .maybeSingle<MenuItem>();
}

export async function deleteMenuItem(itemId: string) {
  return supabase.from("menu_items").delete().eq("id", itemId);
}

export async function listDeliveryIntegrations(restaurantId: string) {
  return supabase
    .from("delivery_integrations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true })
    .returns<DeliveryIntegration[]>();
}

export async function upsertDeliveryIntegration(input: {
  id?: string;
  restaurant_id: string;
  provider: DeliveryProvider;
  enabled: boolean;
  credentials_json?: Record<string, unknown> | null;
  settings_json?: Record<string, unknown> | null;
}) {
  const payload = {
    id: input.id,
    restaurant_id: input.restaurant_id,
    provider: input.provider,
    enabled: input.enabled,
    credentials_json: input.credentials_json ?? null,
    settings_json: input.settings_json ?? null,
  };

  return supabase
    .from("delivery_integrations")
    .upsert(payload, { onConflict: "restaurant_id,provider" })
    .select("*")
    .maybeSingle<DeliveryIntegration>();
}
