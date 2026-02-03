import { supabase } from "@/lib/supabaseClient";

type PageProps = {
  params: Promise<{ restaurantId: string }>;
};

type Restaurant = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type MenuCategory = {
  id: string;
  restaurant_id: string;
  name: string;
};

type MenuItem = {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description?: string | null;
  price: number;
  image_path?: string | null;
  is_active: boolean;
};

function menuImageUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  if (!base) return "";
  return `${base}/storage/v1/object/public/menu/${path}`;
}

export default async function PublicMenuPage(props: PageProps) {
  const { restaurantId } = await props.params;

  const [restaurantRes, categoriesRes, itemsRes] = await Promise.all([
    supabase
      .from("restaurants")
      .select("id, name, phone, email")
      .eq("id", restaurantId)
      .maybeSingle<Restaurant>(),
    supabase
      .from("menu_categories")
      .select("id, restaurant_id, name")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true })
      .returns<MenuCategory[]>(),
    supabase
      .from("menu_items")
      .select("id, restaurant_id, category_id, name, description, price, image_path, is_active")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .returns<MenuItem[]>(),
  ]);

  if (restaurantRes.error) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          {/* <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {restaurantRes.error.message}
          </div> */}
        </div>
      </div>
    );
  }

  const restaurant = restaurantRes.data;
  if (!restaurant) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-base font-semibold">Menu not found</div>
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              This restaurant does not exist.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categories = categoriesRes.data ?? [];
  const items = (itemsRes.data ?? []).filter((it) => it.is_active);

  const uncategorized = items.filter((it) => !it.category_id);
  const itemsByCategory = new Map<string, MenuItem[]>();
  for (const c of categories) itemsByCategory.set(c.id, []);
  for (const it of items) {
    if (!it.category_id) continue;
    const arr = itemsByCategory.get(it.category_id) ?? [];
    arr.push(it);
    itemsByCategory.set(it.category_id, arr);
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{restaurant.name}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Menu</p>
            {restaurant.phone || restaurant.email ? (
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {restaurant.phone ? <div>{restaurant.phone}</div> : null}
                {restaurant.email ? <div>{restaurant.email}</div> : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* {categoriesRes.error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {categoriesRes.error.message}
          </div>
        ) : null} */}

        {/* {itemsRes.error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {itemsRes.error.message}
          </div>
        ) : null} */}

        <div className="mt-8 flex flex-col gap-6">
          {uncategorized.length > 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-base font-semibold">Items</h2>
              <div className="mt-4 flex flex-col gap-2">
                {uncategorized.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {it.image_path ? (
                        <img
                          alt={it.name}
                          src={menuImageUrl(it.image_path)}
                          className="h-12 w-12 flex-none rounded-lg object-cover"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{it.name}</div>
                        {it.description ? (
                          <div className="mt-0.5 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                            {it.description}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-sm tabular-nums">${it.price.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {categories.map((c) => {
            const its = itemsByCategory.get(c.id) ?? [];
            if (its.length === 0) return null;

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <h2 className="text-base font-semibold">{c.name}</h2>
                <div className="mt-4 flex flex-col gap-2">
                  {its.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {it.image_path ? (
                          <img
                            alt={it.name}
                            src={menuImageUrl(it.image_path)}
                            className="h-12 w-12 flex-none rounded-lg object-cover"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{it.name}</div>
                          {it.description ? (
                            <div className="mt-0.5 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                              {it.description}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-sm tabular-nums">${it.price.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {items.length === 0 && !itemsRes.error ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-base font-semibold">No items yet</div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                This menu doesn’t have any active items.
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Powered by POS System
        </div>
      </div>
    </div>
  );
}
