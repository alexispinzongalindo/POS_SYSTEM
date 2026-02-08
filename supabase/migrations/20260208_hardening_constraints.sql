-- Data integrity checks (NOT VALID to avoid breaking existing data)
alter table public.orders
  add constraint if not exists orders_nonnegative_totals_chk
  check (
    (subtotal is null or subtotal >= 0) and
    (tax is null or tax >= 0) and
    (total is null or total >= 0) and
    (discount_amount is null or discount_amount >= 0)
  ) not valid;

alter table public.floor_tables
  add constraint if not exists floor_tables_positive_numbers_chk
  check (
    table_number > 0 and
    seats > 0 and
    width > 0 and
    height > 0
  ) not valid;

alter table public.customers
  add constraint if not exists customers_required_fields_chk
  check (
    length(trim(name)) > 0 and
    length(trim(email)) > 0 and
    length(trim(phone)) > 0
  ) not valid;
