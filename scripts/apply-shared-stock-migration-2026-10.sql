-- Applies the real shared-stock migration for YN-01-4, QC-A2401, YN-05.
-- Verified before/after (from live data, 2026-10-06):
--   QC-A2401: available 8.5 -> 8.5 sets (17 modules), reserved 4 -> 4 sets (8 modules)
--   YN-01-4:  available 6   -> 6 sets   (12 modules), reserved 1 -> 1 set  (2 modules)
--   YN-05:    available 4.5 -> 4.5 sets (9 modules),  reserved 0 -> 0
-- All match the reference figures given for this migration. Archived variants
-- are excluded from the totals but still get unit_factor set and their
-- available/reserved/defective cache re-synced so nothing stale is left behind.
-- Wrapped in a transaction: if anything looks wrong, run "rollback;" instead
-- of "commit;" at the end, or just don't run the last line.

begin;

-- 1. unit_factor on every variant (incl. archived) of these 3 products, from width.
update stock_variants v
set unit_factor = case
  when w.width between 1150 and 1250 then 1
  when w.width between 2350 and 2450 then 2
  when w.width between 3550 and 3650 then 3
end
from (
  select v2.id, nullif(regexp_replace(split_part(v2.size_text, '*', 1), '[^0-9.]', '', 'g'), '')::numeric as width
  from stock_variants v2
  join stock_products p2 on p2.id = v2.product_id
  where p2.code in ('YN-01-4', 'QC-A2401', 'YN-05')
) w
where v.id = w.id and w.width is not null;

-- 2. Sum non-archived available/reserved/defective x unit_factor -> modules,
--    write onto the product, flip shared_stock on.
with totals as (
  select
    p.id as product_id,
    coalesce(sum(v.available * v.unit_factor) filter (where not v.archived), 0) as avail_modules,
    coalesce(sum(v.reserved * v.unit_factor) filter (where not v.archived), 0) as reserved_modules,
    coalesce(sum(v.defective * v.unit_factor) filter (where not v.archived), 0) as defective_modules
  from stock_products p
  join stock_variants v on v.product_id = p.id
  where p.code in ('YN-01-4', 'QC-A2401', 'YN-05')
  group by p.id
)
update stock_products p
set
  shared_stock = true,
  shared_available_modules = round(t.avail_modules)::integer,
  shared_reserved_modules = round(t.reserved_modules)::integer,
  shared_defective_modules = round(t.defective_modules)::integer
from totals t
where p.id = t.product_id;

-- 3. Re-sync every variant's cached available/reserved/defective (incl. archived)
--    to floor(modules / unit_factor), matching what adjust_shared_stock_modules
--    computes, so the cache starts correct everywhere (fixes the stale archived row too).
update stock_variants v
set
  available = p.shared_available_modules / v.unit_factor,
  reserved = p.shared_reserved_modules / v.unit_factor,
  defective = p.shared_defective_modules / v.unit_factor
from stock_products p
where v.product_id = p.id
  and p.code in ('YN-01-4', 'QC-A2401', 'YN-05');

-- Review the result below, then run `commit;` separately to finalize
-- (or `rollback;` to undo) if your SQL editor doesn't auto-commit this block.
select p.code, p.shared_stock, p.shared_available_modules, p.shared_reserved_modules, p.shared_defective_modules,
       v.size_text, v.unit_factor, v.available, v.reserved, v.defective, v.archived
from stock_products p
join stock_variants v on v.product_id = p.id
where p.code in ('YN-01-4', 'QC-A2401', 'YN-05')
order by p.code, v.archived, v.size_text;

commit;
