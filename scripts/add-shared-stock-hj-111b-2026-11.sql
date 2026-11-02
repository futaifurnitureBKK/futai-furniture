-- HJ-111B: "มีหมอนรองคอ" (with headrest) and "ไม่มีหมอน" (without) are the
-- same physical chair, not separate batches, so pull them from one shared
-- stock pool (same pattern as YN-01-4/DZ2404/QC-A2401/YN-05) — but unlike
-- those, there's no width/size scaling here, so unit_factor = 1 for both
-- variants: selling either one consumes the same shared count 1-for-1, and
-- both will show the same "พร้อมขาย" number afterward.
-- Verify the combined total (159 + 0 = 159, from current live data) looks
-- right to you BEFORE committing — this merges two stock lines into one.
-- Run in Supabase SQL editor.

begin;

-- 1. unit_factor = 1 on every variant (incl. archived) of this product.
update stock_variants v
set unit_factor = 1
from stock_products p
where v.product_id = p.id and p.code = 'HJ-111B';

-- 2. Sum non-archived available/reserved/defective (unit_factor=1, so this
--    is just the sum of pieces) onto the product, flip shared_stock on.
with totals as (
  select
    p.id as product_id,
    coalesce(sum(v.available) filter (where not v.archived), 0) as avail_modules,
    coalesce(sum(v.reserved) filter (where not v.archived), 0) as reserved_modules,
    coalesce(sum(v.defective) filter (where not v.archived), 0) as defective_modules
  from stock_products p
  join stock_variants v on v.product_id = p.id
  where p.code = 'HJ-111B'
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

-- 3. Re-sync every variant's cached available/reserved/defective (incl.
--    archived) to the shared pool — both show the same number now.
update stock_variants v
set
  available = p.shared_available_modules / v.unit_factor,
  reserved = p.shared_reserved_modules / v.unit_factor,
  defective = p.shared_defective_modules / v.unit_factor
from stock_products p
where v.product_id = p.id and p.code = 'HJ-111B';

-- Review the result below, then run `commit;` separately to finalize
-- (or `rollback;` to undo) if your SQL editor doesn't auto-commit this block.
select p.code, p.shared_stock, p.shared_available_modules, p.shared_reserved_modules, p.shared_defective_modules,
       v.size_text, v.unit_factor, v.available, v.reserved, v.defective, v.archived
from stock_products p
join stock_variants v on v.product_id = p.id
where p.code = 'HJ-111B'
order by v.archived, v.size_text;

commit;
