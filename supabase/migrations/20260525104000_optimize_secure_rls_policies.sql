create index if not exists admin_users_invite_code_hash_idx
on public.admin_users (invite_code_hash);

drop policy if exists "admin users read own" on public.admin_users;
drop policy if exists "claim admin with invite" on public.admin_users;
create policy "admin users read own" on public.admin_users
for select to authenticated
using (user_id = (select auth.uid()));
create policy "claim admin with invite" on public.admin_users
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and email = (select auth.email())
  and exists (
    select 1
    from public.admin_invite_codes invite
    where invite.code_hash = invite_code_hash
      and invite.is_active
  )
);

drop policy if exists "admin products insert" on public.products;
drop policy if exists "admin products update" on public.products;
drop policy if exists "admin products delete" on public.products;
create policy "admin products insert" on public.products
for insert to authenticated
with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "admin products update" on public.products
for update to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "admin products delete" on public.products
for delete to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

drop policy if exists "admin coupons insert" on public.coupons;
drop policy if exists "admin coupons update" on public.coupons;
drop policy if exists "admin coupons delete" on public.coupons;
create policy "admin coupons insert" on public.coupons
for insert to authenticated
with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "admin coupons update" on public.coupons
for update to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "admin coupons delete" on public.coupons
for delete to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

drop policy if exists "admin store settings insert" on public.store_settings;
drop policy if exists "admin store settings update" on public.store_settings;
drop policy if exists "admin store settings delete" on public.store_settings;
create policy "admin store settings insert" on public.store_settings
for insert to authenticated
with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "admin store settings update" on public.store_settings
for update to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "admin store settings delete" on public.store_settings
for delete to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

drop policy if exists "customers read own or admin" on public.customers;
drop policy if exists "customers insert own" on public.customers;
drop policy if exists "customers update own or admin" on public.customers;
drop policy if exists "admin customers delete" on public.customers;
create policy "customers read own or admin" on public.customers
for select to authenticated
using (
  (data->>'email') = (select auth.email())
  or exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "customers insert own" on public.customers
for insert to authenticated
with check ((data->>'email') = (select auth.email()));
create policy "customers update own or admin" on public.customers
for update to authenticated
using (
  (data->>'email') = (select auth.email())
  or exists (select 1 from public.admin_users where user_id = (select auth.uid()))
)
with check (
  (data->>'email') = (select auth.email())
  or exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "admin customers delete" on public.customers
for delete to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

drop policy if exists "orders read own or admin" on public.orders;
drop policy if exists "orders insert own" on public.orders;
drop policy if exists "admin orders update" on public.orders;
drop policy if exists "admin orders delete" on public.orders;
create policy "orders read own or admin" on public.orders
for select to authenticated
using (
  (data->>'userEmail') = (select auth.email())
  or exists (select 1 from public.admin_users where user_id = (select auth.uid()))
);
create policy "orders insert own" on public.orders
for insert to authenticated
with check ((data->>'userEmail') = (select auth.email()));
create policy "admin orders update" on public.orders
for update to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())))
with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "admin orders delete" on public.orders
for delete to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
