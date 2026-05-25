drop policy if exists "admin users read own or admin" on public.admin_users;
create policy "admin users read own" on public.admin_users
for select to authenticated
using (user_id = auth.uid());
