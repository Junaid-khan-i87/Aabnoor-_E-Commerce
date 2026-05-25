alter table public.admin_users drop column if exists invite_code_hash;
drop table if exists public.admin_invite_codes;
