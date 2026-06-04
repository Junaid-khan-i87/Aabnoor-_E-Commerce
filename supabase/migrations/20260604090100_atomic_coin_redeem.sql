create or replace function public.redeem_and_credit_coins(
  p_customer_id text,
  p_coins_to_spend integer,
  p_coins_earned integer,
  p_customer_patch jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current integer;
  v_new integer;
begin
  insert into public.customers (id, data)
  values (
    p_customer_id,
    coalesce(p_customer_patch, '{}'::jsonb) || jsonb_build_object('id', p_customer_id, 'coins', 0)
  )
  on conflict (id) do nothing;

  select greatest(0, floor(coalesce((data->>'coins')::numeric, 0)))::integer
  into v_current
  from public.customers
  where id = p_customer_id
  for update;

  if v_current is null then
    return jsonb_build_object('ok', false, 'reason', 'customer_not_found');
  end if;

  if p_coins_to_spend < 0 or p_coins_earned < 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_coin_amount');
  end if;

  if p_coins_to_spend > v_current then
    return jsonb_build_object(
      'ok', false,
      'reason', 'insufficient_coins',
      'available', v_current
    );
  end if;

  v_new := v_current - p_coins_to_spend + p_coins_earned;

  update public.customers
  set data = data || coalesce(p_customer_patch, '{}'::jsonb) || jsonb_build_object('coins', v_new)
  where id = p_customer_id;

  return jsonb_build_object('ok', true, 'new_balance', v_new);
end;
$$;

revoke all on function public.redeem_and_credit_coins(text, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.redeem_and_credit_coins(text, integer, integer, jsonb) to service_role;
