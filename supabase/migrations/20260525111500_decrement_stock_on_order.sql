create schema if not exists private;

create or replace function private.decrement_product_stock_for_order()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  item_product_id text;
  item_quantity integer;
begin
  for item in select * from jsonb_array_elements(coalesce(new.data->'items', '[]'::jsonb))
  loop
    item_product_id := item->>'productId';
    item_quantity := greatest(0, coalesce((item->>'quantity')::integer, 0));

    if item_product_id is not null and item_quantity > 0 then
      update public.products
      set data = jsonb_set(
        data,
        '{stock}',
        to_jsonb(greatest(0, coalesce((data->>'stock')::integer, 0) - item_quantity)),
        true
      )
      where id = item_product_id
         or item_product_id like id || '-%';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists decrement_product_stock_after_order_insert on public.orders;
create trigger decrement_product_stock_after_order_insert
after insert on public.orders
for each row execute function private.decrement_product_stock_for_order();
