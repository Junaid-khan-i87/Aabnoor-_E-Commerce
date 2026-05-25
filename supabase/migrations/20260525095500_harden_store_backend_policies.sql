create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "public products write" on public.products;
drop policy if exists "public products insert" on public.products;
drop policy if exists "public products update" on public.products;
drop policy if exists "public products delete" on public.products;
create policy "public products insert" on public.products
for insert to anon, authenticated
with check (true);
create policy "public products update" on public.products
for update to anon, authenticated
using (true)
with check (true);
create policy "public products delete" on public.products
for delete to anon, authenticated
using (true);

drop policy if exists "public orders write" on public.orders;
drop policy if exists "public orders insert" on public.orders;
drop policy if exists "public orders update" on public.orders;
drop policy if exists "public orders delete" on public.orders;
create policy "public orders insert" on public.orders
for insert to anon, authenticated
with check (true);
create policy "public orders update" on public.orders
for update to anon, authenticated
using (true)
with check (true);
create policy "public orders delete" on public.orders
for delete to anon, authenticated
using (true);

drop policy if exists "public customers write" on public.customers;
drop policy if exists "public customers insert" on public.customers;
drop policy if exists "public customers update" on public.customers;
drop policy if exists "public customers delete" on public.customers;
create policy "public customers insert" on public.customers
for insert to anon, authenticated
with check (true);
create policy "public customers update" on public.customers
for update to anon, authenticated
using (true)
with check (true);
create policy "public customers delete" on public.customers
for delete to anon, authenticated
using (true);

drop policy if exists "public coupons write" on public.coupons;
drop policy if exists "public coupons insert" on public.coupons;
drop policy if exists "public coupons update" on public.coupons;
drop policy if exists "public coupons delete" on public.coupons;
create policy "public coupons insert" on public.coupons
for insert to anon, authenticated
with check (true);
create policy "public coupons update" on public.coupons
for update to anon, authenticated
using (true)
with check (true);
create policy "public coupons delete" on public.coupons
for delete to anon, authenticated
using (true);

drop policy if exists "public store settings write" on public.store_settings;
drop policy if exists "public store settings insert" on public.store_settings;
drop policy if exists "public store settings update" on public.store_settings;
drop policy if exists "public store settings delete" on public.store_settings;
create policy "public store settings insert" on public.store_settings
for insert to anon, authenticated
with check (true);
create policy "public store settings update" on public.store_settings
for update to anon, authenticated
using (true)
with check (true);
create policy "public store settings delete" on public.store_settings
for delete to anon, authenticated
using (true);

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and p.pronargs = 0
  ) then
    revoke execute on function public.rls_auto_enable() from anon, authenticated;
  end if;
end;
$$;
