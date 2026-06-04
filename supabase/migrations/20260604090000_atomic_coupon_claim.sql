create or replace function public.claim_coupon(
  coupon_code text,
  required_min_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_coupon_id text;
  v_coupon jsonb;
  v_count integer;
  v_limit integer;
  v_min numeric;
  v_now timestamptz := now();
  v_starts timestamptz;
  v_ends timestamptz;
  v_discount numeric;
begin
  select id, data
  into v_coupon_id, v_coupon
  from public.coupons
  where id = coupon_code
    or upper(data->>'code') = upper(coupon_code)
  order by case when id = coupon_code then 0 else 1 end
  limit 1
  for update;

  if v_coupon is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if not coalesce((v_coupon->>'isActive')::boolean, false) then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
  end if;

  v_starts := case
    when nullif(v_coupon->>'startDate', '') is not null then (v_coupon->>'startDate')::timestamptz
    else '-infinity'::timestamptz
  end;
  v_ends := case
    when nullif(v_coupon->>'endDate', '') is not null then (v_coupon->>'endDate')::timestamptz
    else 'infinity'::timestamptz
  end;

  if v_now < v_starts or v_now > v_ends then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  v_min := coalesce((v_coupon->>'minOrderAmount')::numeric, 0);
  if required_min_amount < v_min then
    return jsonb_build_object('ok', false, 'reason', 'below_minimum');
  end if;

  v_limit := case
    when nullif(v_coupon->>'usageLimit', '') is not null then (v_coupon->>'usageLimit')::integer
    else null
  end;
  v_count := coalesce((v_coupon->>'usageCount')::integer, 0);

  if v_limit is not null and v_count >= v_limit then
    return jsonb_build_object('ok', false, 'reason', 'limit_reached');
  end if;

  v_discount := least(100, greatest(0, coalesce((v_coupon->>'discountPercentage')::numeric, 0)));

  if v_discount <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_discount');
  end if;

  update public.coupons
  set data = jsonb_set(data, '{usageCount}', to_jsonb(v_count + 1), true)
  where id = v_coupon_id;

  return jsonb_build_object(
    'ok', true,
    'couponId', v_coupon_id,
    'discountPercentage', v_discount
  );
end;
$$;

create or replace function public.release_coupon_claim(coupon_code text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_coupon_id text;
  v_count integer;
begin
  select id, greatest(0, coalesce((data->>'usageCount')::integer, 0))
  into v_coupon_id, v_count
  from public.coupons
  where id = coupon_code
    or upper(data->>'code') = upper(coupon_code)
  order by case when id = coupon_code then 0 else 1 end
  limit 1
  for update;

  if v_coupon_id is not null then
    update public.coupons
    set data = jsonb_set(data, '{usageCount}', to_jsonb(greatest(0, v_count - 1)), true)
    where id = v_coupon_id;
  end if;
end;
$$;

revoke all on function public.claim_coupon(text, numeric) from public, anon, authenticated;
revoke all on function public.release_coupon_claim(text) from public, anon, authenticated;
grant execute on function public.claim_coupon(text, numeric) to service_role;
grant execute on function public.release_coupon_claim(text) to service_role;
