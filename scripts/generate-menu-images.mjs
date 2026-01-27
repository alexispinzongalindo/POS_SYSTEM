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
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(arr, seed) {
  return arr[seed % arr.length];
}

function makeSvg({ name, category }) {
  const seed = hash32(`${category}::${name}`);

  const bgA = pick(["#0ea85f", "#16a34a", "#22c55e", "#10b981"], seed);
  const bgB = pick(["#0b7f49", "#15803d", "#059669", "#0f766e"], seed >>> 3);
  const plate = pick(["#ffffff", "#f8fafc", "#f1f5f9"], seed >>> 6);
  const shadow = "#0f172a";

  const food1 = pick(["#f59e0b", "#ef4444", "#fb7185", "#a855f7", "#3b82f6"], seed >>> 9);
  const food2 = pick(["#fde68a", "#fecaca", "#fbcfe8", "#ddd6fe", "#bfdbfe"], seed >>> 12);
  const food3 = pick(["#84cc16", "#22c55e", "#14b8a6", "#06b6d4"], seed >>> 15);

  const safeName = escapeXml(name);
  const safeCat = escapeXml(category);

  // The "food" is abstract but reads as a photo: plate + sauces + garnish + highlights.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${bgA}"/>
      <stop offset="1" stop-color="${bgB}"/>
    </linearGradient>
    <radialGradient id="spot" cx="35%" cy="30%" r="65%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="ds" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="${shadow}" flood-opacity="0.35"/>
    </filter>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>

  <rect width="1200" height="900" fill="url(#bg)"/>
  <rect width="1200" height="900" fill="url(#spot)"/>

  <g filter="url(#ds)">
    <rect x="110" y="120" width="980" height="660" rx="44" fill="#ffffff" fill-opacity="0.92"/>
  </g>

  <!-- "photo" area -->
  <g>
    <rect x="170" y="180" width="860" height="430" rx="36" fill="#0b1220" fill-opacity="0.06"/>
    <rect x="170" y="180" width="860" height="430" rx="36" fill="#ffffff" fill-opacity="0.25"/>

    <!-- plate -->
    <g>
      <ellipse cx="600" cy="400" rx="310" ry="200" fill="${plate}"/>
      <ellipse cx="600" cy="420" rx="290" ry="175" fill="#ffffff" fill-opacity="0.6"/>
      <ellipse cx="600" cy="430" rx="260" ry="150" fill="#ffffff" fill-opacity="0.35"/>
      <ellipse cx="600" cy="520" rx="220" ry="55" fill="${shadow}" fill-opacity="0.12" filter="url(#soft)"/>
    </g>

    <!-- food blobs -->
    <g>
      <path d="M455 410c65-85 155-100 265-35c72 43 72 115 0 150c-128 62-308 10-315-115c-2-1 18-15 50 0z" fill="${food1}" fill-opacity="0.95"/>
      <path d="M515 360c40-50 110-60 170-20c45 30 45 78 0 102c-90 46-214 8-218-78c-1 0 12-10 48-4z" fill="${food2}" fill-opacity="0.9"/>
      <path d="M475 470c30-20 58-24 85-10c25 13 25 35 0 50c-45 28-110 15-120-30c-1 0 12-8 35-10z" fill="${food3}" fill-opacity="0.9"/>

      <!-- sauce drizzles -->
      <path d="M420 445c85-35 170-35 255 0" stroke="#ffffff" stroke-opacity="0.55" stroke-width="18" stroke-linecap="round" fill="none"/>
      <path d="M460 505c115 20 205 10 270-30" stroke="#ffffff" stroke-opacity="0.35" stroke-width="14" stroke-linecap="round" fill="none"/>

      <!-- highlights -->
      <circle cx="520" cy="390" r="22" fill="#ffffff" fill-opacity="0.22"/>
      <circle cx="650" cy="440" r="18" fill="#ffffff" fill-opacity="0.18"/>
      <circle cx="590" cy="500" r="14" fill="#ffffff" fill-opacity="0.15"/>
    </g>
  </g>

  <!-- label -->
  <g>
    <text x="600" y="680" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system" font-size="52" font-weight="900" fill="#0f172a">${safeName}</text>
    <text x="600" y="734" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system" font-size="22" font-weight="700" fill="#334155">${safeCat}</text>
  </g>

  <!-- tiny brand -->
  <g>
    <rect x="170" y="630" width="150" height="46" rx="14" fill="#16a34a" fill-opacity="0.12"/>
    <text x="245" y="662" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system" font-size="18" font-weight="800" fill="#16a34a">IslaPOS</text>
  </g>
</svg>`;
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const restaurantId = process.argv[2];
  if (!restaurantId) {
    console.error("Usage: npm run gen:images -- <restaurantId>");
    process.exit(1);
  }

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const restaurantRes = await supabase.from("restaurants").select("id, name").eq("id", restaurantId).maybeSingle();
  if (restaurantRes.error) throw new Error(restaurantRes.error.message);
  if (!restaurantRes.data) throw new Error(`Restaurant not found: ${restaurantId}`);

  const catsRes = await supabase
    .from("menu_categories")
    .select("id, name")
    .eq("restaurant_id", restaurantId)
    .returns();

  if (catsRes.error) throw new Error(catsRes.error.message);
  const catById = new Map((catsRes.data ?? []).map((c) => [c.id, c.name]));

  const itemsRes = await supabase
    .from("menu_items")
    .select("id, name, category_id")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (itemsRes.error) throw new Error(itemsRes.error.message);
  const items = itemsRes.data ?? [];

  console.log(`Generating images for ${items.length} items...`);

  for (const it of items) {
    const category = it.category_id ? catById.get(it.category_id) ?? "Menu" : "Menu";
    const svg = makeSvg({ name: it.name, category });

    const fileName = `${slugify(it.name)}.svg`;
    const objectPath = `${restaurantId}/items/${it.id}/generated-${fileName}`;

    const up = await supabase.storage
      .from("menu")
      .upload(objectPath, Buffer.from(svg, "utf8"), { contentType: "image/svg+xml", upsert: true });

    if (up.error) throw new Error(`Upload failed for '${it.name}': ${up.error.message}`);

    const upd = await supabase.from("menu_items").update({ image_path: objectPath }).eq("id", it.id);
    if (upd.error) throw new Error(`DB update failed for '${it.name}': ${upd.error.message}`);

    console.log(`- ${it.name} -> ${objectPath}`);
  }

  console.log("Done. Refresh /pos/menu and /menu/[restaurantId].");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
