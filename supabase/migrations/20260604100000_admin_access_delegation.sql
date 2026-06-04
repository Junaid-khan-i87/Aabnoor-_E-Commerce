alter table public.admin_allowed_emails
add column if not exists role text not null default 'admin',
add column if not exists status text not null default 'active',
add column if not exists invited_by uuid,
add column if not exists invited_at timestamptz,
add column if not exists revoked_by uuid,
add column if not exists revoked_at timestamptz,
add column if not exists last_login_at timestamptz,
add column if not exists updated_at timestamptz not null default now(),
add column if not exists note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'admin_allowed_emails_role_check'
      and conrelid = 'public.admin_allowed_emails'::regclass
  ) then
    alter table public.admin_allowed_emails
    add constraint admin_allowed_emails_role_check
    check (role in ('super_admin', 'admin'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'admin_allowed_emails_status_check'
      and conrelid = 'public.admin_allowed_emails'::regclass
  ) then
    alter table public.admin_allowed_emails
    add constraint admin_allowed_emails_status_check
    check (status in ('active', 'revoked'));
  end if;
end;
$$;

update public.admin_allowed_emails
set status = coalesce(nullif(status, ''), 'active'),
    role = coalesce(nullif(role, ''), 'admin'),
    updated_at = coalesce(updated_at, now());

insert into public.admin_allowed_emails (email, role, status, invited_at, updated_at)
select lower(email), 'admin', 'active', created_at, now()
from public.admin_users
where email is not null
on conflict (email) do update
set status = 'active',
    updated_at = now();

create index if not exists admin_allowed_emails_status_idx
on public.admin_allowed_emails (status);

create index if not exists admin_users_email_idx
on public.admin_users (email);

drop policy if exists "claim admin with mfa email" on public.admin_users;
create policy "claim admin with mfa email" on public.admin_users
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and email = (select auth.email())
  and role = 'admin'
  and (select auth.jwt())->>'aal' = 'aal2'
  and exists (
    select 1
    from public.admin_allowed_emails allowed
    where lower(allowed.email) = lower((select auth.email()))
      and allowed.status = 'active'
  )
);

create schema if not exists private;

create or replace function private.is_admin_with_mfa()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    exists (
      select 1
      from public.admin_users admin_user
      join public.admin_allowed_emails allowed
        on lower(allowed.email) = lower(admin_user.email)
      where admin_user.user_id = auth.uid()
        and allowed.status = 'active'
    )
    and (auth.jwt())->>'aal' = 'aal2';
$$;

revoke all on function private.is_admin_with_mfa() from public, anon;
grant execute on function private.is_admin_with_mfa() to authenticated, service_role;
