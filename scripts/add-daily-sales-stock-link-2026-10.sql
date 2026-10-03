-- Links each Daily Sales row to the exact stock_variants row (by matching
-- sku to its code) it deducted from, and how much, so future edits/deletes
-- can accurately restore the old amount before applying the new one instead
-- of re-guessing from the (possibly since-changed) sku text.
-- Run in Supabase SQL editor.

alter table daily_sales_rows add column if not exists stock_variant_id integer references stock_variants(id) on delete set null;
alter table daily_sales_rows add column if not exists stock_deducted_qty numeric not null default 0;
