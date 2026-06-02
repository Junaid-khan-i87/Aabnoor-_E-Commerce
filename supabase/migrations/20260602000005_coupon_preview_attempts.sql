create table if not exists public.coupon_preview_attempts (
  id text primary key,
  auth_user_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists coupon_preview_attempts_auth_user_created_idx
on public.coupon_preview_attempts (auth_user_id, created_at desc);

alter table public.coupon_preview_attempts enable row level security;

drop policy if exists "no public access" on public.coupon_preview_attempts;
create policy "no public access" on public.coupon_preview_attempts
for all to anon, authenticated
using (false);

revoke all on public.coupon_preview_attempts from anon, authenticated;
