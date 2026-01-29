-- IslaPOS Supabase schema additions for Menumium-like menu flow (images, modifiers, online ordering)

-- 1) Menu item metadata
alter table if exists public.menu_items
  add column if not exists description text,
  add column if not exists image_path text,
  add column if not exists sort_order int;

-- 1b) Menu category metadata
alter table if exists public.menu_categories
  add column if not exists color text;

-- 2) Modifier groups (e.g. "Choose a side")
create table if not exists public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3) Modifier options (e.g. "Fries +$0.00")
create table if not exists public.modifier_options (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  group_id uuid not null references public.modifier_groups(id) on delete cascade,
  name text not null,
  price_delta numeric not null default 0,
  is_active boolean not null default true,
  sort_order int,
  created_at timestamptz not null default now()
);

create index if not exists modifier_options_group_id_idx on public.modifier_options(group_id);

-- 4) Link modifier groups to menu items + rules
create table if not exists public.menu_item_modifier_groups (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  group_id uuid not null references public.modifier_groups(id) on delete cascade,
  is_required boolean not null default false,
  min_select int not null default 0,
  max_select int,
  sort_order int,
  created_at timestamptz not null default now(),
  unique (menu_item_id, group_id)
);

create index if not exists menu_item_modifier_groups_menu_item_id_idx on public.menu_item_modifier_groups(menu_item_id);
create index if not exists menu_item_modifier_groups_group_id_idx on public.menu_item_modifier_groups(group_id);

-- 5) Store modifier selections per order item
create table if not exists public.order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  group_id uuid not null references public.modifier_groups(id) on delete restrict,
  option_id uuid not null references public.modifier_options(id) on delete restrict,
  qty int not null default 1,
  price_delta numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists order_item_modifiers_order_item_id_idx on public.order_item_modifiers(order_item_id);

-- NOTE:
-- - You must also create a Storage bucket (e.g. "menu") and allow reads for public menus.
-- - RLS policies are not included here because they depend on your current policy approach.
