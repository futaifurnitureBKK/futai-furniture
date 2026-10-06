-- "Shared stock" — a handful of models (YN-01-4, QC-A2401, YN-05) sell in
-- several widths that all draw from ONE physical pool instead of each
-- having its own independent count. The pool is tracked in whole "modules"
-- (a module = one 2-seat unit) so nothing here ever needs a fraction:
-- 1200mm = 1 module (0.5 of a 4-seat "set"), 2400mm = 2 modules (1 set),
-- 3600mm = 3 modules (1.5 sets).
-- Run in Supabase SQL editor.

alter table stock_products add column if not exists shared_stock boolean not null default false;
alter table stock_products add column if not exists shared_available_modules integer not null default 0;
alter table stock_products add column if not exists shared_reserved_modules integer not null default 0;
alter table stock_products add column if not exists shared_defective_modules integer not null default 0;

alter table stock_variants add column if not exists unit_factor integer not null default 1;

-- Atomically adjusts one shared-stock product's module pool by p_module_delta
-- (negative = deduct, positive = add back), then recomputes every sibling
-- variant's cached available/reserved/defective as floor(modules / unit_factor)
-- so every screen that already reads stock_variants.* directly (StockDEMO,
-- Quote Builder's picker, Daily Export's picker, Excel exports) keeps
-- working with zero changes — those columns become a synced display cache
-- for shared-stock products instead of an independent number.
-- p_field must be 'available', 'reserved', or 'defective'.
create or replace function adjust_shared_stock_modules(p_product_id integer, p_field text, p_module_delta integer)
returns jsonb
language plpgsql
as $$
declare
  modules_col text;
  new_modules integer;
  v record;
  moves jsonb := '[]'::jsonb;
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
