-- The previous HJ-111B shared-stock migration set shared_stock/unit_factor
-- correctly but never touched is_shared_reference (a column StockDEMO's UI
-- needs — exactly one variant per shared-stock product must be flagged as
-- the "main counter" row; every other row just displays "-> see that row").
-- With none flagged, every HJ-111B row showed "—" in available/reserved/
-- defective, and the "see X row" label fell back to the hardcoded default
-- ("2400mm/4 ที่นั่ง", left over from YN-01-4) since no reference was found.
-- This sets the "ไม่มีหมอน" variant (price 1500) as the main counter.
-- Run in Supabase SQL editor.

begin;

update stock_variants v
set is_shared_reference = false
from stock_products p
where v.product_id = p.id and p.code = 'HJ-111B';

-- Matched on size_text (confirmed exact from your last query result) rather
-- than price alone, in case the "常規" row happens to share the same price.
update stock_variants v
set is_shared_reference = true
from stock_products p
where v.product_id = p.id and p.code = 'HJ-111B' and v.size_text = '545*590*885';

-- Review: exactly one row below should have is_shared_reference = true.
select p.code, v.size_text, v.price, v.is_shared_reference, v.available, v.reserved
from stock_products p
join stock_variants v on v.product_id = p.id
where p.code = 'HJ-111B'
order by v.is_shared_reference desc, v.size_text;

commit;
