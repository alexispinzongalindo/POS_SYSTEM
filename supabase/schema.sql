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

 create table if not exists public.support_cases (
   id uuid primary key default gen_random_uuid(),
   restaurant_id uuid not null references public.restaurants(id) on delete cascade,
   status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
   priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
   customer_name text,
   customer_phone text,
   subject text not null,
   description text,
   internal_notes text,
   resolution text,
   created_by_user_id uuid,
   closed_at timestamptz,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
 );

 create index if not exists support_cases_restaurant_id_idx on public.support_cases(restaurant_id);
 create index if not exists support_cases_status_idx on public.support_cases(status);
 create index if not exists support_cases_created_at_idx on public.support_cases(created_at desc);

 create table if not exists public.payroll_schedule_shifts (
   id uuid primary key default gen_random_uuid(),
   restaurant_id uuid not null references public.restaurants(id) on delete cascade,
   staff_user_id uuid not null,
   staff_pin text,
   staff_label text,
   starts_at timestamptz not null,
   ends_at timestamptz not null,
   break_minutes int not null default 0,
   created_by_user_id uuid,
   created_at timestamptz not null default now()
 );

 create index if not exists payroll_schedule_shifts_restaurant_id_idx on public.payroll_schedule_shifts(restaurant_id);
 create index if not exists payroll_schedule_shifts_staff_user_id_idx on public.payroll_schedule_shifts(staff_user_id);
 create index if not exists payroll_schedule_shifts_staff_pin_idx on public.payroll_schedule_shifts(staff_pin);
 create index if not exists payroll_schedule_shifts_starts_at_idx on public.payroll_schedule_shifts(starts_at);

 create table if not exists public.time_clock_entries (
   id uuid primary key default gen_random_uuid(),
   restaurant_id uuid not null references public.restaurants(id) on delete cascade,
   staff_user_id uuid,
   staff_pin text,
   staff_label text,
   action text not null check (action in ('clock_in', 'break_out', 'break_in', 'clock_out')),
   at timestamptz not null,
   recorded_by_user_id uuid,
   created_at timestamptz not null default now()
 );

 create index if not exists time_clock_entries_restaurant_id_idx on public.time_clock_entries(restaurant_id);
 create index if not exists time_clock_entries_staff_user_id_idx on public.time_clock_entries(staff_user_id);
 create index if not exists time_clock_entries_staff_pin_idx on public.time_clock_entries(staff_pin);
 create index if not exists time_clock_entries_at_idx on public.time_clock_entries(at);

 create table if not exists public.edge_gateways (
   id uuid primary key default gen_random_uuid(),
   restaurant_id uuid not null references public.restaurants(id) on delete cascade,
   name text,
   secret_hash text not null,
   last_seen_at timestamptz,
   created_at timestamptz not null default now()
 );

 create index if not exists edge_gateways_restaurant_id_idx on public.edge_gateways(restaurant_id);
 create index if not exists edge_gateways_last_seen_at_idx on public.edge_gateways(last_seen_at desc);

 create table if not exists public.edge_gateway_pair_codes (
   code text primary key,
   restaurant_id uuid not null references public.restaurants(id) on delete cascade,
   created_by_user_id uuid,
   expires_at timestamptz not null,
   created_at timestamptz not null default now()
 );

 create index if not exists edge_gateway_pair_codes_restaurant_id_idx on public.edge_gateway_pair_codes(restaurant_id);
 create index if not exists edge_gateway_pair_codes_expires_at_idx on public.edge_gateway_pair_codes(expires_at);

 create table if not exists public.edge_events (
   id uuid primary key,
   restaurant_id uuid not null references public.restaurants(id) on delete cascade,
   gateway_id uuid not null references public.edge_gateways(id) on delete cascade,
   device_id uuid,
   type text not null,
   payload_json jsonb not null default '{}'::jsonb,
   created_at timestamptz not null default now(),
   received_at timestamptz not null default now()
 );

 create index if not exists edge_events_restaurant_id_idx on public.edge_events(restaurant_id);
 create index if not exists edge_events_gateway_id_idx on public.edge_events(gateway_id);
 create index if not exists edge_events_created_at_idx on public.edge_events(created_at desc);

 create table if not exists public.ingredients (
   id uuid primary key default gen_random_uuid(),
   restaurant_id uuid not null references public.restaurants(id) on delete cascade,
   name text not null,
   unit text not null default 'each',
   is_active boolean not null default true,
   created_at timestamptz not null default now(),
   unique (restaurant_id, name)
 );

 create index if not exists ingredients_restaurant_id_idx on public.ingredients(restaurant_id);
 create index if not exists ingredients_created_at_idx on public.ingredients(created_at desc);

 create table if not exists public.menu_item_recipe_lines (
   id uuid primary key default gen_random_uuid(),
   restaurant_id uuid not null references public.restaurants(id) on delete cascade,
   menu_item_id uuid not null references public.menu_items(id) on delete cascade,
   ingredient_id uuid not null references public.ingredients(id) on delete cascade,
   qty numeric not null default 0,
   created_at timestamptz not null default now(),
   unique (menu_item_id, ingredient_id)
 );

 create index if not exists menu_item_recipe_lines_restaurant_id_idx on public.menu_item_recipe_lines(restaurant_id);
 create index if not exists menu_item_recipe_lines_menu_item_id_idx on public.menu_item_recipe_lines(menu_item_id);
 create index if not exists menu_item_recipe_lines_ingredient_id_idx on public.menu_item_recipe_lines(ingredient_id);

 create table if not exists public.ingredient_purchases (
   id uuid primary key default gen_random_uuid(),
   restaurant_id uuid not null references public.restaurants(id) on delete cascade,
   ingredient_id uuid not null references public.ingredients(id) on delete cascade,
   purchased_at timestamptz not null,
   vendor text,
   qty numeric not null default 0,
   total_cost numeric not null default 0,
   created_by_user_id uuid,
   created_at timestamptz not null default now()
 );

 create index if not exists ingredient_purchases_restaurant_id_idx on public.ingredient_purchases(restaurant_id);
 create index if not exists ingredient_purchases_ingredient_id_idx on public.ingredient_purchases(ingredient_id);
 create index if not exists ingredient_purchases_purchased_at_idx on public.ingredient_purchases(purchased_at desc);

 create table if not exists public.ingredient_counts (
   id uuid primary key default gen_random_uuid(),
   restaurant_id uuid not null references public.restaurants(id) on delete cascade,
   ingredient_id uuid not null references public.ingredients(id) on delete cascade,
   counted_at timestamptz not null,
   qty numeric not null default 0,
   created_by_user_id uuid,
   created_at timestamptz not null default now()
 );

 create index if not exists ingredient_counts_restaurant_id_idx on public.ingredient_counts(restaurant_id);
 create index if not exists ingredient_counts_ingredient_id_idx on public.ingredient_counts(ingredient_id);
 create index if not exists ingredient_counts_counted_at_idx on public.ingredient_counts(counted_at desc);

 create table if not exists public.ai_feature_registry_entries (
   id uuid primary key default gen_random_uuid(),
   restaurant_id uuid references public.restaurants(id) on delete cascade,
   key text not null,
   title text not null,
   body text not null,
   tags text[] not null default '{}',
   is_active boolean not null default true,
   created_by_user_id uuid,
   updated_by_user_id uuid,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   unique (restaurant_id, key)
 );

 create index if not exists ai_feature_registry_entries_restaurant_id_idx on public.ai_feature_registry_entries(restaurant_id);
 create index if not exists ai_feature_registry_entries_is_active_idx on public.ai_feature_registry_entries(is_active);
 create index if not exists ai_feature_registry_entries_updated_at_idx on public.ai_feature_registry_entries(updated_at desc);
