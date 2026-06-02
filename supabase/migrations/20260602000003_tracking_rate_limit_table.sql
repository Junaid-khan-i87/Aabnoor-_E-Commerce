create table if not exists public.tracking_rate_limits (
  ip_hash text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);

alter table public.tracking_rate_limits enable row level security;

drop policy if exists "no public access" on public.tracking_rate_limits;
create policy "no public access" on public.tracking_rate_limits
for all to anon, authenticated
using (false);

revoke all on public.tracking_rate_limits from anon, authenticated;

create or replace function public.check_tracking_rate_limit(target_ip_hash text)
returns table(count integer)
language sql
security definer
set search_path = public
as $$
  insert into public.tracking_rate_limits as limits (ip_hash, count, window_start)
  values (target_ip_hash, 1, now())
  on conflict (ip_hash) do update
  set
    count = case
      when now() - limits.window_start > interval '60 seconds' then 1
      else limits.count + 1
    end,
    window_start = case
      when now() - limits.window_start > interval '60 seconds' then now()
      else limits.window_start
    end
  returning limits.count;
$$;

revoke all on function public.check_tracking_rate_limit(text) from public, anon, authenticated;
grant execute on function public.check_tracking_rate_limit(text) to service_role;
