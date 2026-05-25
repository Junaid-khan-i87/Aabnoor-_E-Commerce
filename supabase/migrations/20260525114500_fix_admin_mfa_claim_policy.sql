drop policy if exists "claim admin with mfa email" on public.admin_users;
create policy "claim admin with mfa email" on public.admin_users
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and email = 'junaidmushtaq988@gmail.com'
  and (select auth.email()) = 'junaidmushtaq988@gmail.com'
  and role = 'admin'
  and (select auth.jwt())->>'aal' = 'aal2'
);
