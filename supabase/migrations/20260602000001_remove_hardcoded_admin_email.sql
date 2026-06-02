create or replace function public.is_admin_with_mfa()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    exists (select 1 from public.admin_users where user_id = auth.uid())
    and (auth.jwt())->>'aal' = 'aal2';
$$;

grant execute on function public.is_admin_with_mfa() to authenticated;

drop policy if exists "admin products insert" on public.products;
drop policy if exists "admin products update" on public.products;
drop policy if exists "admin products delete" on public.products;

create policy "admin products insert" on public.products
for insert to authenticated
with check (public.is_admin_with_mfa());

create policy "admin products update" on public.products
for update to authenticated
using (public.is_admin_with_mfa())
with check (public.is_admin_with_mfa());

create policy "admin products delete" on public.products
for delete to authenticated
using (public.is_admin_with_mfa());

drop policy if exists "admin coupons insert" on public.coupons;
drop policy if exists "admin coupons update" on public.coupons;
drop policy if exists "admin coupons delete" on public.coupons;

create policy "admin coupons insert" on public.coupons
for insert to authenticated
with check (public.is_admin_with_mfa());

create policy "admin coupons update" on public.coupons
for update to authenticated
using (public.is_admin_with_mfa())
with check (public.is_admin_with_mfa());

create policy "admin coupons delete" on public.coupons
for delete to authenticated
using (public.is_admin_with_mfa());

drop policy if exists "admin store settings insert" on public.store_settings;
drop policy if exists "admin store settings update" on public.store_settings;
drop policy if exists "admin store settings delete" on public.store_settings;

create policy "admin store settings insert" on public.store_settings
for insert to authenticated
with check (public.is_admin_with_mfa());

create policy "admin store settings update" on public.store_settings
for update to authenticated
using (public.is_admin_with_mfa())
with check (public.is_admin_with_mfa());

create policy "admin store settings delete" on public.store_settings
for delete to authenticated
using (public.is_admin_with_mfa());

drop policy if exists "customers read own or admin" on public.customers;
drop policy if exists "customers update own or admin" on public.customers;
drop policy if exists "admin customers delete" on public.customers;

create policy "customers read own or admin" on public.customers
for select to authenticated
using (
  (data->>'email') = (select auth.email())
  or public.is_admin_with_mfa()
);

create policy "customers update own or admin" on public.customers
for update to authenticated
using (
  (data->>'email') = (select auth.email())
  or public.is_admin_with_mfa()
)
with check (
  (data->>'email') = (select auth.email())
  or public.is_admin_with_mfa()
);

create policy "admin customers delete" on public.customers
for delete to authenticated
using (public.is_admin_with_mfa());

drop policy if exists "orders read own or admin" on public.orders;
drop policy if exists "admin orders update" on public.orders;
drop policy if exists "admin orders delete" on public.orders;

create policy "orders read own or admin" on public.orders
for select to authenticated
using (
  (data->>'userEmail') = (select auth.email())
  or public.is_admin_with_mfa()
);

create policy "admin orders update" on public.orders
for update to authenticated
using (public.is_admin_with_mfa())
with check (public.is_admin_with_mfa());

create policy "admin orders delete" on public.orders
for delete to authenticated
using (public.is_admin_with_mfa());
