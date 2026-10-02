-- Lets products be reordered (move up/down) in the StockDEMO list instead of
-- always sitting in creation order. Existing rows keep their current order
-- (backfilled from id) so nothing visibly jumps around after this runs.
-- Run in Supabase SQL editor.

alter table stock_products add column if not exists sort_order integer;
update stock_products set sort_order = id where sort_order is null;
alter table stock_products alter column sort_order set not null;
alter table stock_products alter column sort_order set default 0;
create index if not exists stock_products_sort_order_idx on stock_products(sort_order);
