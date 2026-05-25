create table if not exists public.products (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists set_coupons_updated_at on public.coupons;
create trigger set_coupons_updated_at
before update on public.coupons
for each row execute function public.set_updated_at();

drop trigger if exists set_store_settings_updated_at on public.store_settings;
create trigger set_store_settings_updated_at
before update on public.store_settings
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.customers enable row level security;
alter table public.coupons enable row level security;
alter table public.store_settings enable row level security;

drop policy if exists "public products read" on public.products;
create policy "public products read" on public.products
for select to anon, authenticated
using (true);

drop policy if exists "public products write" on public.products;
create policy "public products write" on public.products
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists "public orders read" on public.orders;
create policy "public orders read" on public.orders
for select to anon, authenticated
using (true);

drop policy if exists "public orders write" on public.orders;
create policy "public orders write" on public.orders
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists "public customers read" on public.customers;
create policy "public customers read" on public.customers
for select to anon, authenticated
using (true);

drop policy if exists "public customers write" on public.customers;
create policy "public customers write" on public.customers
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists "public coupons read" on public.coupons;
create policy "public coupons read" on public.coupons
for select to anon, authenticated
using (true);

drop policy if exists "public coupons write" on public.coupons;
create policy "public coupons write" on public.coupons
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists "public store settings read" on public.store_settings;
create policy "public store settings read" on public.store_settings
for select to anon, authenticated
using (true);

drop policy if exists "public store settings write" on public.store_settings;
create policy "public store settings write" on public.store_settings
for all to anon, authenticated
using (true)
with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.products to anon, authenticated;
grant select, insert, update, delete on public.orders to anon, authenticated;
grant select, insert, update, delete on public.customers to anon, authenticated;
grant select, insert, update, delete on public.coupons to anon, authenticated;
grant select, insert, update, delete on public.store_settings to anon, authenticated;
