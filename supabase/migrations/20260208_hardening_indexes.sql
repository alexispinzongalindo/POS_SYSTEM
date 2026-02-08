-- Performance indexes
create index if not exists orders_restaurant_created_idx on public.orders(restaurant_id, created_at);
create index if not exists orders_restaurant_status_idx on public.orders(restaurant_id, status);
create index if not exists orders_restaurant_type_idx on public.orders(restaurant_id, order_type);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists floor_tables_area_id_idx on public.floor_tables(area_id);
create index if not exists floor_objects_area_id_idx on public.floor_objects(area_id);

-- Conditional unique indexes (skip if existing data would violate)
do $$
begin
  if not exists (
    select 1
    from (
      select restaurant_id, lower(email) as email_key, count(*) as c
      from public.customers
      where email is not null
      group by restaurant_id, lower(email)
      having count(*) > 1
    ) d
  ) then
    execute 'create unique index if not exists customers_restaurant_email_unique_idx on public.customers(restaurant_id, lower(email))';
  end if;

  if not exists (
    select 1
    from (
      select restaurant_id, table_number, count(*) as c
      from public.floor_tables
      group by restaurant_id, table_number
      having count(*) > 1
    ) d
  ) then
    execute 'create unique index if not exists floor_tables_restaurant_table_unique_idx on public.floor_tables(restaurant_id, table_number)';
  end if;
end $$;
