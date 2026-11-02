-- HJ-111B's "มีหมอนรองคอ" (670*590*1075) variant needs to deduct TWO things
-- when sold: the shared chair pool (already wired up) AND a separate
-- headrest stock item, tracked on its own — while "ไม่มีหมอน" and the
-- stray "常規" row keep touching only the chair pool.
--
-- Introduces a generic "component" link on stock_variants: deducting N of
-- a variant with component_variant_id set also deducts N * component_qty
-- of that component variant, in the same call (see the adjustVariantField
-- change in src/lib/shared-stock.ts that reads these columns — rolls the
-- parent back if the component doesn't have enough).
--
-- Also creates the headrest as its own ordinary stock item (not
-- shared-stock) so it's received/adjusted independently in StockDEMO like
-- any other product, seeded at 22 available / 0 reserved per the current
-- count you gave.
-- Run in Supabase SQL editor.

begin;

-- 1. The link columns (nullable/defaulted — every other variant is unaffected).
alter table stock_variants add column if not exists component_variant_id bigint references stock_variants(id);
alter table stock_variants add column if not exists component_qty integer not null default 1;

-- 2. The headrest product + its one variant, same category as HJ-111B.
with new_product as (
  insert into stock_products (code, category)
  select 'HJ-111B-หมอน', p.category from stock_products p where p.code = 'HJ-111B'
  returning id
), new_variant as (
  insert into stock_variants (product_id, code, size_text, unit_factor, available, reserved, defective, tracked)
  select id, 'HJ-111B-หมอน', 'หมอนรองคอ', 1, 22, 0, 0, true from new_product
  returning id
)
-- 3. Link HJ-111B's "มีหมอน" variant to it, 1 headrest per chair.
update stock_variants v
set component_variant_id = nv.id, component_qty = 1
from stock_products p, new_variant nv
where v.product_id = p.id and p.code = 'HJ-111B' and v.size_text = '670*590*1075';

-- Review: HJ-111B's "มีหมอน" row should show a component_variant_id now;
-- the new "HJ-111B-หมอน" product should show available = 22.
select p.code, v.size_text, v.available, v.reserved, v.component_variant_id, v.component_qty
from stock_products p
join stock_variants v on v.product_id = p.id
where p.code in ('HJ-111B', 'HJ-111B-หมอน')
order by p.code, v.size_text;

commit;
