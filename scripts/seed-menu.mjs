import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function loadEnvFile(fileName) {
  try {
    const full = path.resolve(process.cwd(), fileName);
    if (!fs.existsSync(full)) return;
    const raw = fs.readFileSync(full, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = val;
    }
  } catch {
    return;
  }
}

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function money(n) {
  return Math.round(n * 100) / 100;
}

function svgForItem(name, subtitle) {
  const safeName = String(name).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeSub = String(subtitle)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const bg = "#0ea85f";
  const card = "#ffffff";
  const text = "#0f172a";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${bg}" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#16a34a" stop-opacity="0.95"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="800" height="600" fill="url(#g)"/>

  <g filter="url(#shadow)">
    <rect x="70" y="90" width="660" height="420" rx="28" fill="${card}" opacity="0.96"/>
  </g>

  <circle cx="160" cy="210" r="52" fill="#dcfce7"/>
  <path d="M135 210c18-32 44-32 62 0" fill="none" stroke="#16a34a" stroke-width="10" stroke-linecap="round"/>
  <path d="M148 186c10 8 22 8 32 0" fill="none" stroke="#16a34a" stroke-width="10" stroke-linecap="round"/>

  <text x="160" y="330" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system" font-size="18" fill="#16a34a" font-weight="700">IslaPOS</text>

  <text x="400" y="240" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system" font-size="44" fill="${text}" font-weight="800">${safeName}</text>
  <text x="400" y="290" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system" font-size="22" fill="#334155" font-weight="600">${safeSub}</text>

  <text x="400" y="410" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system" font-size="16" fill="#64748b">Placeholder photo (replace with real item image)</text>
</svg>`;
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const restaurantId = process.argv[2];
  if (!restaurantId) {
    console.error("Usage: npm run seed:menu -- <restaurantId>");
    process.exit(1);
  }

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const restaurantRes = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("id", restaurantId)
    .maybeSingle();

  if (restaurantRes.error) {
    throw new Error(`Failed to verify restaurantId: ${restaurantRes.error.message}`);
  }

  if (!restaurantRes.data) {
    const listRes = await supabase
      .from("restaurants")
      .select("id, name")
      .order("created_at", { ascending: false })
      .limit(10);

    console.error(`Restaurant not found: ${restaurantId}`);
    if (listRes.error) {
      console.error(`Also failed to list restaurants: ${listRes.error.message}`);
    } else {
      console.error("Copy a restaurant id from this list and re-run:");
      for (const r of listRes.data ?? []) {
        console.error(`- ${r.id}  (${r.name ?? "no name"})`);
      }
    }
    process.exit(1);
  }

  const categories = [
    {
      name: "Appetizers",
      items: [
        { name: "Crispy Calamari", price: 12.5, description: "Lightly breaded, lemon aioli, fresh herbs." },
        { name: "Garlic Bread", price: 7.25, description: "Toasted baguette, garlic butter, parsley." },
        { name: "Chicken Wings", price: 13.75, description: "Choice of sauce, served with ranch." },
        { name: "Bruschetta", price: 9.5, description: "Tomato, basil, balsamic glaze on toast." },
        { name: "Mozzarella Sticks", price: 9.75, description: "Golden fried, marinara dipping sauce." },
      ],
    },
    {
      name: "Mains",
      items: [
        { name: "Classic Burger", price: 15.5, description: "Beef patty, lettuce, tomato, house sauce." },
        { name: "Grilled Chicken Plate", price: 17.25, description: "Herb grilled chicken, rice, seasonal veggies." },
        { name: "Pasta Alfredo", price: 16.75, description: "Creamy parmesan sauce, fettuccine." },
        { name: "Fish Tacos", price: 16.25, description: "Crispy fish, slaw, crema, lime." },
        { name: "Ribeye Steak", price: 28.0, description: "12oz ribeye, chimichurri, side of choice." },
      ],
    },
    {
      name: "Sides",
      items: [
        { name: "French Fries", price: 4.5, description: "Crispy fries, sea salt." },
        { name: "Sweet Plantains", price: 5.25, description: "Caramelized maduros." },
        { name: "Side Salad", price: 5.75, description: "Mixed greens, house vinaigrette." },
        { name: "Rice & Beans", price: 6.5, description: "Puerto Rican style arroz con habichuelas." },
        { name: "Mashed Potatoes", price: 5.5, description: "Creamy mash, butter, chives." },
      ],
    },
    {
      name: "Drinks",
      items: [
        { name: "Soda", price: 2.75, description: "Coke, Diet Coke, Sprite." },
        { name: "Iced Tea", price: 2.95, description: "Fresh brewed, lemon." },
        { name: "Lemonade", price: 3.25, description: "House made, lightly sweet." },
        { name: "Coffee", price: 2.5, description: "Hot coffee, regular or decaf." },
        { name: "Sparkling Water", price: 2.95, description: "Cold, refreshing bubbles." },
      ],
    },
    {
      name: "Desserts",
      items: [
        { name: "Chocolate Cake", price: 7.5, description: "Rich chocolate, ganache." },
        { name: "Cheesecake", price: 7.75, description: "Classic NY style, berry sauce." },
        { name: "Flan", price: 6.5, description: "Creamy caramel custard." },
        { name: "Ice Cream", price: 5.5, description: "Vanilla, chocolate, strawberry." },
        { name: "Churros", price: 6.75, description: "Cinnamon sugar, chocolate dip." },
      ],
    },
  ];

  console.log(`Seeding menu for restaurant: ${restaurantId}`);

  for (let cIndex = 0; cIndex < categories.length; cIndex++) {
    const c = categories[cIndex];

    const catInsert = await supabase
      .from("menu_categories")
      .insert({ restaurant_id: restaurantId, name: c.name })
      .select("id")
      .maybeSingle();

    if (catInsert.error || !catInsert.data?.id) {
      throw new Error(`Failed to create category '${c.name}': ${catInsert.error?.message ?? "unknown"}`);
    }

    const categoryId = catInsert.data.id;
    console.log(`- Created category: ${c.name}`);

    for (let iIndex = 0; iIndex < c.items.length; iIndex++) {
      const item = c.items[iIndex];

      const itemInsert = await supabase
        .from("menu_items")
        .insert({
          restaurant_id: restaurantId,
          category_id: categoryId,
          name: item.name,
          description: item.description,
          price: money(item.price),
          image_path: null,
          sku: null,
          barcode: null,
          department: null,
          unit: null,
          is_weighted: false,
          is_active: true,
          sort_order: iIndex,
        })
        .select("id")
        .maybeSingle();

      if (itemInsert.error || !itemInsert.data?.id) {
        throw new Error(`Failed to create item '${item.name}': ${itemInsert.error?.message ?? "unknown"}`);
      }

      const menuItemId = itemInsert.data.id;

      const fileName = `${slugify(item.name)}.svg`;
      const path = `${restaurantId}/items/${menuItemId}/seed-${fileName}`;
      const svg = svgForItem(item.name, c.name);

      const uploadRes = await supabase.storage
        .from("menu")
        .upload(path, Buffer.from(svg, "utf8"), {
          contentType: "image/svg+xml",
          upsert: true,
        });

      if (uploadRes.error) {
        throw new Error(`Failed to upload image for '${item.name}': ${uploadRes.error.message}`);
      }

      const upd = await supabase
        .from("menu_items")
        .update({ image_path: path })
        .eq("id", menuItemId);

      if (upd.error) {
        throw new Error(`Failed to set image_path for '${item.name}': ${upd.error.message}`);
      }

      console.log(`  - Created item: ${item.name} ($${money(item.price).toFixed(2)})`);
    }
  }

  console.log("Done. Open /pos/menu and /menu/[restaurantId] to verify.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
