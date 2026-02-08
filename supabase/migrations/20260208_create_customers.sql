create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  birthday date,
  notes text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_restaurant_id_idx on public.customers(restaurant_id);
create index if not exists customers_email_idx on public.customers(email);
