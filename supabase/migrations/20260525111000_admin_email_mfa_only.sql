create table if not exists public.admin_allowed_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

insert into public.admin_allowed_emails (email)
values ('junaidmushtaq988@gmail.com')
on conflict (email) do nothing;

alter table public.admin_allowed_emails enable row level security;

drop policy if exists "admin allowed emails hidden" on public.admin_allowed_emails;
create policy "admin allowed emails hidden" on public.admin_allowed_emails
for select to anon, authenticated
using (false);

alter table public.admin_users
alter column invite_code_hash drop not null;

drop policy if exists "claim admin with invite" on public.admin_users;
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
    where allowed.email = (select auth.email())
  )
);

grant select on public.admin_allowed_emails to authenticated;
