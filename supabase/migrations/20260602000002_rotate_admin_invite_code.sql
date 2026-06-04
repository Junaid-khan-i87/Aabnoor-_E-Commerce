/*
  The legacy admin invite-code flow has been retired. Admin access now requires
  the configured admin email, an admin_users row, and Supabase MFA assurance.
*/

do $$
begin
  if to_regclass('public.admin_invite_codes') is not null then
    update public.admin_invite_codes
    set is_active = false;
  end if;
end;
$$;
