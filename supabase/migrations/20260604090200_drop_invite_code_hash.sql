do $$
begin
  drop policy if exists "claim admin with invite" on public.admin_users;

  if to_regclass('public.admin_invite_codes') is not null then
    delete from public.admin_invite_codes
    where label = 'initial admin invite';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_users'
      and column_name = 'invite_code_hash'
  ) then
    alter table public.admin_users
    alter column invite_code_hash drop not null;

    alter table public.admin_users
    drop column if exists invite_code_hash;
  end if;
end;
$$;

drop table if exists public.admin_invite_codes;
