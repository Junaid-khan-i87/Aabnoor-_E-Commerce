alter table public.signup_otps
  add column if not exists request_ip_hash text;

create index if not exists signup_otps_ip_created_idx
  on public.signup_otps (request_ip_hash, created_at desc)
  where request_ip_hash is not null;
