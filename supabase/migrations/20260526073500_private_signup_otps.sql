create table if not exists public.signup_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists signup_otps_email_created_idx
  on public.signup_otps (lower(email), created_at desc);

create index if not exists signup_otps_cleanup_idx
  on public.signup_otps (expires_at, consumed_at);

alter table public.signup_otps enable row level security;

revoke all on public.signup_otps from anon, authenticated;
