-- adjust_shared_stock_modules was declared with p_product_id integer, but
-- stock_products.id is bigint (Postgres won't implicitly cast bigint ->
-- integer), so every call to this function failed with "function does not
-- exist". Drop the old integer-typed overload and recreate it with the
-- correct bigint parameter.
-- Run in Supabase SQL editor.

drop function if exists adjust_shared_stock_modules(integer, text, integer);

create or replace function adjust_shared_stock_modules(p_product_id bigint, p_field text, p_module_delta integer)
returns jsonb
language plpgsql
as $$
declare
  modules_col text;
  new_modules integer;
  v record;
  new_value integer;
begin
  if p_field not in ('available', 'reserved', 'defective') then
    raise exception 'invalid_field';
  end if;
  modules_col := 'shared_' || p_field || '_modules';

  execute format(
    'update stock_products set %I = %I + $1 where id = $2 and %I + $1 >= 0 returning %I',
    modules_col, modules_col, modules_col, modules_col
  ) into new_modules using p_module_delta, p_product_id;

  if new_modules is null then
    raise exception 'insufficient_stock';
  end if;

  for v in
    select id, unit_factor, available, reserved, defective
    from stock_variants
    where product_id = p_product_id
  loop
    new_value := new_modules / v.unit_factor;
    if p_field = 'available' and v.available <> new_value then
      insert into stock_movements (variant_id, field, old_value, new_value) values (v.id, 'available', v.available, new_value);
      update stock_variants set available = new_value where id = v.id;
    elsif p_field = 'reserved' and v.reserved <> new_value then
      insert into stock_movements (variant_id, field, old_value, new_value) values (v.id, 'reserved', v.reserved, new_value);
      update stock_variants set reserved = new_value where id = v.id;
    elsif p_field = 'defective' and v.defective <> new_value then
      insert into stock_movements (variant_id, field, old_value, new_value) values (v.id, 'defective', v.defective, new_value);
      update stock_variants set defective = new_value where id = v.id;
    end if;
  end loop;

  return jsonb_build_object('product_id', p_product_id, 'field', p_field, 'modules', new_modules);
end;
$$;
