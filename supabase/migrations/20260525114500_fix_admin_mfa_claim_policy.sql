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
