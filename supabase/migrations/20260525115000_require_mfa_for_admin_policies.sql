drop policy if exists "admin products insert" on public.products;
drop policy if exists "admin products update" on public.products;
drop policy if exists "admin products delete" on public.products;
create policy "admin products insert" on public.products
for insert to authenticated
with check (
  (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "admin products update" on public.products
for update to authenticated
using (
  (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
)
with check (
  (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "admin products delete" on public.products
for delete to authenticated
using (
  (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);

drop policy if exists "admin coupons insert" on public.coupons;
drop policy if exists "admin coupons update" on public.coupons;
drop policy if exists "admin coupons delete" on public.coupons;
create policy "admin coupons insert" on public.coupons
for insert to authenticated
with check (
  (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "admin coupons update" on public.coupons
for update to authenticated
using (
  (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
)
with check (
  (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "admin coupons delete" on public.coupons
for delete to authenticated
using (
  (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);

drop policy if exists "admin store settings insert" on public.store_settings;
drop policy if exists "admin store settings update" on public.store_settings;
drop policy if exists "admin store settings delete" on public.store_settings;
create policy "admin store settings insert" on public.store_settings
for insert to authenticated
with check (
  (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "admin store settings update" on public.store_settings
for update to authenticated
using (
  (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
)
with check (
  (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "admin store settings delete" on public.store_settings
for delete to authenticated
using (
  (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);

drop policy if exists "customers read own or admin" on public.customers;
drop policy if exists "customers update own or admin" on public.customers;
drop policy if exists "admin customers delete" on public.customers;
create policy "customers read own or admin" on public.customers
for select to authenticated
using (
  (data->>'email') = (select auth.email())
  or (
    (select auth.email()) = 'junaidmushtaq988@gmail.com'
    and (select auth.jwt())->>'aal' = 'aal2'
    and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
  )
);
create policy "customers update own or admin" on public.customers
for update to authenticated
using (
  (data->>'email') = (select auth.email())
  or (
    (select auth.email()) = 'junaidmushtaq988@gmail.com'
    and (select auth.jwt())->>'aal' = 'aal2'
    and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
  )
)
with check (
  (data->>'email') = (select auth.email())
  or (
    (select auth.email()) = 'junaidmushtaq988@gmail.com'
    and (select auth.jwt())->>'aal' = 'aal2'
    and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
  )
);
create policy "admin customers delete" on public.customers
for delete to authenticated
using (
  (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);

drop policy if exists "orders read own or admin" on public.orders;
drop policy if exists "admin orders update" on public.orders;
drop policy if exists "admin orders delete" on public.orders;
create policy "orders read own or admin" on public.orders
for select to authenticated
using (
  (data->>'userEmail') = (select auth.email())
  or (
    (select auth.email()) = 'junaidmushtaq988@gmail.com'
    and (select auth.jwt())->>'aal' = 'aal2'
    and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
  )
);
create policy "admin orders update" on public.orders
for update to authenticated
using (
  (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
)
with check (
  (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "admin orders delete" on public.orders
for delete to authenticated
using (
  (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);
