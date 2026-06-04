create extension if not exists pgcrypto with schema extensions;

create table if not exists public.admin_invite_codes (
  code_hash text primary key,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('admin')),
  invite_code_hash text not null references public.admin_invite_codes(code_hash),
  created_at timestamptz not null default now()
);

-- Seed the initial invite code manually via Supabase dashboard or a
-- one-time CLI command. Never commit plaintext secrets to source control.

alter table public.admin_invite_codes enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "admin invites hidden" on public.admin_invite_codes;
create policy "admin invites hidden" on public.admin_invite_codes
for select to anon, authenticated
using (false);

drop policy if exists "admin users read own or admin" on public.admin_users;
create policy "admin users read own or admin" on public.admin_users
for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.admin_users admin_check
    where admin_check.user_id = auth.uid()
  )
);

drop policy if exists "claim admin with invite" on public.admin_users;
create policy "claim admin with invite" on public.admin_users
for insert to authenticated
with check (
  user_id = auth.uid()
  and email = auth.email()
  and exists (
    select 1
    from public.admin_invite_codes invite
    where invite.code_hash = invite_code_hash
      and invite.is_active
  )
);

drop policy if exists "public products insert" on public.products;
drop policy if exists "public products update" on public.products;
drop policy if exists "public products delete" on public.products;
create policy "admin products insert" on public.products
for insert to authenticated
with check (exists (select 1 from public.admin_users where user_id = auth.uid()));
create policy "admin products update" on public.products
for update to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()))
with check (exists (select 1 from public.admin_users where user_id = auth.uid()));
create policy "admin products delete" on public.products
for delete to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "public coupons insert" on public.coupons;
drop policy if exists "public coupons update" on public.coupons;
drop policy if exists "public coupons delete" on public.coupons;
create policy "admin coupons insert" on public.coupons
for insert to authenticated
with check (exists (select 1 from public.admin_users where user_id = auth.uid()));
create policy "admin coupons update" on public.coupons
for update to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()))
with check (exists (select 1 from public.admin_users where user_id = auth.uid()));
create policy "admin coupons delete" on public.coupons
for delete to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "public store settings insert" on public.store_settings;
drop policy if exists "public store settings update" on public.store_settings;
drop policy if exists "public store settings delete" on public.store_settings;
create policy "admin store settings insert" on public.store_settings
for insert to authenticated
with check (exists (select 1 from public.admin_users where user_id = auth.uid()));
create policy "admin store settings update" on public.store_settings
for update to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()))
with check (exists (select 1 from public.admin_users where user_id = auth.uid()));
create policy "admin store settings delete" on public.store_settings
for delete to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "public customers read" on public.customers;
drop policy if exists "public customers insert" on public.customers;
drop policy if exists "public customers update" on public.customers;
drop policy if exists "public customers delete" on public.customers;
create policy "customers read own or admin" on public.customers
for select to authenticated
using (
  (data->>'email') = auth.email()
  or exists (select 1 from public.admin_users where user_id = auth.uid())
);
create policy "customers insert own" on public.customers
for insert to authenticated
with check ((data->>'email') = auth.email());
create policy "customers update own or admin" on public.customers
for update to authenticated
using (
  (data->>'email') = auth.email()
  or exists (select 1 from public.admin_users where user_id = auth.uid())
)
with check (
  (data->>'email') = auth.email()
  or exists (select 1 from public.admin_users where user_id = auth.uid())
);
create policy "admin customers delete" on public.customers
for delete to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "public orders read" on public.orders;
drop policy if exists "public orders insert" on public.orders;
drop policy if exists "public orders update" on public.orders;
drop policy if exists "public orders delete" on public.orders;
create policy "orders read own or admin" on public.orders
for select to authenticated
using (
  (data->>'userEmail') = auth.email()
  or exists (select 1 from public.admin_users where user_id = auth.uid())
);
create policy "orders insert own" on public.orders
for insert to authenticated
with check ((data->>'userEmail') = auth.email());
create policy "admin orders update" on public.orders
for update to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()))
with check (exists (select 1 from public.admin_users where user_id = auth.uid()));
create policy "admin orders delete" on public.orders
for delete to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()));

grant select on public.admin_invite_codes to authenticated;
grant select, insert on public.admin_users to authenticated;
