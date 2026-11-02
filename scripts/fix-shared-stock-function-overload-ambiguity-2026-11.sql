-- Every shared-stock deduction (YN-01-4, DZ2404, QC-A2401, YN-05, ...) has
-- been failing with:
--   "Could not choose the best candidate function between:
--    adjust_shared_stock_modules(p_product_id, p_field, p_module_delta),
--    adjust_shared_stock_modules(p_product_id, p_field, p_module_delta, p_note),
--    adjust_shared_stock_modules(p_product_id, p_field, p_module_delta, p_note, p_actor)"
-- Three overloads of the same function exist in the database (the 4- and
-- 5-arg ones were added by hand at some point, outside any committed
-- script, presumably to let StockDEMO pass a note/actor) and Postgres can't
-- pick one for a 3-arg call since the extra params all have defaults.
-- This was never a real "insufficient stock" problem — it broke 100% of
-- shared-stock deductions site-wide.
--
-- Fix: drop all three overloads and recreate ONE function that accepts the
-- optional p_note/p_actor (so existing callers that pass them still work)
-- but is otherwise identical to the working 3-arg body — stock_movements
-- has no note/actor columns yet, so they're accepted and ignored, exactly
-- like the 3-arg version always behaved.
-- Run in Supabase SQL editor.

begin;

drop function if exists adjust_shared_stock_modules(bigint, text, integer);
drop function if exists adjust_shared_stock_modules(bigint, text, integer, text);
drop function if exists adjust_shared_stock_modules(bigint, text, integer, text, text);

create function adjust_shared_stock_modules(
  p_product_id bigint,
  p_field text,
  p_module_delta integer,
  p_note text default null,
  p_actor text default null
)
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
    new_value := new_modules / v.unit_factor; -- integer division = floor for non-negative values
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

-- Sanity check: exactly one function named adjust_shared_stock_modules should exist now.
select proname, pg_get_function_identity_arguments(oid) as args
from pg_proc
where proname = 'adjust_shared_stock_modules';

commit;
